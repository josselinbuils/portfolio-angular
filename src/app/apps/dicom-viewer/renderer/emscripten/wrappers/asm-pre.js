function AsmRenderer() {
  return new Promise(function (resolve) {
    var Module = {};
    Module['onRuntimeInitialized'] = function () { resolve(Module); };
    Module['print'] = Module['printErr'] = function () {};
