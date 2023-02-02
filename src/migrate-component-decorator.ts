import { SyntaxKind } from "ts-morph";
import { MigratePartProps, supportedComponentProps } from "./migrator";

// Adds the content from @Component({...})
export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;

  const decorator = clazz.getDecorator("Component")!;
  if (!decorator) {
    console.error(`Class ${clazz.getName()} doesn't have a component decorator.`);
    return;
  }
  const componentProperties = decorator
    .getArguments()
    .pop()
    ?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
    .getProperties() || [];


  componentProperties.forEach((prop) => {

    if (prop.isKind(SyntaxKind.PropertyAssignment)) {
      const propName = prop.getName();
      if (supportedComponentProps.includes(propName)) {
        if (prop.getInitializer()) {
          mainObject.addPropertyAssignment({
            name: propName,
            initializer: prop.getInitializer().getText(),
          });
        } else {
          mainObject.addShorthandPropertyAssignment({
            name: propName,
          });
        }
      } else {
        throw new Error(`Property on @Component "${propName}" not supported.`);
      }
    } else if (prop.isKind(SyntaxKind.MethodDeclaration)) {
      const propName = prop.getName();
      if (supportedComponentProps.includes(propName)) {
        mainObject.addMethod({
          name: prop.getName(),
          parameters: prop.getParameters().map((p) => p.getStructure()),
          isAsync: prop.isAsync(),
          returnType: prop.getReturnTypeNode()?.getText(),
          statements: prop.getBodyText(),
        });
      } else {
        throw new Error(`Method on @Component "${propName}" not supported.`);
      }
    } else {
      throw new Error(`Property on @Component "${prop.getKindName()}" not supported.`)
    }
  });
};
