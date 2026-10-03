import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';

// Use the project's installed compiler with Node's built-in test runner.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
    for (const extension of ['.ts', '.tsx']) {
      const url = new URL(specifier + extension, context.parentURL);
      try {
        await access(url);
        return { url: url.href, shortCircuit: true };
      } catch { /* Try the other source extension. */ }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (!/\.tsx?$/.test(url)) return nextLoad(url, context);
  const source = (await readFile(new URL(url), 'utf8')).replaceAll('import.meta.env', '({ DEV: false, VITE_API_BASE: "" })');
  return {
    format: 'module', shortCircuit: true,
    source: ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText,
  };
}
