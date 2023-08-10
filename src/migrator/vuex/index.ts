import type MigrationManager from '../migratorManager';
import migrateVuexActions from './actions';
import migrateVuexGetters from './getters';
import migrateVuexMutations from './mutations';

export default (migrationManager: MigrationManager) => {
  migrateVuexActions(migrationManager);
  migrateVuexGetters(migrationManager);
  migrateVuexMutations(migrationManager);
};

export const supportedPropDecorators = [
  'Action',
  'Getter',
  'Mutation',
];
