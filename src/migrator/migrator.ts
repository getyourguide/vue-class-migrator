import path from "path";
import {
  Project,
  ClassDeclaration,
  SyntaxKind,
  ObjectLiteralExpression,
  SourceFile,
} from "ts-morph";
import { logger } from "./logger";
import { getDefineComponentInit } from "./migrate-component-decorator";
import migrateImports from "./migrate-imports";
import migrateProps from "./migrate-props";
import migratePropSync from "./migrate-prop-sync";
import migrateData from "./migrate-data";
import migrateMethods from "./migrate-methods";
import migrateGetters from "./migrate-getters";
import migrateWatchers from "./migrate-watchers";
import migrateExtends from "./migrate-extends";
import { getScriptContent, injectScript, vueFileToSFC } from "./migrator-to-sfc";
import migrateSetters from "./migrate-setters";
import migrateModels from "./migrate-model";
import migrateRefs from "./migrate-refs";

export interface MigratePartProps {
  clazz: ClassDeclaration;
  mainObject: ObjectLiteralExpression;
  outFile: SourceFile;
  sourceFile: SourceFile;
}

export const specialMethods = [
  "beforeCreate",
  "created",
  "beforeMount",
  "mounted",
  "beforeUpdate",
  "updated",
  "beforeUnmount",
  "unmounted",
  "errorCaptured",
  "renderTracked",
  "renderTriggered",
  "activated",
  "deactivated",
  "serverPrefetch",
  "destroyed"
]; // Vue methods that won't be included under methods: {...}, they go to the root.
export const supportedDecorators = ["Prop", "PropSync", "Getter", "Action", "Ref", "Model", "Watch"]; // Class Property decorators

const migrateTsFile = async (project: Project, sourceFile: SourceFile) => {
  const filePath = sourceFile.getFilePath();
  const { name, ext } = path.parse(path.basename(filePath));
  const outPath = path.join(path.dirname(filePath), `${name}_migrated${ext}`);
  const outFile = project.createSourceFile(outPath, sourceFile.getText(), { overwrite: true });

  try {
    // Do not modify this class.
    const sourceFileClass = sourceFile
      .getClasses()
      .filter((clazz) => clazz.getDecorator("Component"))
      .pop();
    const outClazz = outFile
      .getClasses()
      .filter((clazz) => clazz.getDecorator("Component"))
      .pop();

    if (!sourceFileClass || !outClazz) {
      throw new Error("Class implementing the @Component decorator not found.");
    }

    // Validation
    sourceFileClass
      .getProperties()
      .flatMap((prop) => prop.getDecorators())
      .forEach((decorator) => {
        if (!supportedDecorators.includes(decorator.getName())) {
          throw new Error(`Decorator @${decorator.getName()} not supported`);
        }
      });

    const defineComponentInitObject = getDefineComponentInit(sourceFileClass);
    let clazzReplacement: string;
    if (!outClazz.getDefaultKeyword()) {
      // Non default exported class
      clazzReplacement = [
        outClazz?.getExportKeyword()?.getText(),
        `const ${outClazz.getName()} =`,
        `defineComponent(${defineComponentInitObject})`,
      ]
        .filter((s) => s)
        .join(" ");
    } else {
      clazzReplacement = [
        outClazz?.getExportKeyword()?.getText(),
        outClazz?.getDefaultKeywordOrThrow()?.getText(),
        `defineComponent(${defineComponentInitObject})`,
      ]
        .filter((s) => s)
        .join(" ");
    }

    // Main structure
    const mainObject = outClazz
      .replaceWithText(clazzReplacement)
      .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);

    if (!mainObject) {
      throw new Error("Unable to create defineComponent");
    }

    migrateImports(outFile);

    const migratePartProps: MigratePartProps = {
      clazz: sourceFileClass,
      mainObject,
      outFile,
      sourceFile,
    };

    // Class Extends
    migrateExtends(migratePartProps);

    // @Model
    migrateModels(migratePartProps);

    // Props Property
    migrateProps(migratePartProps);

    // @PropSync
    migratePropSync(migratePartProps);

    // Data Property
    migrateData(migratePartProps);

    // Computed Property (includes vuex getters)
    migrateGetters(migratePartProps);
    migrateSetters(migratePartProps);

    // Watchers
    migrateWatchers(migratePartProps);

    // Methods property (includes Vuex @Action)
    // TODO Watch out, sometimes methods are actually computed properties
    migrateMethods(migratePartProps);

    // @Ref
    migrateRefs(migratePartProps);

  } catch (error) {
    await outFile.deleteImmediately();
    throw error;
  }
  return await outFile.moveImmediately(sourceFile.getFilePath(), { overwrite: true });
};

const migrateVueFile = async (project: Project, vueSourceFile: SourceFile) => {
  const scriptContent = getScriptContent(vueSourceFile);
  if (!scriptContent) {
    throw new Error("Unable to extract script tag content");
  }
  const filePath = vueSourceFile.getFilePath();
  const { name } = path.parse(path.basename(filePath));
  const outPath = path.join(path.dirname(filePath), `${name}_temp_migrated.ts`);
  let outFile = project.createSourceFile(outPath, scriptContent, { overwrite: true });

  try {
    outFile = await migrateTsFile(project, outFile);
    const vueFileText = vueSourceFile.getText();
    vueSourceFile.removeText();
    vueSourceFile.insertText(0, injectScript(outFile, vueFileText));

    await vueSourceFile.save();
    return vueSourceFile;
  } finally {
    await outFile.deleteImmediately();
  }
};

export const migrateFile = async (project: Project, sourceFile: SourceFile) => {
  logger.info(`Migrating ${sourceFile.getBaseName()}`);
  if (!sourceFile.getText().includes("@Component")) {
    throw new Error("File already migrated");
  }

  const ext = sourceFile.getExtension();

  if (ext === ".ts") {
    return await migrateTsFile(project, sourceFile);
  }

  if (ext === ".vue") {
    return await migrateVueFile(project, sourceFile);
  }

  throw new Error(`Extension ${ext} not supported`);
};

export const migrateDirectory = async (directoryPath: string, toSFC: boolean) => {
  const directoryToMigrate = path.join(process.cwd(), directoryPath);
  const project = new Project({});

  project.addSourceFilesAtPaths(`${directoryToMigrate}/**/*.(ts|vue|scss)`)
    .filter(sourceFile =>
      ![".vue", ".ts"].includes(sourceFile.getExtension())
      || sourceFile.getFilePath().includes("node_modules")
    )
    .forEach(file => project.removeSourceFile(file));

  const finalFilesToMigrate = project
    .getSourceFiles()
    .filter(
      (file) =>
        [".vue", ".ts"].includes(file.getExtension()) &&
        !file.getFilePath().includes("node_modules") &&
        file.getText().includes("@Component"),
    );

  logger.info(
    `Migrating directory: ${directoryToMigrate}, ${finalFilesToMigrate.length} Files needs migration`,
  );

  for (const sourceFile of finalFilesToMigrate) {
    try {
      await migrateFile(project, sourceFile);
    } catch (error) {
      logger.error(`Error migrating ${sourceFile.getFilePath()}: `, error);
      return;
    }
  }

  if (toSFC) {
    const vueFiles = project
      .getSourceFiles()
      .filter(
        (file) =>
          [".vue"].includes(file.getExtension()),
      );

    logger.info(`Migrating directory: ${directoryToMigrate}, files to SFC`);
    await Promise.all(vueFiles.map((f) => vueFileToSFC(project, f)));
  }
};
