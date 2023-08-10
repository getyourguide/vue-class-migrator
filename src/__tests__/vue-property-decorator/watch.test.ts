import { project, expectMigration } from '../utils';

describe('@Watch decorator', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

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
                        "myWatchedProp": [{
                            handler: "onChildChanged"
                        }]
                    },
                    methods: {
                        onChildChanged(val: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`,
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
                        "myWatchedProp.propA": [{
                            handler: "onChildChanged"
                        }]
                    },
                    methods: {
                        onChildChanged(val: string, oldVal: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`,
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
                        "myWatchedPropA": [{
                            handler: "onChildChanged"
                        }],
                        "myWatchedPropB": [{
                            handler: "onChildChanged"
                        }]
                    },
                    methods: {
                        onChildChanged(val: string, oldVal: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`,
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
                        "myWatchedPropA": [{ immediate: true,
                            handler: "onChildChanged"
                        }],
                        "myWatchedPropB": [{ immediate: true, deep: true,
                            handler: "onChildChanged"
                        }]
                    },
                    methods: {
                        onChildChanged(val: string, oldVal: string) {
                            console.log("onChildChanged");
                        }
                    }
                })`,
    );
  });
});
