import { SyntaxKind } from "ts-morph";
import { getObjectProperty, MigratePartProps, supportedPropDecoratorProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject, outFile } = migratePartProps;
  // Props
  const props = clazz.getProperties().filter((prop) => prop.getDecorator("Prop"));

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

      const argument =
        componentProp.getDecorator("Prop")?.getArguments()[0] ||
        ({ getProperties: () => [] } as any);

      let propertyType: string | undefined
      argument.getProperties().map((prop: any) => {
        const propName = prop.getName();
        if (supportedPropDecoratorProps.includes(propName)) {
          propObject.addPropertyAssignment({
            name: propName,
            initializer: prop.getInitializerOrThrow().getText(),
          });

          if (propName === "type") {
            propertyType = prop.getInitializer().getText()
          }
        } else {
          throw new Error(`Property "${propName}" not supported.`);
        }
      });

      // For primitive types we can make it pretier.
      if (!propertyType) {
        propertyType = componentProp.getTypeNode().getText();
        const propertyConstructorMapping: Record<string, string> = {
          string: "String",
          boolean: "Boolean",
          number: "Number",
          any: "any",
        };
        propObject.addPropertyAssignment({
          name: "type",
          initializer:
            propertyConstructorMapping[propertyType] ?? `Object as PropType<${propertyType}>`,
        });
      } else {
        const tsPropertyType = componentProp.getTypeNode()?.getText();
        // Is there type collision? e.g. @Prop({type: Number}) myprop: string
        if (tsPropertyType && propertyType.toLowerCase() !== tsPropertyType.toLowerCase()) {
          throw new Error(`The @Prop type differs from the typescript type [${propertyType}, ${tsPropertyType}]`)
        }
      }
    }
  }
};
