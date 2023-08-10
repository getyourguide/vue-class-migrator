import { project, expectMigration } from '../utils';

describe('Component watch', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('@Component watch become watch method', async () => {
    await expectMigration(
      `@Component({
                watch: {
                    myWatch: {
                      handler() {
                        return '';
                      },
                      deep: true,
                      immediate: true
                    }
                }
            })
            export default class Test extends Vue {}`,

      // Result
      `import { defineComponent } from "vue";

            export default defineComponent({
                watch: {
                    myWatch: {
                      handler() {
                        return '';
                      },
                      deep: true,
                      immediate: true
                    }
                }
            })`,
    );
  });

  test('Empty @Component watch ignored', async () => {
    await expectMigration(
      `@Component({
                name: "test",
                watch: {}
            })
            export default class Test extends Vue {}`,
      // Result
      `import { defineComponent } from "vue";

            export default defineComponent({
                name: "test",
                watch: {}
            })`,
    );
  });
});
