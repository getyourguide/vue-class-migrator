
![CI](https://github.com/getyourguide/vue-class-migrator/workflows/CI/badge.svg)

![npm](https://img.shields.io/npm/v/vue-class-migrator)
![npm](https://img.shields.io/npm/dm/vue-class-migrator)


## Migrator CLI Tool

Vue Class Migrator is a utility designed to facilitate the migration of Vue and TypeScript files using the `@component` decorator from `vue-class-components` to the `defineComponent` format. Under the hood, it employs `ts-morph` for parsing and generating files.

### Installation

You can install vue-class-migrator globally using npm:

```sh
npm install -g vue-class-migrator
```

### Hot to use the tool

Accepted options
- -d: Specifies the directory you want to migrate.
- --sfc: (Optional flag, default: false) Removes original TS and style files, generating a final Vue Single File Component (SFC).

```
npm run migrate -- -d <your_path>
```

### Considerations

The tool also migrates decorators from vuex-class and vue-property-decorator.

If the tool encounters unsupported code in your class, it will produce errors. Monitor the output and verify the generated file. In such cases, you can contribute to the migrator to add support or correct the file manually.


## Migration workflow recommendation

Initially, avoid using --sfc directly. 

First, run the tool without it and compare the changes in the TS files using version control. If satisfied, discard the changes and rerun with --sfc.


## Compatibility note

In addition to migrating the class to the defineComponent format, vue-class-migrator also migrates the following libraries out of the box.

### vuex-class

|Decorator|Support|
|---|---|
|@State|❌ Not yet|
|@Getter|✅|
|@namespace.Getter|❌ Not yet|
|@Action|✅|
|@Mutation|✅|


### vue-property-decorator

|Decorator|Support|
|---|---|
|@Prop|✅|
|@PropSync|✅|
|@Model|✅|
|@ModelSync|✅|
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

## Security

For security matters please contact [security@getyourguide.com](mailto:security@getyourguide.com).

## Legal

Copyright 2023 GetYourGuide GmbH.

vue-class-migrator is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text.