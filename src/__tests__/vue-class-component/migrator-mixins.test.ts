import { project, expectMigration, expectMigrationToThrow } from '../utils';

describe('Component extends', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('Class extending becomes extends', async () => {
    await expectMigration(
      `@Component
            export default class Test extends AnotherTest {}`,
      // Results
      `import { defineComponent } from "vue";

            export default defineComponent({
                extends: AnotherTest
            })`,
    );
  });

  test('Class extending becomes extends', async () => {
    await expectMigration(
      `@Component
            export default class Test extends AnotherTest {}`,
      // Results
      `import { defineComponent } from "vue";

            export default defineComponent({
                extends: AnotherTest
            })`,
    );
  });

  test('Class extending and @Component extends throws', async () => {
    await expectMigrationToThrow(
      `@Component({
                extends: DemoComponennt
            })
            export default class Test extends AnotherTest {}`,
      // Throws
      'This component is using extends and extending from a different class, this is not supported.',
    );
  });

  test('Class extending from mixins(A...) and mixins already set throws', async () => {
    await expectMigrationToThrow(
      `@Component({
                mixins: [DemoComponennt]
            })
            export default class Test extends mixins(Demo2Componennt) {}`,
      // Throws
      'Class extending from mixins() and mixins already present. This is not supported yet.',
    );
  });
});
