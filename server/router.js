const bodyParser = require('body-parser');
const express = require('express');
const serveStatic = require('serve-static');

const {
  ENV_DEV, HTTP_DEFAULT_PREFIX, HTTP_INTERNAL_ERROR, HTTP_NOT_FOUND, PUBLIC_DIR
} = require('./constants.json');
const DependenciesRoutes = require('./api/dependencies/dependencies.routes');
const JamendoRoutes = require('./api/jamendo/jamendo.routes');
const Logger = require('./logger');
const RedditRoutes = require('./api/reddit/reddit.routes');

const CLIENT_PATH = process.cwd() + PUBLIC_DIR;
const ENV = process.env.NODE_ENV || ENV_DEV;
const HTTP_PREFIX = process.env.HTTP_PREFIX || HTTP_DEFAULT_PREFIX;

module.exports = class Router {
  static init(app) {
    Logger.info('Initializes router');

    const router = express.Router();

    router.use((req, res, next) => {
      Logger.info(`<- ${req.method} ${req.url}`);

      if (ENV === ENV_DEV) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      }

      next();
    });

    router.use(serveStatic(CLIENT_PATH));
    router.use(bodyParser.json());

    DependenciesRoutes.init(router);
    JamendoRoutes.init(router);
    RedditRoutes.init(router);

    router.get('*', (req, res) => res.status(HTTP_NOT_FOUND).end());

    // next is required even if not used
    router.use((error, req, res, next) => {
      Logger.error(error.stack);
      res.status(HTTP_INTERNAL_ERROR).end();
    });

    app.use(HTTP_PREFIX, router);
  }
};
