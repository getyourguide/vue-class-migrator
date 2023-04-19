import { getObjectProperty } from "./utils";
import { MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  // @Model
  const models = clazz.getProperties().filter((prop) => prop.getDecorator("Model"));

  if (models.length) {
    const modelObject = getObjectProperty(mainObject, "model");

    for (const model of models) {
      const decoratorArgs = model.getDecorator("Model")?.getArguments() || [];
      const eventName = decoratorArgs[0]?.getText().replace(/"/g, "").replace(/'/g, "");

      modelObject.addPropertyAssignment({
        name: "prop",
        initializer: `"${model.getName()}"`,
      });
      modelObject.addPropertyAssignment({
        name: "event",
        initializer: `"${eventName}"`,
      });
    }
  }
};
