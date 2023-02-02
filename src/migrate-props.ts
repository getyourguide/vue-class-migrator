import { SyntaxKind } from "ts-morph";
import { MigratePartProps, supportedPropDecoratorProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject, outFile } = migratePartProps;
  // Props
  const props = clazz.getProperties().filter((prop) => prop.getDecorator("Prop"));

  if (props.length) {
    const propsObject = mainObject
      .addPropertyAssignment({
        name: "props",
        initializer: "{}",
      })
      .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;

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
        componentProp.getDecorator("prop")?.getArguments()[0] ||
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
      };
      propObject.addPropertyAssignment({
        name: "type",
        initializer:
          propertyConstructorMapping[propertyType] ?? `Object as PropType<${propertyType}>`,
      });
    }
  }
};
