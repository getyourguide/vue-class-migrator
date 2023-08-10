import { project, expectMigration } from '../utils';

describe('@ModelSync decorator', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('@ModelSync simple with no type at all', async () => {
    await expectMigration(
      `@Component
        export default class Test extends Vue {
          @ModelSync('checked', 'change')
          readonly checkedValue!
        }`,
      // Result
      `import { defineComponent, PropType } from "vue";
  
        export default defineComponent({
          model: {
            prop: "checked",
            event: "change"
          },
          props: {
              checked: {
                type: Object as PropType<any>
              }
          },
          computed: {
              checkedValue: {
                  get() {
                      return this.checked;
                  },
                  set(value) {
                      this.$emit('change', value);
                  }
              }
          }
        })`,
    );
  });

  test('@ModelSync simple with no type but TS type', async () => {
    await expectMigration(
      `@Component
        export default class Test extends Vue {
          @ModelSync('checked', 'change')
          readonly checkedValue!: boolean
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
          },
          computed: {
              checkedValue: {
                  get(): boolean {
                      return this.checked;
                  },
                  set(value: boolean) {
                      this.$emit('change', value);
                  }
              }
          }
        })`,
    );
  });

  test('@ModelSync simple with no type complex TS type', async () => {
    await expectMigration(
      `@Component
        export default class Test extends Vue {
          @ModelSync('checked', 'change')
          readonly checkedValue!: MyCheckedValue
        }`,
      // Result
      `import { defineComponent, PropType } from "vue";
  
        export default defineComponent({
          model: {
            prop: "checked",
            event: "change"
          },
          props: {
              checked: {
                type: Object as PropType<MyCheckedValue>
              }
          },
          computed: {
              checkedValue: {
                  get(): MyCheckedValue {
                      return this.checked;
                  },
                  set(value: MyCheckedValue) {
                      this.$emit('change', value);
                  }
              }
          }
        })`,
    );
  });

  test('@ModelSync with constructor', async () => {
    await expectMigration(
      `@Component
      export default class Test extends Vue {
        @ModelSync('checked', 'change', Boolean)
        readonly checkedValue!: boolean
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
          },
          computed: {
              checkedValue: {
                  get(): boolean {
                      return this.checked;
                  },
                  set(value: boolean) {
                      this.$emit('change', value);
                  }
              }
          }
        })`,
    );
  });

  test('@ModelSync with constructor array', async () => {
    await expectMigration(
      `@Component
        export default class Test extends Vue {
            @ModelSync('checked', 'change', [String, Boolean])
            readonly checkedValue!: boolean
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
                type: [String, Boolean]
              }
          },
          computed: {
              checkedValue: {
                  get(): boolean {
                      return this.checked;
                  },
                  set(value: boolean) {
                      this.$emit('change', value);
                  }
              }
          }
        })`,
    );
  });

  test('@ModelSync with object property', async () => {
    await expectMigration(
      `@Component
        export default class Test extends Vue {
            @ModelSync('checked', 'change', { type: Boolean })
            readonly checkedValue!: boolean
        }`,
      // Result
      `import { defineComponent } from "vue";

        export default defineComponent({
            model: {
                prop: "checked",
                event: "change"
            },
            props: {
                checked: { type: Boolean }
            },
            computed: {
                checkedValue: {
                    get(): boolean {
                        return this.checked;
                    },
                    set(value: boolean) {
                        this.$emit('change', value);
                    }
                }
            }
        })`,
    );
  });
});
