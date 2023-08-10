import { project, expectMigration } from '../utils';

describe('@Model decorator', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('@Model simple', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Model('change')
                    checked: boolean;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    model: {
                        prop: "checked",
                        event: "change"
                    },
                    props: {
                        checked: {
                            type: Boolean
                        }
                    }
                })`,
    );
  });

  test('@Model with constructor', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Model('change', Boolean)
                    checked: boolean;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    model: {
                        prop: "checked",
                        event: "change"
                    },
                    props: {
                        checked: {
                            type: Boolean
                        }
                    }
                })`,
    );
  });

  test('@Model with constructor array', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Model('change', [Boolean, String])
                    checked: boolean;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    model: {
                        prop: "checked",
                        event: "change"
                    },
                    props: {
                        checked: {
                            type: [Boolean, String]
                        }
                    }
                })`,
    );
  });

  test('@Model with object property', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @Model('change', {type: Boolean})
                    checked: boolean;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    model: {
                        prop: "checked",
                        event: "change"
                    },
                    props: {
                        checked: {type: Boolean}
                    }
                })`,
    );
  });
});
