import { Project, SourceFile } from 'ts-morph';
import { project, createSourceFile } from './utils';
import { migrateFile, migrateSingleFile } from '../migrator';
import * as migrator from '../migrator/migrator';

describe('migrateFile()', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Throws for already migrated file', async () => {
    const sourceFile = createSourceFile();
    await expect(migrateFile(project, sourceFile))
      .rejects
      .toThrow('File already migrated');
  });

  test('Throws for not supported files', async () => {
    await expect(migrateFile(project, createSourceFile('@Component', 'txt')))
      .rejects
      .toThrow('Extension .txt not supported');
  });

  test('Throws for not class with decorator found', async () => {
    project.createWriter();
    const sourceFile = createSourceFile(`
            const myTest = @Component        
        `);

    await expect(migrateFile(project, sourceFile))
      .rejects
      .toThrow('Class implementing the @Component decorator not found.');
  });

  describe('Imports & Exports', () => {
    test('Empty exported class resolves', async () => {
      const sourceFile = createSourceFile([
        '@Component',
        'export class Test {}',
      ].join('\n'));

      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe([
          'import { defineComponent } from \'~/lib/helper/fallback-composition-api\';\n',
          'export const Test = defineComponent({})',
        ].join('\n'));
    });

    test('Empty default exported class resolves', async () => {
      const sourceFile = createSourceFile([
        '@Component',
        'export default class Test {}',
      ].join('\n'));

      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe([
          'import { defineComponent } from \'~/lib/helper/fallback-composition-api\';\n',
          'export default defineComponent({})',
        ].join('\n'));
    });

    test('Non vue import respected', async () => {
      const sourceFile = createSourceFile([
        'import Bla, { Blo } from "./blabla"',
        '@Component',
        'export default class Test {}',
      ].join('\n'));

      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe([
          'import Bla, { Blo } from "./blabla"',
          'import { defineComponent } from \'~/lib/helper/fallback-composition-api\';\n',
          'export default defineComponent({})',
        ].join('\n'));
    });

    test('Vue import respected', async () => {
      const sourceFile = createSourceFile([
        'import Vue, { mounted } from \'~/lib/helper/fallback-composition-api\';',
        '@Component',
        'export default class Test {}',
      ].join('\n'));

      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe([
          'import Vue, { mounted, defineComponent } from \'~/lib/helper/fallback-composition-api\';',
          'export default defineComponent({})',
        ].join('\n'));
    });

    test('Vue import respected in .vue file', async () => {
      const sourceFile = createSourceFile([
        '<script lang="ts">',
        'import Vue, { mounted } from \'~/lib/helper/fallback-composition-api\';',
        '@Component',
        'export default class {}',
        '</script>',
      ].join('\n'), 'vue');

      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe([
          '<script lang="ts">',
          'import Vue, { mounted, defineComponent } from \'~/lib/helper/fallback-composition-api\';',
          'export default defineComponent({})',
          '',
          '</script>',
        ].join('\n'));
    });
  });

  describe('Code styles', () => {
    test('Single quotation and 2 spaces indentation', async () => {
      const sourceFile = createSourceFile([
        '@Component',
        'export default class {',
        '  myMethod() {',
        '    return \'\';',
        '  }',
        '}',
      ].join('\n'));

      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe([
          'import { defineComponent } from \'~/lib/helper/fallback-composition-api\';\n',
          'export default defineComponent({',
          '  methods: {',
          '    myMethod() {',
          '      return \'\';',
          '    }',
          '  }',
          '})',
        ].join('\n'));
    });
  });
});

describe('migrateSingleFile()', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when a file path is neither .vue nor .ts file', () => {
    let migrateFileSpy: jest.SpyInstance;
    beforeEach(() => {
      migrateFileSpy = jest.spyOn(migrator, 'migrateFile');
    });

    test('should not call `migrateFile`', async () => {
      await migrateSingleFile('test.txt', false);

      expect(migrateFileSpy).not.toHaveBeenCalled();
    });
  });

  describe('when a file path is a .vue file', () => {
    let migrateFileSpy: jest.SpyInstance;
    const scriptSource = `'<script lang="ts">',
'import Vue, { mounted } from '~/lib/helper/fallback-composition-api';',
'@Component',
'export default class {}',
'</script>',
`;
    let sourceFile: SourceFile;

    beforeEach(() => {
      migrateFileSpy = jest.spyOn(migrator, 'migrateFile');
      process.cwd = jest.fn(() => '/');
      sourceFile = createSourceFile(scriptSource, 'vue');
      Project.prototype.addSourceFileAtPath = jest.fn(() => sourceFile);
      Project.prototype.getSourceFiles = jest.fn(() => [sourceFile]);
    });

    test('should call `migrateFile`', async () => {
      await migrateSingleFile(sourceFile.getFilePath(), false);

      expect(migrateFileSpy).toHaveBeenCalledWith(expect.anything(), sourceFile);
    });
  });
});
