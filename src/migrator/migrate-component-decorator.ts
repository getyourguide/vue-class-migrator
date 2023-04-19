import { ClassDeclaration, SyntaxKind } from "ts-morph";

export const getDefineComponentInit = (clazz: ClassDeclaration): string => {
  const decorator = clazz.getDecorator("Component");
  if (!decorator) {
    throw new Error(`Class ${clazz.getName()} doesn't have a component decorator.`);
  }
  const componentProperties = decorator
    .getArguments()
    .pop()
    ?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression, "@Component props argument should be and object {}");

  const dataProp = componentProperties?.getProperty("data");
  if (dataProp
    && ![
      SyntaxKind.MethodDeclaration,
      SyntaxKind.PropertyAssignment
    ].some(kind => dataProp.isKind(kind))) {
    throw new Error(`@Component Data prop should be an object or a method. Type: ${dataProp.getKindName()}`)
  }
  return componentProperties?.getText() ?? '{}';
};
