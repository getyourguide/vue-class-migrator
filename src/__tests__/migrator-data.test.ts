import { project, expectMigration, expectMigrationToThrow } from "./utils";

describe("Data Property Migration", () => {
    afterAll(() => {
        project.getSourceFiles().forEach(file => file.deleteImmediatelySync());
    })

    describe("@Component data decorator", () => {

        test('Class data() & @Component({data():...}) throws', async () => {
            await expectMigrationToThrow(
                `@Component({
                    data() {
                        return {
                            sun,
                            moon: false
                        }
                    }
                })
                export default class Test extends Vue {
                    data() {
                        return {
                            hello: false,
                            goodbye
                        }
                    }
                }`,
                // Throws
                "Having a class with the data() method and the @Component({data(): ...} at the same time is not supported."
            );
        });

        test('@Component data should be explicit', async () => {
            await expectMigrationToThrow(
                `@Component({
                    data,
                })
                export default class Test extends Vue {}`,
                // Throws
                "@Component Data prop should be an object or a method. Type: ShorthandPropertyAssignment"
            );
        });

        test('@Component data: () => {}', async () => {
            await expectMigration(
                `@Component({
                    data: () => { return { a: 1 }; }
                })
                export default class Test extends Vue {}`,
                // Result
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data: () => { return { a: 1 }; }
                })`
            );
        });

        test('@Component data() {}', async () => {
            await expectMigration(
                `@Component({
                    data() { return { a: 1 }; }
                })
                export default class Test extends Vue {}`,
                // Result
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() { return { a: 1 }; }
                })`
            );
        });

        test('@Comoponent data complex return', async () => {
            await expectMigration(
                `@Component({
                    data() {
                        return {
                            sun,
                            moon: false
                        }
                    }
                })
                export default class Test extends Vue {}`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() {
                        return {
                            sun,
                            moon: false
                        }
                    }
                })`
            );
        });

    });

    describe("Data class method", () => {

        test('Class data() method is replicated', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    data() {
                        return {};
                    };
                }`,
                // Throws
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() {
                        return {};
                    }
                })`
            );
        });

        test('Class data() & class props get combined', async () => {
            await expectMigration(
                `@Component()
                export default class Test extends Vue {
                    hello = true;
                    goodbye: string = "goodbye";
                    data() {
                        return {
                            sun,
                            moon: false
                        }
                    }
                }`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() {
                        const goodbye: string = "goodbye";
                        
                        return {
                            sun,
                            moon: false,
                            hello: true,
                            goodbye
                        }
                    }
                })`
            );
        });

        test('@Component data & class data gets combined', async () => {
            await expectMigration(
                `@Component({
                    data() {
                        return {
                            sun,
                            moon: {
                                out: false
                            }
                        }
                    }
                })
                export default class Test extends Vue {
                    hello = true;
                    goodbye: string = "goodbye";
                    salutation: {
                        show: string
                    }
                }`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() {
                        const salutation: {
                            show: string
                        } = undefined;
                        const goodbye: string = "goodbye";

                        return {
                            sun,
                            moon: {
                                out: false
                            },
                            hello: true,
                            goodbye,
                            salutation
                        }
                    }
                })`
            );
        });
    });

    describe("Class properties", () => {
       
        test('Class properties are included as data', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    myProp: number;
                    myProp2;
                    myProp3 = false;
                }`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() {
                        const myProp: number = undefined;
                    
                        return {
                            myProp,
                            myProp2: undefined,
                            myProp3: false
                        };
                    }
                })`
            );
        });
 
        test('Big class property named data', async () => {
            await expectMigration(
                `@Component()
                export default class Test extends Vue {
                    data: SectionData = {
                            form: {
                            ref: "tourTranslationVolumeForm",
                            valid: true,
                            dialog: {
                                creating: true,
                                open: false,
                                loading: false,
                                tour_count: 0,
                                min_score: 0,
                                use_tours_per_week: false,
                                language_id: 0,
                                language_name: "",
                                },
                            },
                    };
                }`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    data() {
                        const data: SectionData = {
                                form: {
                                    ref: "tourTranslationVolumeForm",
                                    valid: true,
                                    dialog: {
                                    creating: true,
                                    open: false,
                                    loading: false,
                                    tour_count: 0,
                                    min_score: 0,
                                    use_tours_per_week: false,
                                    language_id: 0,
                                    language_name: "",
                                    },
                                    },
                                };
                                
                        return {
                            data
                        };
                    }
                })`
            );
        });
    });
});