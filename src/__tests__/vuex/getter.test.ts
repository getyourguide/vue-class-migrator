import { project, expectMigration, expectMigrationToThrow } from '../utils';

describe('Vuex @Getter', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Simple @Getter', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Getter bar: string | null;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        bar(): string | null {
                            return this.$store.getters["bar"];
                        }
                    }
                })`,
    );
  });

  test('@Getter with name', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Getter("getById")
                    getItemById!;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        getItemById() {
                            return this.$store.getters["getById"];
                        }
                    }
                })`,
    );
  });

  test('@Getter with namespace', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Getter('getById', { namespace: 'recentDispatches' })
                    getItemById!;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        getItemById() {
                            return this.$store.getters["recentDispatches/getById"];
                        }
                    }
                })`,
    );
  });

  test('@Getter with invalid prop fails', async () => {
    await expectMigrationToThrow(
      `@Component
                export default class Test extends Vue {
                    @Getter("foo", { id: 1 }) bar: string | null;
                }`,
      // Throws
      '@Getter option id not supported.',
    );
  });
});
