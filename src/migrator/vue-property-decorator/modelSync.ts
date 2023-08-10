import { Node } from 'ts-morph';
import { extractPropertiesWithDecorator, stringNodeToSTring } from '../utils';
import type MigrationManager from '../migratorManager';

// @ModelSync
export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const modelSyncs = extractPropertiesWithDecorator(clazz, 'ModelSync');

  if (modelSyncs.length > 1) {
    throw new Error('Only one @ModelSync allowed.');
  }

  modelSyncs.forEach((modelSync) => {
    const decoratorArgs = modelSync.getDecoratorOrThrow('ModelSync').getArguments();
    if (!decoratorArgs.length) {
      throw new Error('@ModelSync without arguments not supported');
    }
    const propName = stringNodeToSTring(decoratorArgs[0]);
    const eventName = stringNodeToSTring(decoratorArgs[1]);
    const propOptions: Node | undefined = decoratorArgs[2];
    const propTsType = modelSync.getTypeNode();
    const propTsTypeText = propTsType?.getText();

    migrationManager.addModel({
      eventName,
      propName,
    });

    migrationManager.addProp({
      propName,
      propNode: propOptions,
      tsType: propTsType,
    });

    migrationManager.addComputedProp({
      name: modelSync.getName(),
      get: {
        statements: `return this.${propName};`,
        returnType: propTsTypeText,
      },
      set: {
        parameters: [{
          name: 'value',
          type: propTsTypeText,
        }],
        statements: `this.$emit('${eventName}', value);`,
      },
    });
  });
};
