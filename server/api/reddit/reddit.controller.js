const snoowrap = require('snoowrap');

const {clientId, clientSecret, username, password} = require('../../config.json');
const {HTTP_INTERNAL_ERROR, USER_AGENT} = require('../../constants.json');
const Logger = require('../../logger');

validateConfig();

const reddit = new snoowrap({
  userAgent: USER_AGENT,
  clientId: clientId,
  clientSecret: clientSecret,
  username: username,
  password: password
});

module.exports = class RedditController {

  static getHot(req, res) {
    const subreddit = req.params.subreddit;
    handle(res, reddit.getSubreddit(subreddit).getHot());
  }

  static getTop(req, res) {
    const subreddit = req.params.subreddit;
    const time = req.params.time;
    handle(res, reddit.getSubreddit(subreddit).getTop({time: time}));
  }
};

function handle(res, promise) {
  promise.then(
    data => res.json(data),
    error => {
      Logger.error(error);
      res.status(HTTP_INTERNAL_ERROR).end();
    }
  )
}

function validateConfig() {
  if ([clientId, clientSecret, username, password].some(field => !field)) {
    throw Error('Invalid configuration');
  }
}
