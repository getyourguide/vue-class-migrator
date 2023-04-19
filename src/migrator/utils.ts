import {
  SyntaxKind,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
} from "ts-morph";

export const addPropertyObject = (mainObject: ObjectLiteralExpression, propName: string, initializer = '{}'): ObjectLiteralExpression => {
  return mainObject
    .addPropertyAssignment({
      name: propName,
      initializer,
    })
    .getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);
}

export const addPropertyArray = (mainObject: ObjectLiteralExpression, propName: string, initializer = '[]'): ArrayLiteralExpression => {
  return mainObject
    .addPropertyAssignment({
      name: propName,
      initializer,
    })
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);
}

export const getObjectProperty = (
  mainObject: ObjectLiteralExpression,
  property: string,
): ObjectLiteralExpression => {
  const computedObject = mainObject
    .getProperty(property)
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
  if (computedObject) {
    return computedObject;
  }

  return addPropertyObject(mainObject, property);
};

export const getArrayProperty = (
  mainObject: ObjectLiteralExpression,
  property: string,
): ArrayLiteralExpression => {
  const computedObject = mainObject
    .getProperty(property)
    ?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
  if (computedObject) {
    return computedObject;
  }

  return addPropertyArray(mainObject, property);
};
