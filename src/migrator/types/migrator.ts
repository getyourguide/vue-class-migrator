import {
  ClassDeclaration,
  ObjectLiteralExpression,
  OptionalKind,
  ParameterDeclarationStructure,
  SourceFile,
} from 'ts-morph';

export interface MigratePartProps {
  clazz: ClassDeclaration;
  mainObject: ObjectLiteralExpression;
  outFile: SourceFile;
  sourceFile: SourceFile;
}

export type ComputedGetSetOptions = {
  name: string;
  cache?: boolean;
  get: {
    statements?: string;
    returnType?: string;
  },
  set?: {
    parameters: OptionalKind<ParameterDeclarationStructure>[] | undefined,
    statements: string;
  }
};

export type ComputedBasicOptions = {
  name: string;
  statements?: string;
  returnType?: string;
};

export type ComputedProps = ComputedGetSetOptions | ComputedBasicOptions;
