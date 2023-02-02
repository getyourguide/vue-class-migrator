import { SyntaxKind } from "ts-morph";
import { getObjectProperty, MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const setters = clazz.getSetAccessors();

  // Setters become watched properties.
  if (setters.length) {
    const watcherMainObject = getObjectProperty(mainObject, "watch");
    for (const setter of setters) {
      setter.getParameters();

      const watcherObject = watcherMainObject
        .addPropertyAssignment({
          name: setter.getName(),
          initializer: "{}",
        })
        .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;

      watcherObject.addMethod({
        name: "handler",
        parameters: setter.getParameters().map((p) => p.getStructure()),
        returnType: setter.getReturnTypeNode()?.getText(),
        statements: setter.getBodyText(),
      });
    }
  }
};
