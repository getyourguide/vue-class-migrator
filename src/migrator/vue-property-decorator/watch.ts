import { Decorator, SyntaxKind } from 'ts-morph';
import { stringNodeToSTring } from '../utils';
import type MigrationManager from '../migratorManager';

// @Watcher
export default (migrationManager: MigrationManager) => {
  const { clazz } = migrationManager;
  const watchers = clazz.getMethods().filter((m) => m.getDecorator('Watch'));

  watchers.forEach((watcher) => {
    const watcherName = watcher.getName();
    const watcherDecorators: Decorator[] = watcher
      .getDecorators()
      .filter((decorator) => decorator.getName() === 'Watch');

    watcherDecorators.forEach((watcherDecorator) => {
      const decoratorArgs = watcherDecorator.getArguments();
      const watchPath = stringNodeToSTring(decoratorArgs[0]);
      const watchOptions = decoratorArgs[1]
        ?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
        .getText();

      migrationManager.addWatch({
        watchPath,
        watchOptions,
        handlerMethod: watcherName,
      });
    });

    migrationManager.addMethod({
      methodName: watcherName,
      parameters: watcher.getParameters().map((p) => p.getStructure()),
      isAsync: watcher.isAsync(),
      returnType: watcher.getReturnTypeNode()?.getText(),
      statements: watcher.getBodyText() ?? '',
    });
  });
};
