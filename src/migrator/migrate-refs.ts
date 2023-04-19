import { MigratePartProps } from "./migrator";
import { addPropertyObject, getObjectProperty } from "./utils";


export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const references = clazz.getProperties().filter((prop) => prop.getDecorator("Ref"));

  if (references.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    for (const reference of references) {
      const refNameArg = reference.getDecorator("Ref")?.getArguments()[0]?.getText();
      const refType = reference.getTypeNode()?.getText();

      const propObject = addPropertyObject(computedObject, reference.getName());
      propObject.addPropertyAssignment({
        name: 'cache',
        initializer: 'false'
      });

      const refStatement = refNameArg
        ? `this.$refs[${refNameArg}]`
        : `this.$refs.${reference.getName()}`;

      propObject.addMethod({
        name: 'get',
        statements: `return ${refStatement}${refType ? ` as ${refType}`: ''};`
      });
    }
  }
};
