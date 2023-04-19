import { SyntaxKind } from "ts-morph";
import { MigratePartProps } from "./migrator";
import { addPropertyObject, getObjectProperty } from "./utils";

const supportedGetterOptions = ["namespace"]; // @Getter("", {...})

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const getters = clazz.getGetAccessors();

  if (getters.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    for (const getter of getters) {
      const getterName = getter.getName();

      if (clazz.getSetAccessor(getterName)) {
        const propObject = addPropertyObject(computedObject, getterName);

        propObject?.addMethod({
          name: 'get',
          returnType: getter.getReturnTypeNode()?.getText(),
          statements: getter.getBodyText(),
        })

      } else {
        computedObject.addMethod({
          name: getterName,
          returnType: getter.getReturnTypeNode()?.getText(),
          statements: getter.getBodyText(),
        });
      }

    }
  }

  // Vuex getters are computed properties

  const vuexGetters = clazz.getProperties().filter((prop) => prop.getDecorator("Getter"));

  if (vuexGetters.length) {
    const computedObject = getObjectProperty(mainObject, "computed");

    vuexGetters.forEach((vuexGetter) => {
      const decoratorArgs = vuexGetter.getDecoratorOrThrow("Getter").getArguments();
      const getterMethodName = decoratorArgs[0]?.getText().slice(1, -1) ?? vuexGetter.getName();
      const getterOptions = decoratorArgs[1]?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const namespace = getterOptions?.getProperty("namespace")
        ?.asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow()
        .getText()
        .slice(1, -1);

      getterOptions?.getProperties().forEach((prop) => {
        if (prop.isKind(SyntaxKind.PropertyAssignment) && !supportedGetterOptions.includes(prop.getName())) {
          throw new Error(`@Getter option ${prop.getName()} not supported.`);
        }
      });

      const propertyType = vuexGetter.getTypeNode()?.getText();
      const getterName = (
        namespace ? [namespace, getterMethodName].join("/") : getterMethodName
      );
      computedObject.addMethod({
        name: vuexGetter.getName(),
        returnType: propertyType,
        statements: `return this.$store.getters["${getterName}"];`,
      });
    });
  }
};
