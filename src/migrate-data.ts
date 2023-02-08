import {
  MethodDeclaration,
  ObjectLiteralExpression,
  SyntaxKind,
  VariableDeclarationKind
} from "ts-morph";
import { MigratePartProps } from "./migrator";

// TODO Add support for @Component({data() ...})
export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  // Class properties go to the data property
  const classPropertyData = clazz.getProperties().filter((prop) => !prop.getDecorators().length);
  const clazzDataMethod = clazz.getMethod("data");
  const componentDecoratorDataMethod = mainObject.getProperty("data");

  if (clazzDataMethod && componentDecoratorDataMethod) {
    throw new Error("Having a class with the data() method and the @Component({data(): ...} at the same time is not supported.")
  }

  let dataMethod: MethodDeclaration | undefined;
  let returnObject: ObjectLiteralExpression | undefined;

  if (clazzDataMethod) {
    dataMethod = mainObject.addMethod({
      name: clazzDataMethod.getName(),
      parameters: clazzDataMethod.getParameters().map((p) => p.getStructure()),
      isAsync: clazzDataMethod.isAsync(),
      returnType: clazzDataMethod.getReturnTypeNode()?.getText(),
      statements: clazzDataMethod.getBodyText(),
    });
    returnObject = dataMethod.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).pop();
  } else if (componentDecoratorDataMethod) {
    dataMethod = componentDecoratorDataMethod.asKindOrThrow(SyntaxKind.MethodDeclaration);
    const returnStatements = dataMethod.getDescendantsOfKind(SyntaxKind.ReturnStatement);
    if (returnStatements.length !== 1) {
      throw new Error("The data() function must have only one return statement;")
    }
    returnObject = returnStatements
      .pop()
      .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
  }

  if (classPropertyData.length) {
    if (!dataMethod) {
      dataMethod = mainObject.addMethod({
        name: "data",
      });
    }

    if (!returnObject) {
      const statement = dataMethod.addStatements("return {};")[0];
      returnObject = statement.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;
    } else {
      console.warn(
        `Warning: Mixing class properties with data() method might cause problems with the method return type. Class: ${clazz.getName()}`,
      );
    }

    for (const propertyData of classPropertyData) {
      const typeNode = propertyData.getTypeNode()?.getText();
      if(typeNode) {
        dataMethod.insertVariableStatement(0, {
          declarationKind: VariableDeclarationKind.Const,
          declarations: [{
            name: propertyData.getName(),
            type: typeNode,
            initializer: propertyData.getInitializer()?.getText() ?? "undefined"
          }]
        });
        returnObject.addShorthandPropertyAssignment({
          name: propertyData.getName(),
        });
      } else {
        returnObject.addPropertyAssignment({
          name: propertyData.getName(),
          initializer: propertyData.getInitializer()?.getText() ?? "undefined",
        });
      }
    }
  }
};

