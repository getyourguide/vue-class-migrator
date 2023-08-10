import { project, createSourceFile } from './utils';
import { vueFileToSFC } from '../migrator/migrator-to-sfc';

describe('vueFileToSFC()', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Style without src is copied', async () => {
    const body = '<style>body {}</style>';
    const sourceFile = createSourceFile(body);
    const result = await vueFileToSFC(project, sourceFile);
    await expect(result.getText()).toBe(body);
  });

  test('Scoped style is transformed', async () => {
    const css = 'body {}';
    const cssSourceFile = createSourceFile(css, 'scss');
    const body = `<style scoped src="${cssSourceFile.getFilePath()}" />`;
    const sourceFile = createSourceFile(body);
    const result = await vueFileToSFC(project, sourceFile);
    await expect(result.getText()).toBe(
      `<style lang="scss" scoped>\n${css}\n</style>`,
    );
  });

  test('Non-scoped style is transformed', async () => {
    const css = 'body {}';
    const cssSourceFile = createSourceFile(css, 'scss');
    const body = `<style src="${cssSourceFile.getFilePath()}" />`;
    const sourceFile = createSourceFile(body);
    const result = await vueFileToSFC(project, sourceFile);
    await expect(result.getText()).toBe(
      `<style lang="scss">\n${css}\n</style>`,
    );
  });
});
