/// <reference types="vite/client" />

export default new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
  type: 'module'
});
