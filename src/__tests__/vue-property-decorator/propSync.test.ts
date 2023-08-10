import { project, expectMigration } from '../utils';

describe('@PropSync decorator', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  test('@PropSync simple with no type', async () => {
    await expectMigration(
      `@Component
        export default class Test extends Vue {
            @PropSync('name')
            syncedName;
        }`,
      // Result
      `import { defineComponent, PropType } from "vue";
    
        export default defineComponent({
            props: {
                name: {
                    type: Object as PropType<any>
                }
            },
            computed: {
                syncedName: {
                    get() {
                        return this.name;
                    },
                    set(value) {
                        this.$emit('update:name', value);
                    }
                }
            }
            })`,
    );
  });

  test('@PropSync simple', async () => {
    await expectMigration(
      `@Component
                    export default class Test extends Vue {
                        @PropSync('name')
                        syncedName: string;
                    }`,
      // Result
      `import { defineComponent } from "vue";
    
                    export default defineComponent({
                        props: {
                            name: {
                                type: String
                            }
                        },
                        computed: {
                            syncedName: {
                                get(): string {
                                    return this.name;
                                },
                                set(value: string) {
                                    this.$emit('update:name', value);
                                }
                            }
                        }
                    })`,
    );
  });

  test('@PropSync simple with complex type', async () => {
    await expectMigration(
      `@Component
                  export default class Test extends Vue {
                      @PropSync('name')
                      syncedName: string | boolean;
                  }`,
      // Result
      `import { defineComponent, PropType } from "vue";
  
                  export default defineComponent({
                      props: {
                          name: {
                            type: Object as PropType<string | boolean>
                          }
                      },
                      computed: {
                          syncedName: {
                              get(): string | boolean {
                                  return this.name;
                              },
                              set(value: string | boolean) {
                                  this.$emit('update:name', value);
                              }
                          }
                      }
                  })`,
    );
  });

  test('@PropSync with constructor', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @PropSync('name', String)
                    syncedName: string;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    props: {
                        name: {
                            type: String
                        }
                    },
                    computed: {
                        syncedName: {
                            get(): string {
                                return this.name;
                            },
                            set(value: string) {
                                this.$emit('update:name', value);
                            }
                        }
                    }
                })`,
    );
  });

  test('@PropSync with constructor array', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @PropSync('name', [String, Boolean])
                    syncedName: string;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    props: {
                        name: {
                            type: [String, Boolean]
                        }
                    },
                    computed: {
                        syncedName: {
                            get(): string {
                                return this.name;
                            },
                            set(value: string) {
                                this.$emit('update:name', value);
                            }
                        }
                    }
                })`,
    );
  });

  test('@PropSync with object property', async () => {
    await expectMigration(
      `@Component
                export default class Test extends Vue {
                    @PropSync('name', { type: String })
                    syncedName: string;
                }`,
      // Result
      `import { defineComponent } from "vue";

                export default defineComponent({
                    props: {
                        name: { type: String }
                    },
                    computed: {
                        syncedName: {
                            get(): string {
                                return this.name;
                            },
                            set(value: string) {
                                this.$emit('update:name', value);
                            }
                        }
                    }
                })`,
    );
  });
});
