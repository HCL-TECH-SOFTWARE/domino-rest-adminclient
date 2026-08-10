/// <reference types="vite/client" />

export default new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url), {
  type: 'module'
});
