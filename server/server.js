const contentLength = require('express-content-length-validator');
const express = require('express');
const helmet = require('helmet');

const {ENV_DEV, MAX_CONTENT_LENGTH, PORT} = require('./constants.json');
const Logger = require('./logger');
const Router = require('./router');

const ENV = process.env.NODE_ENV || ENV_DEV;

const app = express();

app.use(helmet());
app.use(contentLength.validateMax({max: MAX_CONTENT_LENGTH}));

Logger.info(`Start portfolio server in ${ENV} mode`);

Router.init(app);

app.listen(PORT, () => Logger.info(`Server is listening on port ${PORT}`));
