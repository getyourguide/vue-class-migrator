import { getObjectProperty, MigratePartProps, supportedGetterOptions } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const getters = clazz.getGetAccessors();

  if (getters.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    for (const getter of getters) {
      computedObject.addMethod({
        name: getter.getName(),
        returnType: getter.getReturnTypeNode()?.getText(),
        statements: getter.getBodyText(),
      });
    }
  }

  // Vuex getters are computed properties

  const vuexGetters = clazz.getProperties().filter((prop) => prop.getDecorator("Getter"));

  if (vuexGetters.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    vuexGetters.forEach((vuexGetter) => {
      const decoratorArgs = vuexGetter.getDecorator("Getter")?.getArguments() || [];
      const getterMethodName = decoratorArgs[0].getText();
      const getterOptions = (decoratorArgs[1] as any)?.getProperties() || [];
      let namespace: string | undefined;

      getterOptions.forEach((prop: any) => {
        if (!supportedGetterOptions.includes(prop.getName())) {
          throw new Error(`@Getter option ${prop.getName()} not supported.`);
        }
        namespace = prop.getInitializerOrThrow().getText();
      });

      const propertyType = vuexGetter.getTypeNode()?.getText();
      const getterName = (
        namespace ? [namespace, getterMethodName].join("/") : getterMethodName
      ).replaceAll('"', "");
      computedObject!.addMethod({
        name: vuexGetter.getName(),
        returnType: propertyType,
        statements: `return this.$store.getters["${getterName}"];`,
      });
    });
  }
};
