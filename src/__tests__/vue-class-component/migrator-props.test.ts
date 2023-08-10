import { project, expectMigration } from '../utils';

describe('Component props', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Short hand assignment', async () => {
    await expectMigration(
      `const props = {
                test: 1
            };
            
            @Component({
                props
            })
            export default class Test extends Vue {}`,

      // Result
      `import { defineComponent } from "vue";

            const props = {
                test: 1
            };

            export default defineComponent({
                props
            })`,
    );
  });

  test('@Component props become properties', async () => {
    await expectMigration(
      `@Component({
                props: {
                    myProp: {
                        default: true,
                        required: false,
                        type: String
                    },
                    shortHand
                }
            })
            export default class Test extends Vue {}`,

      // Result
      `import { defineComponent } from "vue";

            export default defineComponent({
                props: {
                    myProp: {
                        default: true,
                        required: false,
                        type: String
                    },
                    shortHand
                }
            })`,
    );
  });

  test('Empty @Component props are ignored', async () => {
    await expectMigration(
      `@Component({
                name: "test",
                props: {}
            })
            export default class Test extends Vue {}`,
      // Result
      `import { defineComponent } from "vue";

            export default defineComponent({
                name: "test",
                props: {}
            })`,
    );
  });
});
