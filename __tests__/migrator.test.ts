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

        test('@Component props become properties', async () => {
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

    })

})