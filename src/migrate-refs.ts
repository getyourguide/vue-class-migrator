import { getObjectProperty, MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  // @Ref
  const references = clazz.getProperties().filter((prop) => prop.getDecorator("Ref"));

  if (references.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    for (const reference of references) {
      const decoratorArgs = reference.getDecorator("Ref")?.getArguments() || [];
      const refName = decoratorArgs[0]?.getText().replace(/"/g, "") ?? reference.getName();

      computedObject.addMethod({
        name: reference.getName(),
        returnType: reference.getTypeNode()?.getText(),
        statements: `return this.$refs.${refName};`
      });
    }
  }
};
