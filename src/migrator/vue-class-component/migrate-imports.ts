import { SourceFile } from 'ts-morph';

// Import handling
export default (outFile: SourceFile) => {
  const importStatementsToRemove = ['vue-property-decorator', 'vue-class-component', 'vuex-class', 'nuxt-property-decorator'];

  const vueImport = outFile.getImportDeclaration(
    (importDeclaration) => importDeclaration.getModuleSpecifierValue() === '~/lib/helper/fallback-composition-api',
  );

  if (!vueImport) {
    outFile.addImportDeclaration({
      defaultImport: '{ defineComponent }',
      moduleSpecifier: '~/lib/helper/fallback-composition-api',
    });
  } else {
    vueImport.addNamedImport('defineComponent');
  }

  outFile.getImportDeclarations().forEach((importDeclaration) => {
    const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
    if (importStatementsToRemove.includes(moduleSpecifier)) {
      importDeclaration.remove();
    }
  });
};
