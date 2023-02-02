import { ObjectLiteralExpression, SyntaxKind } from "ts-morph";
import { MigratePartProps } from "./migrator";

// TODO Add support for @Component({data() ...})
export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  // Class properties go to the data property
  const classPropertyData = clazz.getProperties().filter((prop) => !prop.getDecorators().length);

  // Is there a method called data?
  let dataMethod = clazz.getMethod("data");
  let returnObject: ObjectLiteralExpression | undefined;

  if (dataMethod) {
    dataMethod = mainObject.addMethod({
      name: dataMethod.getName(),
      parameters: dataMethod.getParameters().map((p) => p.getStructure()),
      isAsync: dataMethod.isAsync(),
      returnType: dataMethod.getReturnTypeNode()?.getText(),
      statements: dataMethod.getBodyText(),
    });

    returnObject = dataMethod.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).pop();
  }

  if (classPropertyData.length) {
    if (!dataMethod) {
      dataMethod = mainObject.addMethod({
        name: "data",
      });
    }

    if (!returnObject) {
      dataMethod.addStatements("return {};");
      returnObject = dataMethod.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;
    } else {
      console.warn(
        `Warning: Mixing class properties with data() method might cause problems with the method return type. Class: ${clazz.getName()}`,
      );
    }

    for (const propertyData of classPropertyData) {
      const typeNode = propertyData.getTypeNode()?.getText();
      returnObject.addPropertyAssignment({
        name: propertyData.getName(),
        initializer: propertyData.getInitializer()?.getText() ?? "undefined",
        trailingTrivia: typeNode ? ` as ${typeNode}` : undefined,
      });
    }
  }
};
