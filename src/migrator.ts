import path from "path";
import {
  Project,
  ClassDeclaration,
  SyntaxKind,
  ObjectLiteralExpression,
  SourceFile,
} from "ts-morph";
import migrateComponentDecorator from "./migrate-component-decorator";
import migrateImports from "./migrate-imports";
import migrateProps from "./migrate-props";
import migrateData from "./migrate-data";
import migrateMethods from "./migrate-methods";
import migrateGetters from "./migrate-getters";
import migrateWatchers from "./migrate-watchers";
import migrateExtends from "./migrate-extends";
import { getScriptContent, injectScript, vueFileToSFC } from "./migrator-to-sfc";
import migrateSetters from "./migrate-setters";

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
]; // Vue methods that won't be included under methods: {...}, they go to the root.
export const supportedDecorators = ["Prop", "Getter", "Action"]; // Class Property decorators
export const supportedComponentProps = ["name", "components", "mixins", "store"]; // @Component properties, empty ignored. e.g. props: {}
export const supportedPropDecoratorProps = ["default", "required"]; // @Prop("", {...})
export const supportedGetterOptions = ["namespace"]; // @Getter("", {...})
export const supportedActionOptions = ["namespace"]; // @Action("", {...})

export const getObjectProperty = (
  mainObject: ObjectLiteralExpression,
  property: string,
): ObjectLiteralExpression => {
  const computedObject = mainObject
    .getProperty(property)
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
  if (computedObject) {
    return computedObject;
  }

  return mainObject
    .addPropertyAssignment({
      name: property,
      initializer: "{}",
    })
    .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;
};

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

    let clazzReplacement: string;
    if (!outClazz.getDefaultKeyword()) {
      // Non default exported class
      clazzReplacement = [
        outClazz?.getExportKeyword()?.getText(),
        `const ${outClazz.getName()} = `,
        "defineComponent({})",
      ]
        .filter((s) => s)
        .join(" ");
    } else {
      clazzReplacement = [
        outClazz?.getExportKeyword()?.getText(),
        outClazz?.getDefaultKeywordOrThrow()?.getText(),
        "defineComponent({})",
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

    // @Component Decorator
    migrateComponentDecorator(migratePartProps);

    // Class Extends
    migrateExtends(migratePartProps);

    // Props Property
    migrateProps(migratePartProps);

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

const migrateFile = async (project: Project, sourceFile: SourceFile) => {
  console.log(`Migrating ${sourceFile.getBaseName()}`);
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

  console.log(
    `Migrating directory: ${directoryToMigrate}, ${finalFilesToMigrate.length} Files needs migration`,
  );

  for (const sourceFile of finalFilesToMigrate) {
    try {
      await migrateFile(project, sourceFile);
    } catch (error) {
      console.error(`Error migrating ${sourceFile.getFilePath()}: `, error);
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

    console.log(`Migrating directory: ${directoryToMigrate}, files to SFC`);
    await Promise.all(vueFiles.map((f) => vueFileToSFC(project, f)));
  }
};
