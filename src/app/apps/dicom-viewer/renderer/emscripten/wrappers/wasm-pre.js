function WasmRenderer() {

  // noinspection ES6ConvertVarToLetConst
  var Module = {};
  Module['print'] = Module['printErr'] = function () {};
  Module['wasmBinaryFile'] = '/assets/wasm-renderer.wasm';
