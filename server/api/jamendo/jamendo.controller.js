const request = require('request-promise-native');

const {jamendo} = require('../../config.json');
const {HTTP_INTERNAL_ERROR} = require('../../constants.json');
const Logger = require('../../logger');

validateConfig();

module.exports = class JamendoController {
  static getTracks(req, res) {
    request({
      url: `https://api.jamendo.com/v3.0/tracks/?client_id=${jamendo.clientId}&format=json&limit=50&order=popularity_total`,
      json: true
    }).then(
      data => {
        const headers = data.headers;

        if (headers.status === 'success') {
          res.json(data.results);
        } else {
          Logger.error(`Jamendo API error: code ${headers.code}: ${headers.error_message}`);
          res.status(HTTP_INTERNAL_ERROR).end();
        }
      },
      error => {
        Logger.error(error);
        res.status(HTTP_INTERNAL_ERROR).end();
      }
    );
  }
};

function validateConfig() {
  if (!jamendo.clientId) {
    throw Error('Invalid configuration: jamendo');
  }
}
