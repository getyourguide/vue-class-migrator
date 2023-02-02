import { MigratePartProps, supportedComponentProps } from "./migrator";

// Adds the content from @Component({...})
export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;

  const decorator = clazz.getDecorator("Component")!;
  if (!decorator) {
    console.error(`Class ${clazz.getName()} doesn't have a component decorator.`);
    return;
  }

  (decorator.getArguments()[0] as any)?.getProperties().forEach((prop: any) => {
    const propName = prop.getName();
    const value = prop.getInitializer ? prop.getInitializer()?.getText() : undefined;
    if (value != "{}" && value != "[]") {
      if (supportedComponentProps.includes(propName) && prop.getInitializer) {

        if (prop.getInitializer()) {
          mainObject.addPropertyAssignment({
            name: propName,
            initializer: prop.getInitializer().getText(),
          });
        } else {
          mainObject.addShorthandPropertyAssignment({
            name: propName,
          });
        }
      } else {
        throw new Error(`Property on @Component "${propName}" not supported.`);
      }
    }
  });
};
