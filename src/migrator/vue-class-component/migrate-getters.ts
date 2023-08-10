import type MigrationManager from '../migratorManager';

export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const getters = clazz.getGetAccessors();

  getters.forEach((getter) => {
    const getterName = getter.getName();

    if (clazz.getSetAccessor(getterName)) {
      migrationManager.addComputedProp({
        name: getterName,
        get: {
          returnType: getter.getReturnTypeNode()?.getText(),
          statements: getter.getBodyText(),
        },
      });
    } else {
      migrationManager.addComputedProp({
        name: getterName,
        returnType: getter.getReturnTypeNode()?.getText(),
        statements: getter.getBodyText(),
      });
    }
  });
};
