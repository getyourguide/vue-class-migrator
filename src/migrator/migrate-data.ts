import {
  MethodDeclaration,
  ObjectLiteralExpression,
  SyntaxKind,
  VariableDeclarationKind
} from "ts-morph";
import { MigratePartProps } from "./migrator";

export const getDataMethod = (migratePartProps: MigratePartProps): {
  dataMethod: MethodDeclaration,
  returnObject: ObjectLiteralExpression
} => {
  const { mainObject, clazz } = migratePartProps;
  const componentDecoratorDataMethod = mainObject.getProperty("data");
  const clazzDataMethod = clazz.getMethod("data");

  if (clazzDataMethod) {
    // From class data method
    const dataMethod = mainObject.addMethod({
      name: 'data',
      parameters: clazzDataMethod.getParameters().map((p) => p.getStructure()),
      isAsync: clazzDataMethod.isAsync(),
      returnType: clazzDataMethod.getReturnTypeNode()?.getText(),
      statements: clazzDataMethod.getBodyText(),
    });

    const returnObject = dataMethod
      .getStatementByKind(SyntaxKind.ReturnStatement)
      ?.getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression)
      ?? dataMethod
        .addStatements("return {};")[0]
        .getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    return {
      dataMethod,
      returnObject
    };
  }
  // From @Compont data property method
  if (componentDecoratorDataMethod) {
    if (componentDecoratorDataMethod.isKind(SyntaxKind.MethodDeclaration)) {
      // MethodDeclaration // data() {}
      const returnObject = componentDecoratorDataMethod
        .getStatementByKind(SyntaxKind.ReturnStatement)
        ?.getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression)
        ?? componentDecoratorDataMethod
          .addStatements("return {};")[0]
          .getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      return {
        dataMethod: componentDecoratorDataMethod,
        returnObject
      };
    }

    if (componentDecoratorDataMethod.isKind(SyntaxKind.PropertyAssignment)) {
      // PropertyAssignment // data: () => {} | data: function() {}
      const initializer = componentDecoratorDataMethod.getInitializerOrThrow("Explicit data property initializer required");
      if (initializer.isKind(SyntaxKind.ArrowFunction) || initializer.isKind(SyntaxKind.FunctionDeclaration)) {
        const dataMethod = mainObject.addMethod({
          name: 'data',
          parameters: initializer.getParameters().map((p) => p.getStructure()),
          isAsync: initializer.isAsync(),
          returnType: initializer.getReturnTypeNode()?.getText(),
          statements: initializer.getBodyText(),
        });
        componentDecoratorDataMethod.remove();
        const returnObject = initializer
          .getStatementByKind(SyntaxKind.ReturnStatement)
          ?.getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression)
          ?? initializer
            .addStatements("return {};")[0]
            .getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);

        return {
          dataMethod,
          returnObject
        };
      }
      throw new Error(`data property type not supported ${initializer.getType().getText()}`)
    }
  }

  const dataMethod = mainObject.addMethod({
    name: "data"
  });
  const returnObject = dataMethod.addStatements("return {};")[0]
    .getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  return {
    dataMethod,
    returnObject
  }
}

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const classPropertyData = clazz.getProperties().filter((prop) => !prop.getDecorators().length);
  const componentDecoratorDataMethod = mainObject.getProperty("data");
  const clazzDataMethod = clazz.getMethod("data");
  if (clazzDataMethod && componentDecoratorDataMethod) {
    throw new Error("Having a class with the data() method and the @Component({data(): ...} at the same time is not supported.")
  }

  // Class properties go to the data property
  if (classPropertyData.length || clazzDataMethod) {
    const { dataMethod, returnObject } = getDataMethod(migratePartProps);

    for (const propertyData of classPropertyData) {
      const typeNode = propertyData.getTypeNode()?.getText();
      if (typeNode) {
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

