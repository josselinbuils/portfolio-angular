echo Sets emscripten sdk env variables && ^
cd C:\emsdk\ && emsdk_env.bat && ^
cd C:\Projects\portfolio\src\app\apps\dicom-viewer\renderer\wasm\emscripten && ^
echo Compiles wasm renderer && ^
emcc renderer.c -O2 -o ..\..\..\..\..\..\assets\wasm-renderer.js --pre-js pre.js -s EXPORTED_FUNCTIONS="['_fillTable', '_render']" -s EXTRA_EXPORTED_RUNTIME_METHODS="['cwrap']" -s TOTAL_MEMORY=33554432 -s WASM=1 -s MODULARIZE=1
