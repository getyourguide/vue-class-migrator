import { SyntaxKind, Node, ObjectLiteralExpression, PropertyDeclaration } from "ts-morph";
import { logger } from "./logger";
import { MigratePartProps } from "./migrator";
import { addPropertyObject, getObjectProperty } from "./utils";

const migrateProp = (params: {
  migratePartProps: MigratePartProps,
  decoratorName: string,
  propArgsIndex: number,
  getComponentPropName?: (componentProp: PropertyDeclaration) => string
}) => {
  const { clazz, mainObject, outFile } = params.migratePartProps;
  // Props
  const props = clazz.getProperties().filter((prop) => prop.getDecorator(params.decoratorName));

  if (props.length) {
    const propsObject = getObjectProperty(mainObject, "props");

    for (const componentProp of props) {
      const argument = componentProp.getDecorator(params.decoratorName)?.getArguments()[params.propArgsIndex];
      const componentPropName = params.getComponentPropName
        ? params.getComponentPropName(componentProp)
        : componentProp.getName();
      let propObject: ObjectLiteralExpression | undefined;
      let propertyType: string | undefined;

      if (argument) {
        if (![
          SyntaxKind.Identifier,
          SyntaxKind.ArrayLiteralExpression,
          SyntaxKind.ObjectLiteralExpression
        ].some(kind => argument.isKind(kind))) {
          throw new Error(`@${params.decoratorName} ${componentPropName} parameters not valid. Passed ${argument.getKind()}`)
        }

        if (argument.isKind(SyntaxKind.ObjectLiteralExpression)) {
          propObject = addPropertyObject(propsObject, componentPropName, argument.getText());
          propertyType = propObject.getProperty("type")?.getText()
        } else {
          propObject = addPropertyObject(propsObject, componentPropName);
          propertyType = argument.getText();
          propObject.addPropertyAssignment({
            name: 'type',
            initializer: propertyType,
          })
        }
      }

      if (!propObject) {
        propObject = addPropertyObject(propsObject, componentPropName);
      }

      // For primitive types we can make it pretier.
      if (!propertyType) {
        const propTypeNode = componentProp.getTypeNode();
        propertyType = propTypeNode?.getText() ?? '';
        const isArray = Node.isArrayTypeNode(propTypeNode);
        const isFunction = Node.isFunctionTypeNode(propTypeNode);
        const propertyConstructorMapping: Record<string, string> = {
          string: "String",
          boolean: "Boolean",
          number: "Number",
          any: "any",
        };
        const fallbackType = isArray
          ? "Array"
          : isFunction
            ? "Function"
            : "Object";

        if (propertyConstructorMapping[propertyType]) {
          propObject.addPropertyAssignment({
            name: "type",
            initializer:
              propertyConstructorMapping[propertyType],
          });
        } else {
          const vueImport = outFile
            .getImportDeclaration((imp) => imp.getModuleSpecifierValue() === "vue")
          if (!vueImport?.getNamedImports().some(namedImport => namedImport.getText() === "PropType")) {
            vueImport?.addNamedImport("PropType");
          }
          propObject.addPropertyAssignment({
            name: "type",
            initializer: `${fallbackType} as PropType<${propertyType}>`,
          });
        }
      } else {
        const tsPropertyType = componentProp.getTypeNode()?.getText();
        // Is there type collision? e.g. @Prop({type: Number}) myprop: string
        if (tsPropertyType && propertyType.toLowerCase() !== tsPropertyType.toLowerCase()) {
          logger.warn(`The @${params.decoratorName} type differs from the typescript type [${propertyType}, ${tsPropertyType}]`)
        }
      }
    }
  }
};

export default (migratePartProps: MigratePartProps) => {
  migrateProp({
    migratePartProps,
    decoratorName: "Prop",
    propArgsIndex: 0
  });
  migrateProp({
    migratePartProps,
    decoratorName: "PropSync",
    propArgsIndex: 1,
    getComponentPropName(componentProp) { return componentProp.getDecoratorOrThrow("PropSync").getArguments()[0].getFullText() }
  });
  migrateProp({
    migratePartProps,
    decoratorName: "Model",
    propArgsIndex: 1
  });
};
