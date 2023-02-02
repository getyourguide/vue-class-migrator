import { ParameterDeclarationStructure, StructureKind } from "ts-morph";
import {
  getObjectProperty,
  MigratePartProps,
  specialMethods,
  supportedActionOptions,
} from "./migrator";

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;

  specialMethods
    .filter((m) => clazz.getMethod(m))
    .forEach((m) => {
      const method = clazz.getMethod(m)!;
      const typeNode = method.getReturnTypeNode()?.getText();
      mainObject.addMethod({
        name: method.getName(),
        isAsync: method.isAsync(),
        returnType: typeNode,
        statements: method.getBodyText(),
      });
    });

  const methods = clazz
    .getMethods()
    .filter(
      (m) =>
        !specialMethods.includes(m.getName()) &&
        !["data"].includes(m.getName()) &&
        !m.getDecorator("Watch"),
    );

  if (methods.length) {
    const methodsObject = getObjectProperty(mainObject, "methods");

    for (const method of methods) {
      if (method.getDecorators().length) {
        throw new Error(`The method ${method.getName()} has non supported decorators.`);
      }

      const typeNode = method.getReturnTypeNode()?.getText();
      methodsObject.addMethod({
        name: method.getName(),
        parameters: method.getParameters().map((p) => p.getStructure()),
        isAsync: method.isAsync(),
        returnType: typeNode,
        statements: method.getBodyText(),
      });
    }
  }

  // Vuex @ Actions are methods
  // @Action("setActivityPageAlert", { namespace: "activity" })
  // @Action

  const vuexActions = clazz.getProperties().filter((prop) => prop.getDecorator("Action"));

  if (vuexActions.length) {
    const methodsObject = getObjectProperty(mainObject, "methods");

    vuexActions.forEach((vuexAction) => {
      const decoratorArgs = vuexAction.getDecorator("Action")?.getArguments() || [];
      let methodName: string;
      if (!decoratorArgs.length) {
        // @Action: In this case the name of the property is the property name.
        methodName = vuexAction.getName();
      } else {
        methodName = decoratorArgs[0].getText();
      }
      let namespace: string | undefined;
      const actionOptions = (decoratorArgs[1] as any)?.getProperties() || [];

      actionOptions.forEach((prop: any) => {
        if (!supportedActionOptions.includes(prop.getName())) {
          throw new Error(`@Action option ${prop.getName()} not supported.`);
        }
        namespace = prop.getInitializerOrThrow().getText();
      });

      // TODO Action type
      // @Action("showActivityPageAlert", { namespace: "activity" })
      // setShowAlert!: (show: boolean) => void;

      const actionName = (namespace ? [namespace, methodName].join("/") : methodName).replaceAll(
        '"',
        "",
      );

      // The property type is a function or any. the function params are the params that the method should take

      const callSignature = vuexAction.getType().getCallSignatures()[0];
      let params: ParameterDeclarationStructure[] | undefined;
      let returnType = undefined;
      let paramVars: string[] = [];
      if (callSignature) {
        // The function has paramenters
        const paramsString = callSignature.compilerSignature
          .getParameters()
          .flatMap((param) => param.getDeclarations())
          .map((param) => param?.getText())
          .filter((param) => param)
          .join(", ");
        params = [
          {
            kind: StructureKind.Parameter,
            name: paramsString,
          },
        ];
        paramVars = callSignature.getParameters().map((param) => param.getName());
        returnType = `Promise<${callSignature.getReturnType().getText() ?? "any"}>`; // Dispatch always returns a promise
      } else {
        returnType = vuexAction.getTypeNode()?.getText(); // Probably is set to any
      }

      const dispatchParameters = [`"${actionName}"`, ...paramVars].join(", ");

      methodsObject!.addMethod({
        name: vuexAction.getName(),
        parameters: params,
        returnType: returnType,
        statements: `return this.$store.dispatch(${dispatchParameters});`, // TODO
      });
    });
  }
};
