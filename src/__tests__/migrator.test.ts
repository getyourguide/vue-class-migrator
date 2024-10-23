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

  describe('Props orders', () => {
    test('Mixins, props and data are moved to the top', async () => {
      const sourceFile = createSourceFile(`<script lang="ts">
import { CommentType } from '~/lib/types'
import { BaseMixin, mixins } from '~/lib/mixins'
import { Component, Prop, Watch } from 'nuxt-proprty-decorator'

@Component({
  components: {}
})
export default class extends mixins(BaseMixin) {
  val: string | null = null

  @Prop({ type: String })
  value?: string

  @Prop({ required: true,  })
  readonly commentType: CommentType

  @Prop({ default: true })
  isRequired?: boolean

  get typeClasses() {
    return this.commentType === CommentType.REQUIRED ? 'danger' : 'primary'
  }

  @Watch('purchaseComment')
  watchPurchaseComment() {
    this.init()
  }

  mounted() {
    this.init()
  }

  init() {
    this.val = this.value || ''
  }

  input() {
    this.$emit('input', this.val)
    this.$emit('change', this.val)
  }
}
</script>`, 'vue');
      const migratedFile = await migrateFile(project, sourceFile);
      expect(migratedFile.getText())
        .toBe(`<script lang="ts">
import { CommentType } from '~/lib/types'
import { BaseMixin, mixins } from '~/lib/mixins'
import { Component, Prop, Watch } from 'nuxt-proprty-decorator'
import { defineComponent, type PropType } from '~/lib/helper/fallback-composition-api';

export default defineComponent({
  components: {},
  mixins: [BaseMixin],
  props: {
    value: { type: String },
    commentType: { required: true,
      type: Object as PropType<CommentType>
    },
    isRequired: { default: true,
      type: Boolean
    }
  },
  data() {
    const val: string | null = null;

    return {
      val
    };
  },
  computed: {
    typeClasses() {
      return this.commentType === CommentType.REQUIRED ? 'danger' : 'primary'
    }
  },
  watch: {
    "purchaseComment": [{
      handler: "watchPurchaseComment"
    }]
  },
  methods: {
    watchPurchaseComment() {
      this.init()
    },
    init() {
      this.val = this.value || ''
    },
    input() {
      this.$emit('input', this.val)
      this.$emit('change', this.val)
    }
  },
  mounted() {
    this.init()
  }
})

</script>`);
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
