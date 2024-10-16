import {
  ClassDeclaration,
  Node,
  ObjectLiteralExpression,
  OptionalKind,
  ParameterDeclarationStructure,
  SourceFile,
  SyntaxKind,
  TypeNode,
} from 'ts-morph';
import { addPropertyObject, getArrayProperty, getObjectProperty } from './utils';
import { ComputedProps, MigratePartProps } from './types/migrator';
import { supportedDecorators } from './config';
import getDefineComponentInit from './migrate-component-decorator';

export default class MigrationManager {
  private _clazz: ClassDeclaration;

  private _mainObject: ObjectLiteralExpression;

  private _outFile: SourceFile;

  constructor(props: MigratePartProps) {
    this._mainObject = props.mainObject;
    this._clazz = props.clazz;
    this._outFile = props.outFile;
  }

  get mainObject(): ObjectLiteralExpression {
    return this._mainObject;
  }

  get clazz(): ClassDeclaration {
    return this._clazz;
  }

  get outFile(): SourceFile {
    return this._outFile;
  }

  addModel(options: {
    propName: string,
    eventName: string,
  }) {
    if (this.mainObject.getProperty('model')) {
      throw new Error('The component has two models.');
    }
    const modelObject = getObjectProperty(this.mainObject, 'model');
    modelObject
      .addPropertyAssignment({
        name: 'prop',
        initializer: `"${options.propName}"`,
      });

    modelObject
      .addPropertyAssignment({
        name: 'event',
        initializer: `"${options.eventName}"`,
      });
  }

  addProp(options: {
    propName: string;
    propNode: Node | undefined;
    tsType: TypeNode | undefined;
  }): ObjectLiteralExpression {
    const propsObject = getObjectProperty(this.mainObject, 'props');
    const {
      propName, propNode, tsType,
    } = options;

    let propObject: ObjectLiteralExpression;
    if (!propNode) {
      propObject = addPropertyObject(propsObject, propName);
      propObject
        .addPropertyAssignment({
          name: 'type',
          initializer: this.typeNodeToString(tsType),
        });
      return propObject;
    }

    if (
      propNode.isKind(SyntaxKind.Identifier) // e.g. String
      || propNode.isKind(SyntaxKind.ArrayLiteralExpression) // e.g. [String, Boolean]
    ) {
      propObject = addPropertyObject(propsObject, propName);
      propObject
        .addPropertyAssignment({
          name: 'type',
          initializer: propNode.getText(),
        });
      return propObject;
    }
    if (propNode.isKind(SyntaxKind.ObjectLiteralExpression)) {
      propObject = addPropertyObject(propsObject, propName, propNode.getText());
      if (!propObject.getProperty('type')) {
        propObject
          .addPropertyAssignment({
            name: 'type',
            initializer: this.typeNodeToString(tsType),
          });
      }
      return propObject;
    }
    throw new Error(`Error adding prop ${propName}, Kind: ${propNode.getKindName()}.`);
  }

  addComputedProp(options: ComputedProps) {
    const computedObject = getObjectProperty(this.mainObject, 'computed');

    if ('get' in options) {
      const syncPropObject = addPropertyObject(computedObject, options.name);

      if (options.cache !== undefined) {
        syncPropObject.addPropertyAssignment({
          name: 'cache',
          initializer: `${options.cache}`,
        });
      }

      syncPropObject.addMethod({
        name: 'get',
        statements: options.get.statements,
        returnType: options.get.returnType,
      });
      if (options.set) {
        syncPropObject.addMethod({
          name: 'set',
          parameters: options.set.parameters,
          statements: options.set.statements,
        });
      }
    } else {
      computedObject.addMethod({
        name: options.name,
        returnType: options.returnType,
        statements: options.statements,
      });
    }
  }

  addMethod(options: {
    methodName: string;
    parameters: OptionalKind<ParameterDeclarationStructure>[] | undefined;
    statements: string;
    isAsync?: boolean;
    returnType?: string;
  }) {
    const methodsMainObject = getObjectProperty(this.mainObject, 'methods');

    if (methodsMainObject.getProperty(options.methodName)) {
      throw new Error(`Duplicated method ${options.methodName}`);
    }
    methodsMainObject.addMethod({
      name: options.methodName,
      parameters: options.parameters,
      isAsync: options.isAsync,
      returnType: options.returnType,
      statements: options.statements,
    });
  }

  addWatch(options: {
    watchPath: string;
    watchOptions: string | undefined;
    handlerMethod: string;
  }) {
    const watchMainObject = getObjectProperty(this.mainObject, 'watch');
    const watchPropArray = getArrayProperty(watchMainObject, `"${options.watchPath}"`);
    const newWatcher = watchPropArray
      .addElement(options.watchOptions ?? '{}')
      .asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    newWatcher.addPropertyAssignment({
      name: 'handler',
      initializer: `"${options.handlerMethod}"`,
    });
  }

  addNamedImport(module: string, namedImport: string) {
    const importDeclaration = this._outFile
      .getImportDeclaration((imp) => imp.getModuleSpecifierValue() === module);
    if (!importDeclaration?.getNamedImports()
      .some((imp) => imp.getText() === namedImport)) {
      importDeclaration?.addNamedImport({ name: 'PropType', isTypeOnly: true });
    }
  }

  private typeNodeToString(typeNode: TypeNode | undefined): string {
    const propertyType = typeNode?.getText() ?? 'any';
    const isArray = Node.isArrayTypeNode(typeNode);
    const isFunction = Node.isFunctionTypeNode(typeNode);
    const propertyConstructorMapping: Record<string, string> = {
      string: 'String',
      boolean: 'Boolean',
      number: 'Number',
    };
    let fallbackType = 'Object';
    fallbackType = isArray ? 'Array' : fallbackType;
    fallbackType = isFunction ? 'Function' : fallbackType;

    if (!propertyConstructorMapping[propertyType]) {
      this.addNamedImport('~/lib/helper/fallback-composition-api', 'PropType');
      return `${fallbackType} as PropType<${propertyType}>`;
    }

    return propertyConstructorMapping[propertyType];
  }
}

export const createMigrationManager = (
  sourceFile: SourceFile,
  outFile: SourceFile,
): MigrationManager => {
  // Do not modify this class.
  const sourceFileClass = sourceFile
    .getClasses()
    .filter((clazz) => clazz.getDecorator('Component'))
    .pop();
  const outClazz = outFile
    .getClasses()
    .filter((clazz) => clazz.getDecorator('Component'))
    .pop();

  if (!sourceFileClass || !outClazz) {
    throw new Error('Class implementing the @Component decorator not found.');
  }

  // Validation
  sourceFileClass
    .getProperties()
    .flatMap((prop) => prop.getDecorators())
    .forEach((decorator) => {
      if (!supportedDecorators.includes(decorator.getName())) {
        throw new Error(`Decorator @${decorator.getName()} not supported`);
      }
    });

  const defineComponentInitObject = getDefineComponentInit(sourceFileClass);
  let clazzReplacement: string;
  if (!outClazz.getDefaultKeyword()) {
    // Non default exported class
    clazzReplacement = [
      outClazz?.getExportKeyword()?.getText(),
      `const ${outClazz.getName()} =`,
      `defineComponent(${defineComponentInitObject})`,
    ]
      .filter((s) => s)
      .join(' ');
  } else {
    clazzReplacement = [
      outClazz?.getExportKeyword()?.getText(),
      outClazz?.getDefaultKeywordOrThrow()?.getText(),
      `defineComponent(${defineComponentInitObject})`,
    ]
      .filter((s) => s)
      .join(' ');
  }

  // Main structure
  const mainObject = outClazz
    .replaceWithText(clazzReplacement)
    .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);

  if (!mainObject) {
    throw new Error('Unable to create defineComponent');
  }

  const migratePartProps: MigratePartProps = {
    clazz: sourceFileClass,
    mainObject,
    outFile,
    sourceFile,
  };
  return new MigrationManager(migratePartProps);
};
