import { ParameterDeclarationStructure, StructureKind, SyntaxKind } from "ts-morph";
import { getObjectProperty } from "./utils";
import {
  MigratePartProps,
  specialMethods,
} from "./migrator";
export const supportedActionOptions = ["namespace"]; // @Action("", {...})

export default (migratePartProps: MigratePartProps) => {
  const { clazz, mainObject } = migratePartProps;

  specialMethods
    .filter((m) => clazz.getMethod(m))
    .forEach((m) => {
      const method = clazz.getMethodOrThrow(m);
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
      const decoratorArgs = vuexAction.getDecoratorOrThrow("Action").getArguments();
      const methodName = decoratorArgs[0]?.getText().slice(1, -1) ?? vuexAction.getName();
      const actionOptions = decoratorArgs[1]?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const namespace = actionOptions?.getProperty("namespace")
        ?.asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow()
        .getText()
        .slice(1, -1);
      
        actionOptions?.getProperties().forEach((prop) => {
        if (prop.isKind(SyntaxKind.PropertyAssignment) && !supportedActionOptions.includes(prop.getName())) {
          throw new Error(`@Action option ${prop.getName()} not supported.`);
        }
      });

      const actionName = (
        namespace ? [namespace, methodName].join("/") : methodName
      );

      // The property type is a function or any. the function params are the params that the method should take

      const callSignature = vuexAction.getType().getCallSignatures()[0];
      let params: ParameterDeclarationStructure[] | undefined;
      let returnType = undefined as string | undefined;
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

      methodsObject.addMethod({
        name: vuexAction.getName(),
        parameters: params,
        returnType: returnType,
        statements: `return this.$store.dispatch(${dispatchParameters});`,
      });
    });
  }
};
