const Logger = require('../../logger');
const RedditController = require('./reddit.controller');

module.exports = class RedditRoutes {
  static init(router) {
    Logger.info('Initializes reddit routes');

    router.get('/api/reddit/:subreddit/hot', RedditController.getHot);
    router.get('/api/reddit/:subreddit/top/:time', RedditController.getTop);
  }
};
