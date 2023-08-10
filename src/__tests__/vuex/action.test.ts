import { project, expectMigration, expectMigrationToThrow } from '../utils';

describe('Vuex @Action', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Simple @Action', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Action
                    reload: any;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(): any {
                            return this.$store.dispatch("reload");
                        }
                    }
                })`,
    );
  });

  test('@Action(name)', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Action("myReload")
                    reload: any;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(): any {
                            return this.$store.dispatch("myReload");
                        }
                    }
                })`,
    );
  });

  test('@Action(name, {namespace})', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Action("myReload", { namespace: "reloadNamespace" })
                    reload: any;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(): any {
                            return this.$store.dispatch("reloadNamespace/myReload");
                        }
                    }
                })`,
    );
  });

  test('@Action(name, {namespace}) with type', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Action(\`myReload\`, { namespace: "reloadNamespace" })
                    reload: (p1: string, p2, p3: number) => number;
                }`,
      // Results
      `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        reload(p1: string, p2, p3: number): Promise<number> {
                            return this.$store.dispatch("reloadNamespace/myReload", p1, p2, p3);
                        }
                    }
                })`,
    );
  });

  test('@Action(name, {invalid: 1}) with invalid prop throws', async () => {
    await expectMigrationToThrow(
      `@Component
                export default class Test extends Vue {
                    @Action("myReload", { id: 3 })
                    reload: any;
                }`,
      // Throws
      '@Action option id not supported.',
    );
  });
});
