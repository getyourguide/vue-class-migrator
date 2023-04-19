import { SyntaxKind, Decorator } from "ts-morph";
import { MigratePartProps } from "./migrator";
import { getObjectProperty, getArrayProperty } from "./utils";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const watchers = clazz.getMethods().filter((m) => m.getDecorator("Watch"));

  if (watchers.length) {
    const watchMainObject = getObjectProperty(mainObject, "watch");

    for (const watcher of watchers) {
      const watcherDecorators: Decorator[] = watcher.getDecorators().filter(decorator => decorator.getName() === 'Watch');
      const watcherName = watcher.getName();

      for (const watcherDecorator of watcherDecorators) {
        const decoratorArgs = watcherDecorator.getArguments();
        const watchPath = decoratorArgs[0].getText();
        const watchProperties = decoratorArgs[1]?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression).getText() || '{}';
        const watchPropArray = getArrayProperty(watchMainObject, watchPath);
        const newWatcher = watchPropArray
          .addElement(watchProperties)
          .asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
        newWatcher.addPropertyAssignment({
          name: 'handler',
          initializer: `'${watcherName}'`
        });
      }

      const methodsMainObject = getObjectProperty(mainObject, "methods");

      if (methodsMainObject.getProperty(watcherName)) {
        throw new Error(`@Watcher implements a duplicated method. ${watcherName}`);
      }
      methodsMainObject.addMethod({
        name: watcherName,
        parameters: watcher.getParameters().map((p) => p.getStructure()),
        isAsync: watcher.isAsync(),
        returnType: watcher.getReturnTypeNode()?.getText(),
        statements: watcher.getBodyText(),
      });
    }
  }
};
