import { project, expectMigration, expectMigrationToThrow } from "./utils";

describe("Data Property Migration", () => {
    afterAll(() => {
        project.getSourceFiles().forEach(file => file.deleteImmediatelySync());
    })

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
                })`
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
                })`
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
                })`
            );
        });

    });
    
    describe('Vuex @Getter', () => {
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
                })`
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
                })`
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
                })`
            );
        });

        test('@Getter with invalid prop fails', async () => {
            await expectMigrationToThrow(
                `@Component
                export default class Test extends Vue {
                    @Getter("foo", { id: 1 }) bar: string | null;
                }`,
                // Throws
                "@Getter option id not supported."
            );
        });
    });
    
});