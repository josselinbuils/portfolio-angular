const express = require('express');
const serveStatic = require('serve-static');

const app = express();
app.use(process.env.HTTP_PREFIX, serveStatic('dist'));
app.listen(9000);
console.log('Server running');
