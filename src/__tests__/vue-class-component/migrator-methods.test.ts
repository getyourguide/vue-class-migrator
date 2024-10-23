import { project, expectMigration } from '../utils';

describe('Methods Property Migration', () => {
  afterAll(() => {
    project.getSourceFiles().forEach((file) => file.deleteImmediatelySync());
  });

  describe('Class method', () => {
    test('Special method goes to root', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    created() {
                        console.log("OK");
                    }
                }`,
        // Results
        `import { defineComponent } from '~/lib/helper/fallback-composition-api';

                export default defineComponent({
                    created() {
                        console.log("OK");
                    }
                })`,
      );
    });

    test('Multiple special methods go to root', async () => {
      await expectMigration(
        `@Component
                    export default class extends Vue {
                        created() {
                            console.log("on created");
                        }
                        mounted() {
                            console.log("on mounted");
                        }
                        doSomething() {
                            console.log("do something");
                        }
                    }`,
        // Results
        `import { defineComponent } from '~/lib/helper/fallback-composition-api';
    
                    export default defineComponent({
                        created() {
                            console.log("on created");
                        },
                        mounted() {
                            console.log("on mounted");
                        },
                        methods: {
                            doSomething() {
                                console.log("do something");
                            }
                        }
                    })`,
      );
    });

    test('Method goes to methods', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    created() {
                        console.log("OK");
                    }
                    myMethod(param1: string, p2, p3: any): void {
                        console.log("hey")
                    }
                }`,
        // Results
        `import { defineComponent } from '~/lib/helper/fallback-composition-api';

                export default defineComponent({
                    created() {
                        console.log("OK");
                    },
                    methods: {
                        myMethod(param1: string, p2, p3: any): void {
                            console.log("hey")
                        }
                    }
                })`,
      );
    });

    test('Method structure is preserved', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    myMethod(p1: MyType): number {
                        return 3;
                    }
                }`,
        // Results
        `import { defineComponent } from '~/lib/helper/fallback-composition-api';

                export default defineComponent({
                    methods: {
                        myMethod(p1: MyType): number {
                            return 3;
                        }
                    }
                })`,
      );
    });
  });

  describe('Class setter', () => {
    test('Class set becomes watch property', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    set params(p1: string): void {
                        this.$emit("change", p1);
                      }
                }`,
        // Results
        `import { defineComponent } from '~/lib/helper/fallback-composition-api';

                export default defineComponent({
                    watch: {
                        params: {
                            handler(p1: string): void {
                                this.$emit("change", p1);
                            }
                        }
                    }
                })`,
      );
    });
  });

  describe('Class getters & setters', () => {
    test('get & set becomes computed property', async () => {
      await expectMigration(
        `@Component
                export default class Test extends Vue {
                    get params(): string {
                        return "hello";
                    }
                    set params(p1: string): void {
                        this.$emit("change", p1);
                    }
                }`,
        // Results
        `import { defineComponent } from '~/lib/helper/fallback-composition-api';

                export default defineComponent({
                    computed: {
                        params: {
                            get(): string {
                                return "hello";
                            },
                            set(p1: string): void {
                                this.$emit("change", p1);
                            }
                        }
                    }
                })`,
      );
    });
  });

  describe('Class special methods with watch', () => {
    test('props, data, computed goes to top', async () => {
      await expectMigration(`@Component
export default class extends Vue {
  val = ''

  @Prop({ type: Object, required: true })
  member: Member
  
  get prefectures() {
    return PrefectureDefinitions
  }

  @Watch('prefecture')
  onChangePrefecture() {
    this.init()
  }

  created() {
    console.log('on created')
  }

  mounted() {
    this.init()
  }

  init() {
    this.val = this.value
  }

  change() {
    this.$emit('change')
  }
}`, `import { defineComponent } from '~/lib/helper/fallback-composition-api';

export default defineComponent({
  props: {
    member: { type: Object, required: true }
  },
  data() {
    return {
      val: ''
    };
  },
  computed: {
    prefectures() {
      return PrefectureDefinitions
    }
  },
  watch: {
    "prefecture": [{
      handler: "onChangePrefecture"
    }]
  },
  methods: {
    onChangePrefecture() {
      this.init()
    },
    init() {
      this.val = this.value
    },
    change() {
      this.$emit('change')
    }
  },
  created() {
    console.log('on created')
  },
  mounted() {
    this.init()
  }
})`);
    });
  });
});
