import path from 'path';
import { Project, SourceFile } from 'ts-morph';
import logger from './logger';

export const getScriptContent = (vueSourceFile: SourceFile): string | undefined => {
  const scriptTagRegex = /<script[^>]*>([\s\S]*?)<\/script>/;
  const match = vueSourceFile.getText().match(scriptTagRegex);
  return match ? match[1] : undefined;
};

export const injectScript = (tsSourceFile: SourceFile, vueTemplate: string): string => {
  const scriptTag = vueTemplate.match(/<script.*\/>|<script.*>([\s\S]*)<\/script>/);

  if (!scriptTag) {
    throw new Error('Script tag not foung on vue file.');
  }

  return vueTemplate.replace(
    scriptTag[0],
    `<script lang="ts">\n${tsSourceFile.getText()}\n</script>`,
  );
};

const injectScss = (
  scssSourceFile: SourceFile | undefined,
  vueTemplate: string,
  scoped: boolean,
): string => {
  if (!scssSourceFile) {
    return vueTemplate;
  }
  // Match the style tag.
  const styleTag = vueTemplate.match(/<style.*\/>|<style.*>([\s\S]*)<\/style>/);

  if (!styleTag) {
    logger.warn(
      `Style file found but style tag not present on vue file. The scss file will be deleted.: ${scssSourceFile.getFilePath()}`,
    );
    return vueTemplate;
  }
  return vueTemplate.replace(
    styleTag[0],
    `<style lang="scss"${scoped ? ' scoped' : ''}>\n${scssSourceFile.getText()}\n</style>`,
  );
};

export const getScriptSrc = (vueSourceFile: SourceFile): string | undefined => {
  // Regex that extracts the src from the <script> tag.
  const scriptTagRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/;
  const match = vueSourceFile.getText().match(scriptTagRegex);
  return match ? match[1] : undefined;
};

export const getStyleSrc = (vueSourceFile: SourceFile): {
  filePath: string;
  scoped: boolean;
} | undefined => {
  // Regex that extracts the src from the <style> tag.
  const styleTagRegex = /<style[^>]+src=["']([^"']+)["'][^>]*>/;
  const match = vueSourceFile.getText().match(styleTagRegex);
  return match ? {
    filePath: match[1],
    scoped: match[0].includes(' scoped '),
  } : undefined;
};

export const vueFileToSFC = async (
  project: Project,
  vueSourceFile: SourceFile,
): Promise<SourceFile> => {
  let vueFileText = vueSourceFile.getText();

  const tsFileRelativePath = getScriptSrc(vueSourceFile);
  if (tsFileRelativePath) {
    const tsFileAbsolutePath = path.resolve(vueSourceFile.getDirectoryPath(), tsFileRelativePath);
    const tsSourceFile = project.addSourceFileAtPath(tsFileAbsolutePath);
    vueFileText = injectScript(tsSourceFile, vueFileText);
    await tsSourceFile.deleteImmediately();
  }

  const styleFileRelativePath = getStyleSrc(vueSourceFile);
  if (styleFileRelativePath) {
    const styleFileAbsolutePath = path.resolve(
      vueSourceFile.getDirectoryPath(),
      styleFileRelativePath.filePath,
    );
    const styleSourceFile = project.addSourceFileAtPath(styleFileAbsolutePath);
    vueFileText = injectScss(styleSourceFile, vueFileText, styleFileRelativePath.scoped);
    await styleSourceFile.deleteImmediately();
  }

  if (tsFileRelativePath || styleFileRelativePath) {
    vueSourceFile.removeText();
    vueSourceFile.insertText(0, vueFileText);
    await vueSourceFile.save();
  }
  return vueSourceFile;
};
