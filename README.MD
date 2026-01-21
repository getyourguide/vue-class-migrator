
![CI](https://github.com/getyourguide/vue-class-migrator/workflows/CI/badge.svg)

![npm](https://img.shields.io/npm/v/vue-class-migrator)
![npm](https://img.shields.io/npm/dm/vue-class-migrator)

# ⚠️ Status: Archived & No Longer Maintained

**As of 2024, this repository is archived and read-only.** 

With Vue 2 reaching End of Life (EOL) and the rise of powerful AI coding assistants, we are no longer actively maintaining this tool.

### Should I still use this?

**Yes**, but as a **"First Pass"** tool.

While AI (Cursor, Copilot, ChatGPT) is excellent at fixing logic and types, it can be slow and expensive for bulk syntax conversion across hundreds of files. This tool remains the most efficient way to handle the deterministic "heavy lifting" of converting Class syntax to Composition API.

### Recommended Migration Workflow (2024+)

1.  **Bulk Convert:** Run `vue-class-migrator` on your codebase to instantly transform the syntax structure (Decorators, Data, Methods -> `defineComponent`/`setup`).
2.  **AI Refinement:** Use AI tools to handle the "last mile":
    *   Fixing TypeScript errors.
    *   Refactoring complex logic inside `setup()`.
    *   Migrating obscure edge cases this tool might miss.

---

*(The original documentation follows below)*


## Vue Class Migrator CLI

Vue Class Migrator is a utility designed to facilitate the migration of Vue and TypeScript files using the `@component` decorator from `vue-class-components` to the `defineComponent` format. Under the hood, it employs `ts-morph` for parsing and generating files.

### Installation

You can install vue-class-migrator globally using npm:

```sh
npm install -g vue-class-migrator
```

### How to use the tool

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