echo Sets emscripten sdk env variables && ^
cd C:\Users\Josselin\Documents\emsdk-portable-64bit\ && emsdk_env.bat && ^
cd C:\Projects\portfolio\src\app\apps\dicom-viewer\renderer\emscripten && ^
echo Compiles wasm renderer && ^
emcc renderer.c -o generated/wasm-renderer.js --pre-js wrappers/wasm-pre.js --post-js wrappers/wasm-post.js -s EXPORTED_FUNCTIONS="['_fillTable', '_render']" -s TOTAL_MEMORY=33554432 -s WASM=1 && ^
echo Compiles asm renderer && ^
emcc renderer.c -o generated/asm-renderer.js --pre-js wrappers/asm-pre.js --post-js wrappers/asm-post.js -s EXPORTED_FUNCTIONS="['_fillTable', '_render']" -s TOTAL_MEMORY=33554432 --memory-init-file 0 && ^
echo Moves wasm binary to assets && ^
move /Y "generated\wasm-renderer.wasm" "..\..\..\..\..\assets\wasm-renderer.wasm"
