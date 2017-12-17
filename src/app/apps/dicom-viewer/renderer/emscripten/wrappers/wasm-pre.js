function WasmRenderer() {
  return new Promise(resolve => {
    var Module = {};
    Module['onRuntimeInitialized'] = () => resolve(Module);
    Module['print'] = Module['printErr'] = function () {};
    Module['wasmBinaryFile'] = '/assets/wasm-renderer.wasm';
