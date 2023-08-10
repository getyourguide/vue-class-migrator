import { project, expectMigration } from '../utils';

describe('Data Property Migration', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  describe('Class getter', () => {
    test('Class get becomes computed property', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    get params(): string {
                        return "hello";
                      }
                }`,
        // Results
        `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        params(): string {
                            return "hello";
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
        `import { defineComponent } from "vue";

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
        `import { defineComponent } from "vue";

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
