import { extractPropertiesWithDecorator, stringNodeToSTring } from '../utils';
import type MigrationManager from '../migratorManager';

// @Ref
export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const refs = extractPropertiesWithDecorator(clazz, 'Ref');

  refs.forEach((reference) => {
    const decoratorArgs = reference.getDecoratorOrThrow('Ref').getArguments();
    const refName = decoratorArgs[0]
      ? stringNodeToSTring(decoratorArgs[0])
      : reference.getName();
    const refType = reference.getTypeNode()?.getText() ?? 'any';
    const refStatement = `this.$refs["${refName}"]`;
    migrationManager.addComputedProp({
      name: reference.getName(),
      cache: false,
      get: {
        statements: `return ${refStatement}${refType ? ` as ${refType}` : ''};`,
      },
    });
  });
};
