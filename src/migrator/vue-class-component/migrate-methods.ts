import { ClassDeclaration, MethodDeclaration, ObjectLiteralExpression } from 'ts-morph';
import { getObjectProperty } from '../utils';
import { vueSpecialMethods } from '../config';

/**
 * Add Vue special methods to the main object
 */
function appendVueSpecialMethods(
  classDeclaration: ClassDeclaration,
  mainObject: ObjectLiteralExpression,
): void {
  vueSpecialMethods
    .filter((m) => classDeclaration.getMethod(m))
    .forEach((m) => {
      const method = classDeclaration.getMethodOrThrow(m);
      const typeNode = method.getReturnTypeNode()?.getText();
      mainObject.addMethod({
        name: method.getName(),
        isAsync: method.isAsync(),
        returnType: typeNode,
        statements: method.getBodyText(),
      });
    });
}

/**
 * Append methods to main object except Vue special methods
 */
function appendMethods(methods: MethodDeclaration[], mainObject: ObjectLiteralExpression): void {
  const methodsObject = getObjectProperty(mainObject, 'methods');

  methods.forEach((method) => {
    if (method.getDecorators().length) {
      throw new Error(`The method ${method.getName()} has non supported decorators.`);
    }

    const typeNode = method.getReturnTypeNode()?.getText();
    methodsObject.addMethod({
      name: method.getName(),
      parameters: method.getParameters().map((p) => p.getStructure()),
      isAsync: method.isAsync(),
      returnType: typeNode,
      statements: method.getBodyText(),
    });
  });
}

export default (clazz: ClassDeclaration, mainObject: ObjectLiteralExpression) => {
  appendVueSpecialMethods(clazz, mainObject);

  const methods = clazz
    .getMethods()
    .filter(
      (m) => !vueSpecialMethods.includes(m.getName())
        && !['data'].includes(m.getName())
        && !m.getDecorator('Watch'),
    );

  if (!methods.length) {
    return;
  }

  appendMethods(methods, mainObject);
};
