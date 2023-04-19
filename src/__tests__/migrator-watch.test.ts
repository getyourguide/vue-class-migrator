import { project, expectMigration } from "./utils";

describe("Component watch", () => {
    afterAll(() => {
        project.getSourceFiles().forEach(file => file.deleteImmediatelySync());
    })

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
            })`
        )
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
            })`
        );
    });

    describe("@Watch decorator", () => {

        test('@Watch simple', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Watch('myWatchedProp')
                    onChildChanged(val: string) { console.log("onChildChanged"); }
                }`,
                // Result
                `import { defineComponent } from "vue";

                export default defineComponent({
                    watch: {
                        'myWatchedProp': [{
                            handler: 'onChildChanged'
                        }]
                    },
                    methods: {
                        onChildChanged(val: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`
            );
        });

        test('@Watch simple path', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Watch('myWatchedProp.propA')
                    onChildChanged(val: string, oldVal: string) {
                        console.log("onChildChanged");
                    }
                }`,
                // Result
                `import { defineComponent } from "vue";

                export default defineComponent({
                    watch: {
                        'myWatchedProp.propA': [{
                            handler: 'onChildChanged'
                        }]
                    },
                    methods: {
                        onChildChanged(val: string, oldVal: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`
            );
        });

        test('@Watch double property', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Watch('myWatchedPropA')
                    @Watch('myWatchedPropB')
                    onChildChanged(val: string, oldVal: string) {
                        console.log("onChildChanged");
                    }
                }`,
                // Result
                `import { defineComponent } from "vue";

                export default defineComponent({
                    watch: {
                        'myWatchedPropA': [{
                            handler: 'onChildChanged'
                        }],
                        'myWatchedPropB': [{
                            handler: 'onChildChanged'
                        }]
                    },
                    methods: {
                        onChildChanged(val: string, oldVal: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`
            );
        });

        test('@Watch with property params', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Watch('myWatchedPropA', { immediate: true })
                    @Watch('myWatchedPropB', { immediate: true, deep: true })
                    onChildChanged(val: string, oldVal: string) {
                        console.log("onChildChanged");
                    }
                }`,
                // Result
                `import { defineComponent } from "vue";

                export default defineComponent({
                    watch: {
                        'myWatchedPropA': [{ immediate: true,
                            handler: 'onChildChanged'
                        }],
                        'myWatchedPropB': [{ immediate: true, deep: true,
                            handler: 'onChildChanged'
                        }]
                    },
                    methods: {
                        onChildChanged(val: string, oldVal: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`
            );
        });

    });

});