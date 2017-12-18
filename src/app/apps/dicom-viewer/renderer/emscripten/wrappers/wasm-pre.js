function WasmRenderer() {
  return new Promise(function (resolve) {
    var Module = {};
    Module['onRuntimeInitialized'] = function () { resolve(Module); };
    Module['print'] = Module['printErr'] = function () {};
    Module['wasmBinaryFile'] = '/assets/wasm-renderer.wasm';
