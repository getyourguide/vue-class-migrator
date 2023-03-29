import { SyntaxKind, Node } from "ts-morph";
import { getObjectProperty, MigratePartProps, supportedPropDecoratorProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject, outFile } = migratePartProps;
  // Props
  const props = clazz.getProperties().filter((prop) => prop.getDecorator("Prop") || prop.getDecorator("Model"));

  if (props.length) {

    const propsObject = getObjectProperty(mainObject, "props");

    outFile
      .getImportDeclaration((imp) => imp.getModuleSpecifierValue() === "vue")
      ?.addNamedImport("PropType");
    for (const componentProp of props) {
      const propObject = propsObject
        .addPropertyAssignment({
          name: componentProp.getName(),
          initializer: "{}",
        })
        .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;

      const argument = componentProp.getDecorator("Prop")?.getArguments()[0] ?? componentProp.getDecorator("Model")?.getArguments()[1];
      let propertyType: string | undefined;
      if (argument) {
        argument.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
          .getProperties()
          .map((prop) => {
            if (prop.isKind(SyntaxKind.PropertyAssignment)) {
              const propName = prop.getName();
              if (supportedPropDecoratorProps.includes(propName)) {
                propObject.addPropertyAssignment({
                  name: propName,
                  initializer: prop.getInitializer()?.getText(),
                });

                if (propName === "type") {
                  propertyType = prop.getInitializer().getText()
                }
              } else {
                throw new Error(`Property "${propName}" not supported.`);
              }
            } else if (prop.isKind(SyntaxKind.MethodDeclaration)) {
              // Method declaration
              const propName = prop.getName();
              if (supportedPropDecoratorProps.includes(propName)) {
                propObject.addMethod({
                  name: propName,
                  parameters: prop.getParameters().map((p) => p.getStructure()),
                  isAsync: prop.isAsync(),
                  returnType: prop.getReturnTypeNode()?.getText(),
                  statements: prop.getBodyText(),
                });
              } else {
                throw new Error(`Property "${propName}" not supported.`);
              }
            } else {
              throw new Error(`Property "${(prop as any).getName ? (prop as any).getName() : ''}" has a non supported assignment.`);
            }
          });
      }

      // For primitive types we can make it pretier.
      if (!propertyType) {
        const propTypeNode = componentProp.getTypeNode();
        propertyType = propTypeNode.getText();
        const isArray = Node.isArrayTypeNode(propTypeNode);
        const propertyConstructorMapping: Record<string, string> = {
          string: "String",
          boolean: "Boolean",
          number: "Number",
          any: "any",
        };
        const fallbackType = isArray ? "Array" : "Object";
        propObject.addPropertyAssignment({
          name: "type",
          initializer:
            propertyConstructorMapping[propertyType] ?? `${fallbackType} as PropType<${propertyType}>`,
        });
      } else {
        const tsPropertyType = componentProp.getTypeNode()?.getText();
        // Is there type collision? e.g. @Prop({type: Number}) myprop: string
        if (tsPropertyType && propertyType.toLowerCase() !== tsPropertyType.toLowerCase()) {
          console.warn(`The @Prop type differs from the typescript type [${propertyType}, ${tsPropertyType}]`)
        }
      }
    }
  }
};
