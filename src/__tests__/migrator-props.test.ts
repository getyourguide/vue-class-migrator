import { project, expectMigration } from "./utils";

describe("Component props", () => {
    afterAll(() => {
        project.getSourceFiles().forEach(file => file.deleteImmediatelySync());
    })

    test('Short hand assignment', async () => {
        await expectMigration(
            `const props = {
                test: 1
            };
            
            @Component({
                props
            })
            export default class Test extends Vue {}`,

            // Result
            `import { defineComponent } from "vue";

            const props = {
                test: 1
            };

            export default defineComponent({
                props
            })`
        )
    });

    test('@Component props become properties', async () => {
        await expectMigration(
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
            export default class Test extends Vue {}`,

            // Result
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
        )
    });

    test('Empty @Component props are ignored', async () => {
        await expectMigration(
            `@Component({
                name: "test",
                props: {}
            })
            export default class Test extends Vue {}`,
            // Result
            `import { defineComponent } from "vue";

            export default defineComponent({
                name: "test",
                props: {}
            })`
        );
    });

    describe("@Prop decorator", () => {

        test('@Prop become props', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Prop
                    checkId: MyCheckId;
                    
                }`,
                // Result
                `import { defineComponent, PropType } from "vue";

                export default defineComponent({
                    props: {
                        checkId: {
                            type: Object as PropType<MyCheckId>
                        }
                    }
                })`
            );
        });

        test('Class @Prop with method assignment become properties', async () => {

            await expectMigration(
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
                }`,
                // Result
                `import { defineComponent } from "vue";

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
                            },
                        }
                    }
                })`
            );
        });

        test('@Component props & @Prop don\'t clash', async () => {
            await expectMigration(
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
                }`,
                // Result
                `import { defineComponent } from "vue";
    
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
            );
        });

        test('@Prop array becomes prop with Array type', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Prop
                    checkId: MyCheckId[];
                    
                }`,
                // Result
                `import { defineComponent, PropType } from "vue";
    
                export default defineComponent({
                    props: {
                        checkId: {
                            type: Array as PropType<MyCheckId[]>
                        }
                    }
                })`
            );
        });

        test('@Prop with default become props', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Prop({ default: 3 })
                    checkId: MyCheckId;
                }`,
                // Result
                `import { defineComponent, PropType } from "vue";

                export default defineComponent({
                    props: {
                        checkId: { default: 3,
                            type: Object as PropType<MyCheckId>
                        }
                    }
                })`
            );
        });

        test('@Prop general test', async () => {
            await expectMigration(
                `import { Vue, Component, Prop } from 'vue-property-decorator'

                @Component
                export default class YourComponent extends Vue {
                  @Prop(Number) readonly propA: number | undefined
                  @Prop({ default: 'default value' }) readonly propB!: string
                  @Prop([String, Boolean]) readonly propC: string | boolean | undefined
                }`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    props: {
                        propA: {
                            type: Number
                        },
                        propB: { default: 'default value',
                            type: String
                        },
                        propC: {
                            type: [String, Boolean]
                        }
                    }
                })`
            );
        });

        test('@Prop type collision with typescript prop assigns the @Prop type', async () => {

            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Prop({ type: String })
                    checkId: MyCheckId;
                }`,
                // Results
                `import { defineComponent } from "vue";

                export default defineComponent({
                    props: {
                        checkId: { type: String }
                    }
                })`
            );
        });

        test('@Prop type collision with typescript prop of same type passes', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Prop({ type: String })
                    checkId: string;
                }`,
                // Result
                `import { defineComponent } from "vue";
    
                export default defineComponent({
                    props: {
                        checkId: { type: String }
                    }
                })`
            );
        });

        test('@Prop with type and no typescript type passes', async () => {
            await expectMigration(
                `@Component
                export default class Test extends Vue {
                    @Prop({ type: String })
                    checkId;
                }`,
                // Result
                `import { defineComponent } from "vue";
    
                export default defineComponent({
                    props: {
                        checkId: { type: String }
                    }
                })`
            );
        });
    });

    describe("@PropSync decorator", () => {

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
                        'name': {
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
                })`
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
                        'name': {
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
                })`
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
                        'name': {
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
                })`
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
                        'name': { type: String }
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
                })`
            );
        });
    });

    describe("@Model decorator", () => {

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
                })`
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
                })`
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
                })`
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
                })`
            );
        });
    });
    
});