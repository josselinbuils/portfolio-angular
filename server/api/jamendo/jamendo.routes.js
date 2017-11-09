const JamendoController = require('./jamendo.controller');
const Logger = require('../../logger');

module.exports = class JamendoRoutes {
  static init(router) {
    Logger.info('Initializes jamendo routes');
    router.get('/api/jamendo/tracks', JamendoController.getTracks);
    router.get('/api/jamendo/tracks/:tag', JamendoController.getTracks);
  }
};
