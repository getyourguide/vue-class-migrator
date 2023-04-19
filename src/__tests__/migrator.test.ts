import { project, createSourceFile } from "./utils";
import { migrateFile } from "../migrator";

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

    describe('Imports & Exports', () => {
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
    });
})