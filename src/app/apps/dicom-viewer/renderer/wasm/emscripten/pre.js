Module['locateFile'] = function (path) {
  return path === 'wasm-renderer.wasm' ? '/assets/wasm-renderer.wasm' : path;
};
