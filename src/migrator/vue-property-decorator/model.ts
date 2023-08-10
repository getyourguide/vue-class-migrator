import { Node } from 'ts-morph';
import { extractPropertiesWithDecorator, stringNodeToSTring } from '../utils';
import type MigrationManager from '../migratorManager';

// @Model
export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const models = extractPropertiesWithDecorator(clazz, 'Model');

  models.forEach((model) => {
    const decoratorArgs = model.getDecoratorOrThrow('Model').getArguments();
    const propName = model.getName();
    const eventName = stringNodeToSTring(decoratorArgs[0]);
    const propOptions: Node | undefined = decoratorArgs[1];
    const propTsType = model.getTypeNode();
    migrationManager.addModel({
      eventName,
      propName,
    });
    migrationManager.addProp({
      propName,
      propNode: propOptions,
      tsType: propTsType,
    });
  });
};
