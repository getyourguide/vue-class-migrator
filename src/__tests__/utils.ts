import { randomBytes } from 'crypto';
import { Project } from 'ts-morph';
import { migrateFile } from '../migrator';

export const project = new Project({ useInMemoryFileSystem: true });
export const createSourceFile = (content = undefined as string | undefined, ext = 'ts') => {
  const randomString = randomBytes(5).toString('hex');
  return project.createSourceFile(`./${randomString}.${ext}`, content);
};

export const expectMigration = async (sourceCode: string, targetCode: string) : Promise<void> => {
  const sourceFile = createSourceFile(sourceCode.replaceAll('  ', ''));

  const migratedFile = await migrateFile(project, sourceFile);
  expect(migratedFile.getText().replaceAll('  ', ''))
    .toBe(targetCode.replaceAll('  ', ''));
};

export const expectMigrationToThrow = async (
  sourceCode: string,
  errorMessage: string,
) : Promise<void> => {
  const sourceFile = createSourceFile(sourceCode);
  await expect(migrateFile(project, sourceFile))
    .rejects
    .toThrow(errorMessage);
};
