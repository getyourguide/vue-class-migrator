import { addPropertyObject, getObjectProperty } from "./utils";
import { MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  // @PropSync
  const propSyncs = clazz.getProperties().filter((prop) => prop.getDecorator("PropSync"));

  if (propSyncs.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    for (const propSync of propSyncs) {
      const propName = propSync.getDecoratorOrThrow("PropSync").getArguments()[0]
        .getText()
        .slice(1, -1); // Removes the string opening and closing
      const computedPropName = propSync.getName();

      const syncPropObject = addPropertyObject(computedObject, computedPropName);
      syncPropObject.addMethod({
        name: 'get',
        statements: `return this.${propName};`,
        returnType: propSync.getTypeNode()?.getText()
      });
      syncPropObject.addMethod({
        name: 'set',
        parameters: [{
          name: 'value',
          type: propSync.getTypeNode()?.getText()
        }],
        statements: `this.$emit('update:${propName}', value);`,
      });
    }
  }
};
