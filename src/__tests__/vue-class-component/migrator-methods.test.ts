import { project, expectMigration } from '../utils';

describe('Methods Property Migration', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  describe('Class method', () => {
    test('Special method goes to root', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    created() {
                        console.log("OK");
                    }
                }`,
        // Results
        `import { defineComponent } from "~/lib/helper/fallback-composition-api";

                export default defineComponent({
                    created() {
                        console.log("OK");
                    }
                })`,
      );
    });

    test('Method goes to methods', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    created() {
                        console.log("OK");
                    }
                    myMethod(param1: string, p2, p3: any): void {
                        console.log("hey")
                    }
                }`,
        // Results
        `import { defineComponent } from "~/lib/helper/fallback-composition-api";

                export default defineComponent({
                    created() {
                        console.log("OK");
                    },
                    methods: {
                        myMethod(param1: string, p2, p3: any): void {
                            console.log("hey")
                        }
                    }
                })`,
      );
    });

    test('Method structure is preserved', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    myMethod(p1: MyType): number {
                        return 3;
                    }
                }`,
        // Results
        `import { defineComponent } from "~/lib/helper/fallback-composition-api";

                export default defineComponent({
                    methods: {
                        myMethod(p1: MyType): number {
                            return 3;
                        }
                    }
                })`,
      );
    });
  });

  describe('Class setter', () => {
    test('Class set becomes watch property', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    set params(p1: string): void {
                        this.$emit("change", p1);
                      }
                }`,
        // Results
        `import { defineComponent } from "~/lib/helper/fallback-composition-api";

                export default defineComponent({
                    watch: {
                        params: {
                            handler(p1: string): void {
                                this.$emit("change", p1);
                            }
                        }
                    }
                })`,
      );
    });
  });

  describe('Class getters & setters', () => {
    test('get & set becomes computed property', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    get params(): string {
                        return "hello";
                    }
                    set params(p1: string): void {
                        this.$emit("change", p1);
                    }
                }`,
        // Results
        `import { defineComponent } from "~/lib/helper/fallback-composition-api";

                export default defineComponent({
                    computed: {
                        params: {
                            get(): string {
                                return "hello";
                            },
                            set(p1: string): void {
                                this.$emit("change", p1);
                            }
                        }
                    }
                })`,
      );
    });
  });
});
