import { SyntaxKind } from "ts-morph";
import { MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const classExtend = clazz.getExtends()?.getText();

  // Class extend
  if (classExtend && classExtend !== "Vue") {
    if (mainObject.getProperty("extends")) {
      throw new Error(
        "This component is using extends and extending from a different class, this is not supported.",
      );
    }

    const mixinsCallExpression = clazz.getExtends()?.getFirstDescendantByKind(SyntaxKind.CallExpression);
    if (mixinsCallExpression) {

      if (mainObject.getProperty("mixins")) {
        throw new Error("Class extending from mixins() and mixins already present. This is not supported yet.");
      }
      const mixins = mixinsCallExpression.getArguments().map(arg => arg.getText());
      mainObject.addPropertyAssignment({
        name: "mixins",
        initializer: `[${mixins.join(", ")}]`
      })

    } else {
      mainObject.addPropertyAssignment({
        name: "extends",
        initializer: classExtend,
      });
    }

  }
};
