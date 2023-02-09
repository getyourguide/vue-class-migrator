import { Project } from "ts-morph";
import { migrateFile } from "../src/migrator";
import { randomBytes } from "crypto";

const project = new Project({ useInMemoryFileSystem: true });
const createSourceFile = (content = undefined, ext = 'ts') => {
    const randomString = randomBytes(5).toString('hex');
    return project.createSourceFile(`./${randomString}.${ext}`, content);
}

describe("migrateFile()", () => {
    afterAll(() => {
        project.getSourceFiles().forEach(file => file.deleteImmediatelySync());
    })

    test('Throws for already migrated file', async () => {
        const sourceFile = createSourceFile();
        await expect(migrateFile(project, sourceFile))
            .rejects
            .toThrow('File already migrated');
    });

    test('Throws for not supported files', async () => {
        await expect(migrateFile(project, createSourceFile("@Component", "txt")))
            .rejects
            .toThrow('Extension .txt not supported');
    });

    test('Throws for not class with decorator found', async () => {
        project.createWriter()
        const sourceFile = createSourceFile(`
            const myTest = @Component        
        `);

        await expect(migrateFile(project, sourceFile))
            .rejects
            .toThrow('Class implementing the @Component decorator not found.');
    });

    test('Empty @Decorator props resolves', async () => {
        const sourceFile = createSourceFile([
            "@Component({})",
            "class Test {}"
        ].join("\n"));

        const migratedFile = await migrateFile(project, sourceFile);
        expect(migratedFile.getText())
            .toBe([
                "import { defineComponent } from \"vue\";\n",
                "const Test = defineComponent({})"
            ].join("\n")
            );
    });

    test('@Component non supported property throws', async () => {
        const sourceFile = createSourceFile(
            `@Component({
                weird: [A,B,C]
            })
            export default class Test extends AnotherClass {}`
                .replaceAll("  ", ""));

        await expect(migrateFile(project, sourceFile))
            .rejects
            .toThrow('Property on @Component \"weird\" not supported.');
    });

    describe('Imports & Exports', () => {

        test('Empty not exported class resolves', async () => {
            const sourceFile = createSourceFile([
                "@Component",
                "class Test {}"
            ].join("\n"));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText())
                .toBe([
                    "import { defineComponent } from \"vue\";\n",
                    "const Test = defineComponent({})"
                ].join("\n")
                );
        });

        test('Empty exported class resolves', async () => {
            const sourceFile = createSourceFile([
                "@Component",
                "export class Test {}"
            ].join("\n"));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText())
                .toBe([
                    "import { defineComponent } from \"vue\";\n",
                    "export const Test = defineComponent({})"
                ].join("\n")
                );
        });

        test('Empty default exported class resolves', async () => {
            const sourceFile = createSourceFile([
                "@Component",
                "export default class Test {}"
            ].join("\n"));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText())
                .toBe([
                    "import { defineComponent } from \"vue\";\n",
                    "export default defineComponent({})"
                ].join("\n")
                );
        });

        test('Non vue import respected', async () => {
            const sourceFile = createSourceFile([
                "import Bla, { Blo } from \"./blabla\"",
                "@Component",
                "export default class Test {}"
            ].join("\n"));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText())
                .toBe([
                    "import Bla, { Blo } from \"./blabla\"",
                    "import { defineComponent } from \"vue\";\n",
                    "export default defineComponent({})"
                ].join("\n")
                );
        });


        test('Vue import respected', async () => {
            const sourceFile = createSourceFile([
                "import Vue, { mounted } from \"vue\";",
                "@Component",
                "export default class Test {}"
            ].join("\n"));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText())
                .toBe([
                    "import Vue, { mounted, defineComponent } from \"vue\";",
                    "export default defineComponent({})"
                ].join("\n")
                );
        });
    })

    describe('Component mixins & extends', () => {

        test('Class extension becomes extends', async () => {
            const sourceFile = createSourceFile([
                "@Component",
                "export default class Test extends AnotherTest {}"
            ].join("\n"));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                export default defineComponent({
                    extends: AnotherTest
                })`
                        .replaceAll("  ", "")
                );
        });

        test('@Component mixins become mixins property', async () => {
            const sourceFile = createSourceFile(
                `@Component({
                    mixins: [A,B,C]
                })
                export default class Test {}`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";
    
                    export default defineComponent({
                        mixins: [A,B,C]
                    })`
                        .replaceAll("  ", "")
                );
        });

        test('@Component mixins and class extending is supported', async () => {
            const sourceFile = createSourceFile(
                `@Component({
                    mixins: [A,B,C]
                })
                export default class Test extends AnotherClass {}`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";
    
                    export default defineComponent({
                        mixins: [A,B,C],
                        extends: AnotherClass
                    })`
                        .replaceAll("  ", "")
                );
        });
    })

    describe('Component Properties', () => {
        test('Short hand assignment', async () => {
            const sourceFile = createSourceFile(
                `@Component({
                    props
                })
                export default class Test extends Vue {}`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        props
                    })`
                        .replaceAll("  ", "")
                );
        });
        test('@Component props become properties', async () => {
            const sourceFile = createSourceFile(
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
            export default class Test extends Vue {}`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
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
                })`
                        .replaceAll("  ", "")
                );
        });
        test('Class @Prop  with method assignment become properties', async () => {
            const sourceFile = createSourceFile(
                `@Component()
            export default class Test extends Vue {

                @Prop({
                    type: Object,
                    default() {
                      return {
                        canEdit: true,
                        canCreate: true,
                        canDelete: true,
                      };
                    },
                  })
                  permissions!: CommentPermissions;

            }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";

                export default defineComponent({
                    props: {
                        permissions: {
                            type: Object,
                            default() {
                                return {
                                  canEdit: true,
                                  canCreate: true,
                                  canDelete: true,
                                };
                            }
                        }
                    }
                })`
                        .replaceAll("  ", "")
                );
        });

        test('@Component props & vuex @Prop don\'t clash', async () => {
            const sourceFile = createSourceFile(
                `@Component({
                    props: {
                        myProp: {
                            default: true,
                            required: false,
                            type: String
                        }
                    }
                })
                export default class Test extends Vue {
                    @Prop
                    checkId: string;
                    
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";
    
                    export default defineComponent({
                        props: {
                            myProp: {
                                default: true,
                                required: false,
                                type: String
                            },
                            checkId: {
                                type: String
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });


        test('Vuex @Prop become props', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Prop
                    checkId: MyCheckId;
                    
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";
    
                    export default defineComponent({
                        props: {
                            checkId: {
                                type: Object as PropType<MyCheckId>
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        test('Vuex @Prop with default become props', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Prop({ default: 3 })
                    checkId: MyCheckId;
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";
    
                    export default defineComponent({
                        props: {
                            checkId: {
                                default: 3,
                                type: Object as PropType<MyCheckId>
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });


        test('Vuex @Prop collision with prop assigns the @Prop type', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Prop({ type: String })
                    checkId: MyCheckId;
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";
    
                    export default defineComponent({
                        props: {
                            checkId: {
                                type: String
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });


        test('Vuex @Prop collision with prop of same type passes', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Prop({ type: String })
                    checkId: string;
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";
    
                    export default defineComponent({
                        props: {
                            checkId: {
                                type: String
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        test('Vuex @Prop with type and no typescript type passes', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Prop({ type: String })
                    checkId;
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent, PropType } from "vue";
    
                    export default defineComponent({
                        props: {
                            checkId: {
                                type: String
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

    })

    describe('Component Methods', () => {

        test('Special method goes to root', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    created() {
                        console.log("OK");
                    }
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        created() {
                            console.log("OK");
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        test('Method goes to methods', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    created() {
                        console.log("OK");
                    }
                    myMethod(param1: string, p2, p3: any): void {
                        console.log("hey")
                    }
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
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
                        .replaceAll("  ", "")
                );
        });

        test('Method structure is preserved', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    myMethod(p1: MyType) {
                        return 3;
                    }
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        methods: {
                            myMethod(p1: MyType) {
                                return 3;
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        describe("Vuex @Action", () => {
            test('Simple @Action', async () => {
                const sourceFile = createSourceFile(
                    `@Component
                    export default class Test extends Vue {
                        @Action
                        reload: any;
                    }`
                        .replaceAll("  ", ""));

                const migratedFile = await migrateFile(project, sourceFile);
                expect(migratedFile.getText().replaceAll("  ", ""))
                    .toBe(
                        `import { defineComponent } from "vue";
    
                        export default defineComponent({
                            methods: {
                                reload(): any {
                                    return this.$store.dispatch("reload");
                                }
                            }
                        })`
                            .replaceAll("  ", "")
                    );
            });

            test('@Action(name)', async () => {
                const sourceFile = createSourceFile(
                    `@Component
                    export default class Test extends Vue {
                        @Action("myReload")
                        reload: any;
                    }`
                        .replaceAll("  ", ""));

                const migratedFile = await migrateFile(project, sourceFile);
                expect(migratedFile.getText().replaceAll("  ", ""))
                    .toBe(
                        `import { defineComponent } from "vue";
    
                        export default defineComponent({
                            methods: {
                                reload(): any {
                                    return this.$store.dispatch("myReload");
                                }
                            }
                        })`
                            .replaceAll("  ", "")
                    );
            });


            test('@Action(name, {namespace})', async () => {
                const sourceFile = createSourceFile(
                    `@Component
                    export default class Test extends Vue {
                        @Action("myReload", { namespace: "reloadNamespace" })
                        reload: any;
                    }`
                        .replaceAll("  ", ""));

                const migratedFile = await migrateFile(project, sourceFile);
                expect(migratedFile.getText().replaceAll("  ", ""))
                    .toBe(
                        `import { defineComponent } from "vue";
    
                        export default defineComponent({
                            methods: {
                                reload(): any {
                                    return this.$store.dispatch("reloadNamespace/myReload");
                                }
                            }
                        })`
                            .replaceAll("  ", "")
                    );
            });

            test('@Action(name, {namespace}) with type', async () => {
                const sourceFile = createSourceFile(
                    `@Component
                    export default class Test extends Vue {
                        @Action("myReload", { namespace: "reloadNamespace" })
                        reload: (p1: string, p2, p3: number) => number;
                    }`
                        .replaceAll("  ", ""));

                const migratedFile = await migrateFile(project, sourceFile);
                expect(migratedFile.getText().replaceAll("  ", ""))
                    .toBe(
                        `import { defineComponent } from "vue";
    
                        export default defineComponent({
                            methods: {
                                reload(p1: string, p2, p3: number): Promise<number> {
                                    return this.$store.dispatch("reloadNamespace/myReload", p1, p2, p3);
                                }
                            }
                        })`
                            .replaceAll("  ", "")
                    );
            });
        })

        // TODO Support @Component methods

    })

    describe('Component data', () => {

        /* TODO
        test('Class data() method as assignment is replicated', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    data: () => ({
                        gygadminUrl,
                    }),
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        data() {
                            return {
                                gygadminUrl
                            };
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });
        */

        test('Class data() method is replicated', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    data() {
                        return "works";
                    };
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        data() {
                            return "works";
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        test('Class properties are included as data', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    myProp: number;
                    myProp2;
                    myProp3 = false;
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
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
                        .replaceAll("  ", "")
                );
        });

        test('@Comoponent data is suported', async () => {
            const sourceFile = createSourceFile(
                `@Component({
                    data() {
                        return {
                            sun,
                            moon: false
                        }
                    }
                })
                export default class Test extends Vue {}`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        data() {
                            return {
                                sun,
                                moon: false
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        /* TODO
        test('@Component data() method as assignment is replicated', async () => {
            const sourceFile = createSourceFile(
                `@Component({
                    data: () => ({
                        gygadminUrl,
                    }),
                })
                export default class Test extends Vue {}`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        data() {
                            return {
                                gygadminUrl
                            };
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });
        */
        test('class data() & class data gets combined', async () => {
            const sourceFile = createSourceFile(
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
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
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
                        .replaceAll("  ", "")
                );
        });
        test('sectionData test', async () => {
            const sourceFile = createSourceFile(
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
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
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
                        .replaceAll("  ", "")
                );
        });

        test('@Component data & class data gets combined', async () => {
            const sourceFile = createSourceFile(
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
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
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
                        .replaceAll("  ", "")
                );
        });

        test('Class data() & @Component({data():...}) throws', async () => {
            const sourceFile = createSourceFile(
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
                }`
                    .replaceAll("  ", ""));

            await expect(migrateFile(project, sourceFile))
                .rejects
                .toThrow("Having a class with the data() method and the @Component({data(): ...} at the same time is not supported.");
        });

    })


    describe('Component references', () => {
        test('@Ref simple decorator is translated', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Ref()
                    readonly defaultInput!: HTMLInputElement;                  
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        computed: {
                            defaultInput(): HTMLInputElement {
                                return this.$refs.defaultInput;
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });

        test('@Ref complex decorator is translated', async () => {
            const sourceFile = createSourceFile(
                `@Component
                export default class Test extends Vue {
                    @Ref("actualRef")
                    readonly defaultInput!: HTMLInputElement;                  
                }`
                    .replaceAll("  ", ""));

            const migratedFile = await migrateFile(project, sourceFile);
            expect(migratedFile.getText().replaceAll("  ", ""))
                .toBe(
                    `import { defineComponent } from "vue";

                    export default defineComponent({
                        computed: {
                            defaultInput(): HTMLInputElement {
                                return this.$refs.actualRef;
                            }
                        }
                    })`
                        .replaceAll("  ", "")
                );
        });
    })

})