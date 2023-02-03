import { SyntaxKind, ObjectLiteralExpression } from "ts-morph";
import { getObjectProperty, MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const setters = clazz.getSetAccessors();

  // Setters become watched properties.
  if (setters.length) {
    let watcherMainObject: ObjectLiteralExpression | undefined;
    for (const setter of setters) {

      const setterName = setter.getName();

      if (clazz.getGetAccessor(setterName)) {
        const computedMainObject = getObjectProperty(mainObject, "computed");
        let propObject: ObjectLiteralExpression;
        if (!computedMainObject.getProperty(setterName)) {
          propObject = computedMainObject.addPropertyAssignment({
            name: setterName,
            initializer: '{}'
          }).getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
        } else {
          propObject = computedMainObject.getProperty(setterName)
            .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);


          propObject.addMethod({
            name: 'set',
            parameters: setter.getParameters().map((p) => p.getStructure()),
            returnType: setter.getReturnTypeNode()?.getText(),
            statements: setter.getBodyText(),
          })
        }


      } else {
        if (!watcherMainObject) {
          watcherMainObject= getObjectProperty(mainObject, "watch");
        }
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
  }
};
