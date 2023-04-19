import { project, expectMigration, expectMigrationToThrow } from "./utils";

describe("Methods Property Migration", () => {
    afterAll(() => {
        project.getSourceFiles().forEach(file => file.deleteImmediatelySync());
    })

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
                `import { defineComponent } from "vue";

                export default defineComponent({
                    created() {
                        console.log("OK");
                    }
                })`
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
                `import { defineComponent } from "vue";

                export default defineComponent({
                    created() {
                        console.log("OK");
                    },
                    methods: {
                        myMethod(param1: string, p2, p3: any): void {
                            console.log("hey")
                        }
                    }
                })`
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
                `import { defineComponent } from "vue";

                export default defineComponent({
                    methods: {
                        myMethod(p1: MyType): number {
                            return 3;
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
    
    describe("Vuex @Action", () => {
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
                })`
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
                })`
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
                })`
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
                })`
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
                "@Action option id not supported."
            );
        });

    });
    
});