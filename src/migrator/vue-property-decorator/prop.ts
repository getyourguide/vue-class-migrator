import { Node } from 'ts-morph';
import { extractPropertiesWithDecorator } from '../utils';
import type MigrationManager from '../migratorManager';

// @Prop
export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const props = extractPropertiesWithDecorator(clazz, 'Prop');

  props.forEach((prop) => {
    const decoratorArgs = prop.getDecoratorOrThrow('Prop').getArguments();
    const propOptions: Node | undefined = decoratorArgs[0];
    const propTsType = prop.getTypeNode();
    migrationManager.addProp({
      propName: prop.getName(),
      propNode: propOptions,
      tsType: propTsType,
    });
  });
};
