import { project, expectMigration } from '../utils';

describe('@Ref', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  describe('@Ref decorator', () => {
    test('@Ref simple', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    @Ref() readonly anotherComponent!: AnotherComponent
                }`,
        // Result
        `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        anotherComponent: {
                            cache: false,
                            get() {
                              return this.$refs["anotherComponent"] as AnotherComponent;
                            }
                        }
                    }
                })`,
      );
    });

    test('@Ref simple decorator', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    @Ref()
                    readonly defaultInput!: HTMLInputElement;                  
                }`,
        // Result
        `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        defaultInput: {
                            cache: false,
                            get() {
                                return this.$refs["defaultInput"] as HTMLInputElement;
                            }
                        }
                    }
                })`,
      );
    });

    test('@Ref complex decorator', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    @Ref("actualRef")
                    readonly defaultInput!: HTMLInputElement;                  
                }`,
        // Result
        `import { defineComponent } from "vue";

                export default defineComponent({
                    computed: {
                        defaultInput: {
                            cache: false,
                            get() {
                                return this.$refs["actualRef"] as HTMLInputElement;
                            }
                        }
                    }
                })`,
      );
    });
  });
});
