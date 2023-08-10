import { project, expectMigration, expectMigrationToThrow } from '../utils';

describe('Vuex @Mutation', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Simple @Mutation', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Mutation
                    reload: any;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(): any {
                            return this.$store.commit("reload");
                        }
                    }
                })`,
    );
  });

  test('@Mutation(name)', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Mutation("myReload")
                    reload: any;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(): any {
                            return this.$store.commit("myReload");
                        }
                    }
                })`,
    );
  });

  test('@Mutation(name, {namespace})', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Mutation("myReload", { namespace: "reloadNamespace" })
                    reload: any;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(): any {
                            return this.$store.commit("reloadNamespace/myReload");
                        }
                    }
                })`,
    );
  });

  test('@Mutation(name, {namespace}) with type', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Mutation(\`myReload\`, { namespace: "reloadNamespace" })
                    reload: (p1: string, p2, p3: number) => number;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(p1: string, p2, p3: number): Promise<number> {
                            return this.$store.commit("reloadNamespace/myReload", p1, p2, p3);
                        }
                    }
                })`,
    );
  });

  test('@Mutation(name, {invalid: 1}) with invalid prop throws', async () => {
    await expectMigrationToThrow(
      `@Component
                export default class Test extends Vue {
                    @Mutation("myReload", { invalid: 3 })
                    reload: any;
                }`,
      // Throws
      '@Mutation option invalid not supported.',
    );
  });
});
