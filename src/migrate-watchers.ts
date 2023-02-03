import { SyntaxKind } from "ts-morph";
import { getObjectProperty, MigratePartProps } from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;
  const watchers = clazz.getMethods().filter((m) => m.getDecorator("Watch"));

  // TODO Reuse also watcher property in sourceFile.

  if (watchers.length) {
    const watchMainObject = getObjectProperty(mainObject, "watch");

    for (const watcher of watchers) {
      const decoratorArgs = watcher.getDecorator("Watch")?.getArguments() || [];
      const rawWatchedProp = decoratorArgs[0].getText();
      const watchedProperty = !rawWatchedProp.includes('.')
          ? rawWatchedProp.replace(/"/g, "")
          : rawWatchedProp; //.replaceAll("\"", "");
      const watchProperties = (decoratorArgs[1] as any)?.getProperties() || [];

      if (!watchProperties.length) {
        watchMainObject.addMethod({
          name: watchedProperty,
          parameters: watcher.getParameters().map((p) => p.getStructure()),
          isAsync: watcher.isAsync(),
          returnType: watcher.getReturnTypeNode()?.getText(),
          statements: watcher.getBodyText(),
        })
      } else {
        const watcherObject = watchMainObject
            .addPropertyAssignment({
              name: watchedProperty,
              initializer: "{}",
            })
            .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)!;

        watchProperties.forEach((prop: any) => {
          watcherObject.addPropertyAssignment({
            name: prop.getName(),
            initializer: prop.getInitializerOrThrow().getText(),
          });
        });

        watcherObject.addMethod({
          name: "handler", // TODO Sometimes data becomes $data
          parameters: watcher.getParameters().map((p) => p.getStructure()),
          isAsync: watcher.isAsync(),
          returnType: watcher.getReturnTypeNode()?.getText(),
          statements: watcher.getBodyText(),
        });
      }
    }
  }
};
