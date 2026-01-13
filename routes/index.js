const registerAuthRoutes = require('./auth.routes');
const registerKayitRoutes = require('./kayit.routes');

module.exports = function registerAllRoutes(app, upload) {
  registerAuthRoutes(app, upload);
  registerKayitRoutes(app, upload);
};
