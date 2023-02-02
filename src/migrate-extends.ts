import { MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;

  const classExtend = clazz.getExtends()?.getText();

  // Class extend
  if (classExtend && classExtend !== "Vue") {
    if (mainObject.getProperty("extends")) {
      throw new Object(
        "This component is using mixins and extending from a different class, this is not supported.",
      );
    }

    mainObject.addPropertyAssignment({
      name: "extends",
      initializer: classExtend,
    });
  }
};
