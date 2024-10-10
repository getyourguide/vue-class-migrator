import path from 'path';
import {
  IndentationText,
  Project,
  QuoteKind,
  SourceFile,
} from 'ts-morph';
import logger from './logger';
import migrateVueClassComponent from './vue-class-component';
import migrateVueClassProperties from './vue-property-decorator';
import migrateVuexDecorators from './vuex';
import { getScriptContent, injectScript, vueFileToSFC } from './migrator-to-sfc';
import { createMigrationManager } from './migratorManager';
import {
  canBeCliOptions, DirectoryModeOption, FileModeOption, OptionParser,
} from './option';

const migrateTsFile = async (project: Project, sourceFile: SourceFile): Promise<SourceFile> => {
  const filePath = sourceFile.getFilePath();
  const { name, ext } = path.parse(path.basename(filePath));
  const outPath = path.join(path.dirname(filePath), `${name}_migrated${ext}`);
  const outFile = project.createSourceFile(outPath, sourceFile.getText(), { overwrite: true });

  try {
    const migrationManager = createMigrationManager(sourceFile, outFile);

    migrateVueClassComponent(migrationManager);
    migrateVueClassProperties(migrationManager);
    migrateVuexDecorators(migrationManager);
  } catch (error) {
    await outFile.deleteImmediately();
    throw error;
  }
  return outFile.moveImmediately(sourceFile.getFilePath(), { overwrite: true });
};

const migrateVueFile = async (project: Project, vueSourceFile: SourceFile) => {
  const scriptContent = getScriptContent(vueSourceFile);
  if (!scriptContent) {
    throw new Error('Unable to extract script tag content');
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

export const migrateFile = async (
  project: Project,
  sourceFile: SourceFile,
): Promise<SourceFile> => {
  logger.info(`Migrating ${sourceFile.getBaseName()}`);
  if (!sourceFile.getText().includes('@Component')) {
    throw new Error('File already migrated');
  }

  const ext = sourceFile.getExtension();

  if (ext === '.ts') {
    return migrateTsFile(project, sourceFile);
  }

  if (ext === '.vue') {
    return migrateVueFile(project, sourceFile);
  }

  throw new Error(`Extension ${ext} not supported`);
};

const migrateEachFile = (
  filesToMigrate: SourceFile[],
  project: Project,
): Promise<SourceFile>[] => {
  const resolveFileMigration = (s: SourceFile, p: Project) => migrateFile(p, s)
    .catch((err) => {
      logger.error(`Error migrating ${s.getFilePath()}`);
      logger.error(err);
      return Promise.reject(err);
    });

  return filesToMigrate.map((sourceFile) => resolveFileMigration(sourceFile, project));
};

const createProject = () => new Project({
  manipulationSettings: {
    quoteKind: QuoteKind.Single,
    indentationText: IndentationText.TwoSpaces,
  },
});

export const migrateDirectory = async (directoryPath: string, toSFC: boolean) => {
  const directoryToMigrate = path.join(process.cwd(), directoryPath);
  const project = createProject();

  project.addSourceFilesAtPaths(`${directoryToMigrate}/**/*.(ts|vue|scss)`)
    .filter((sourceFile) => !['.vue', '.ts'].includes(sourceFile.getExtension())
      || sourceFile.getFilePath().includes('node_modules'))
    .forEach((file) => project.removeSourceFile(file));

  const finalFilesToMigrate = project
    .getSourceFiles()
    .filter(
      (file) => ['.vue', '.ts'].includes(file.getExtension())
        && !file.getFilePath().includes('node_modules')
        && file.getText().includes('@Component'),
    );

  logger.info(
    `Migrating directory: ${directoryToMigrate}, ${finalFilesToMigrate.length} Files needs migration`,
  );

  const migrationPromises = migrateEachFile(finalFilesToMigrate, project);

  try {
    await Promise.all(migrationPromises);
  } catch (error) {
    return;
  }

  if (toSFC) {
    const vueFiles = project
      .getSourceFiles()
      .filter(
        (file) => ['.vue'].includes(file.getExtension()),
      );

    logger.info(`Migrating directory: ${directoryToMigrate}, files to SFC`);
    await Promise.all(vueFiles.map((f) => vueFileToSFC(project, f)));
  }
};

export const migrateSingleFile = async (filePath: string, toSFC: boolean): Promise<void> => {
  const fileExtensionPattern = /.+\.(vue|ts)$/;
  if (!fileExtensionPattern.test(filePath)) {
    logger.info(`${filePath} can not migrate. Only .vue files are supported.`);
    return;
  }

  const fileToMigrate = path.join(process.cwd(), filePath);
  const project = createProject();
  project.addSourceFileAtPath(fileToMigrate);
  const sourceFiles = project.getSourceFiles();

  logger.info(`Migrating file: ${fileToMigrate}`);

  const migrationPromises = migrateEachFile(sourceFiles, project);
  try {
    await Promise.all(migrationPromises);
  } catch (error) {
    return;
  }

  if (toSFC) {
    logger.info(`Migrating file: ${fileToMigrate}, files to SFC`);
    await Promise.all(sourceFiles.map((f) => vueFileToSFC(project, f)));
  }
};

/**
 * Entry function to start migration
 */
export const migrate = async (option: any): Promise<void> => {
  if (!canBeCliOptions(option)) {
    throw new Error('Cli option should be provided. Run --help for more info');
  }
  const result = new OptionParser(option).parse();
  if (Object.keys(result).includes('file')) {
    const fileModeOption = result as FileModeOption;
    migrateSingleFile(fileModeOption.file, (fileModeOption.sfc ?? false));
  } else {
    const directoryModeOption = result as DirectoryModeOption;
    migrateDirectory(directoryModeOption.directory, (directoryModeOption.sfc ?? false));
  }
};
