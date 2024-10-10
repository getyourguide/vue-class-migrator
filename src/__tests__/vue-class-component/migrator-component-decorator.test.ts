import { project, expectMigration, expectMigrationToThrow } from '../utils';

describe('@Component decorator', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Empty @Component({}) props resolves', async () => {
    await expectMigration(
      `@Component({})
            class Test {}
            `,
      `import { defineComponent } from '~/lib/helper/fallback-composition-api';

            const Test = defineComponent({})
        `,
    );
  });

  test('Empty @Component props resolves', async () => {
    await expectMigration(
      `@Component
            class Test {}
            `,
      // Result
      `import { defineComponent } from '~/lib/helper/fallback-composition-api';

            const Test = defineComponent({})
        `,
    );
  });

  test('@Component mixins become mixins property', async () => {
    await expectMigration(
      `@Component({
                mixins: [A,B,C]
            })
            export default class Test {}`,
      // Result
      `import { defineComponent } from '~/lib/helper/fallback-composition-api';

            export default defineComponent({
                mixins: [A,B,C]
            })`,
    );
  });

  test('@Component mixins and class extending is supported', async () => {
    await expectMigration(
      `@Component({
                mixins: [A,B,C]
            })
            export default class Test extends AnotherClass {}`,
      // Result
      `import { defineComponent } from '~/lib/helper/fallback-composition-api';

            export default defineComponent({
                mixins: [A,B,C],
                extends: AnotherClass
            })`,
    );
  });

  test('@Component with params passed as parameter throws', async () => {
    await expectMigrationToThrow(
      `const params = {
                mixins: [A,B,C]
            };
            @Component(params)
            export default class Test extends AnotherClass {}`,
      // Throws
      '@Component props argument should be and object {}',
    );
  });

  test('@Component all assignment variatons supported', async () => {
    await expectMigration(
      `const beforeCreate = () => {};
            @Component({
                beforeCreate,
                beforeMount() { console.log("beforeMount"); },
                beforeDestroy: () => { console.log("beforeDestroy"); },
                beforeUpdate: function() { console.log("beforeUpdate"); },
                data: () => {},
                methods: {
                  demo(p1: string) {}
                },
                mixins: [A,B,C]
            })
            export default class Test extends Vue {}`,
      // Result
      `import { defineComponent } from '~/lib/helper/fallback-composition-api';

            const beforeCreate = () => {};
            export default defineComponent({
                beforeCreate,
                beforeMount() { console.log("beforeMount"); },
                beforeDestroy: () => { console.log("beforeDestroy"); },
                beforeUpdate: function() { console.log("beforeUpdate"); },
                data: () => {},
                methods: {
                  demo(p1: string) {}
                },
                mixins: [A,B,C]
            })`,
    );
  });
});
