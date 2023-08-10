import { extractPropertiesWithDecorator, stringNodeToSTring } from '../utils';
import type MigrationManager from '../migratorManager';

// @PropSync
export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const propSyncs = extractPropertiesWithDecorator(clazz, 'PropSync');

  propSyncs.forEach((propSync) => {
    const decoratorArgs = propSync.getDecoratorOrThrow('PropSync').getArguments();
    if (!decoratorArgs.length) {
      throw new Error('@PropSync without arguments not supported');
    }
    const propName = stringNodeToSTring(decoratorArgs[0]);
    const propTsType = propSync.getTypeNode();
    const propTsTypeText = propTsType?.getText();

    migrationManager.addProp({
      propName,
      propNode: decoratorArgs[1],
      tsType: propTsType,
    });

    migrationManager.addComputedProp({
      name: propSync.getName(),
      get: {
        statements: `return this.${propName};`,
        returnType: propTsTypeText,
      },
      set: {
        parameters: [{
          name: 'value',
          type: propTsTypeText,
        }],
        statements: `this.$emit('update:${propName}', value);`,
      },
    });
  });
};
