

## Migrator CLI Tool

This utility will help migrate vue and typescript files that use the decorator `@component` from `vue-class-components`. Behind the scenes, we use `ts-morpth` for parsing and generating files.

### Hot to use the tool

Accepted options
- -d: Directory that you want to migrate, relative to this package.
- --sfc: (Optional flag, default: false) Removes original ts and scss files and generates a final vue SFC.

```
npm install
npm run migrate -- -d <your_path>
```

### Considerations

Generated SFC styles are always `scoped`. Feel free to PR and change this.
The tool will also migrate decorators from `vuex-class`.

In most cases, the tool will output errors if it finds something in the class code that is not supported. Keep an eye on the output and double check that the generated file is correct. In this case, you can contribute to the migrator and add support for it or fix the file manually.


## Migration workflow recommendation

Don't use `--sfc` since the beginning, first run the tool without it and compare the changes on the ts files with your source control, if you are happy with the changes discard all the changes and run it again with `--sfc`.


## Compatibility note

In addition to migrating the class to the defineComponent format, vue-migrator also migrates the following libraries out of the box.

### vuex-class

|Decorator|Support|
|---|---|
|@State|❌ Not yet|
|@Getter|✅|
|@Action|✅|
|@Mutation|✅|


### vue-property-decorator

|Decorator|Support|
|---|---|
|@Prop|✅|
|@PropSync|✅|
|@Model|✅|
|@ModelSync|❌ Not yet|
|@Watch|✅|
|@Provide|❌ Not yet|
|@Inject|❌ Not yet|
|@ProvideReactive|❌ Not yet|
|@InjectReactive|❌ Not yet|
|@Emit|❌ Not yet|
|@Ref|✅|
|@VModel|❌ Not yet|
|@Component|✅|
|@Mixins|✅|

