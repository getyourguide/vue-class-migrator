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

      argument.getProperties().map((prop: any) => {
        const propName = prop.getName();
        if (supportedPropDecoratorProps.includes(propName)) {
          propObject.addPropertyAssignment({
            name: propName,
            initializer: prop.getInitializerOrThrow().getText(),
          });
        } else {
          throw new Error(`Property "${propName}" not supported.`);
        }
      });

      // For primitive types we can make it pretier.
      const propertyType = componentProp.getType().getText();
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
    }
  }
};
