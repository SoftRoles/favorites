var express = require('express');

var request = require('request');

var passport = require('passport');

var session = require('express-session');
var mongodbSessionStore = require('connect-mongodb-session')(session);

// Module related packages
var mongoClient = require("mongodb").MongoClient
var mongodbUrl = "mongodb://127.0.0.1:27017"

// Create a new Express application.
var app = express();

var store = new mongodbSessionStore({
  uri: mongodbUrl,
  databaseName: 'auth',
  collection: 'sessions'
});

// Catch errors
store.on('error', function (error) {
  assert.ifError(error);
  assert.ok(false);
});

app.use(require('express-session')({
  secret: 'This is a secret',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));

app.use(require('morgan')('tiny'));
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require("cors")())
app.use("/favorites/bower_components", express.static(__dirname + "/public/bower_components"))

//==================================================================================================
// Local Passport
//==================================================================================================
// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, cb) {
  cb(null, user.username);
});

passport.deserializeUser(function (username, cb) {
  mongoClient.connect(mongodbUrl + "/auth", function (err, db) {
    db.collection("users").findOne({ username: username }, function (err, user) {
      if (err) return cb(err)
      if (!user) { return cb(null, false); }
      return cb(null, user);
      db.close();
    });
  });
});

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


app.get('/favorites', require('connect-ensure-login').ensureLoggedIn({ redirectTo: "/login?source=favorites" }), function (req, res) {
  res.sendFile(__dirname + '/public/index.html')
});


//==================================================================================================
// Api
//==================================================================================================
app.get('/favorites/api', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  request({
    url: "http://127.0.0.1:3000/mongodb/api/favorites/links",
    headers: { "Authorization": "Bearer " + req.user.token }
  }, function (err, ress, body) {
    res.send(JSON.parse(body))
  })
});

app.post('/favorites/api', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  request({
    url: "http://127.0.0.1:3000/mongodb/api/favorites/links",
    method: "POST",
    headers: { "Authorization": "Bearer " + req.user.token },
    body: req.body,
    json: true
  }, function (err, ress, body) {
    res.send(body)
  })
});

app.put('/favorites/api/:id', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  request({
    url: "http://127.0.0.1:3000/mongodb/api/favorites/links/" + req.params.id,
    method: "PUT",
    headers: { "Authorization": "Bearer " + req.user.token },
    body: req.body,
    json: true
  }, function (err, ress, body) {
    res.send(body)
  })
});

app.delete('/favorites/api/:id', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  request({
    url: "http://127.0.0.1:3000/mongodb/api/favorites/links/" + req.params.id,
    method: "DELETE",
    headers: { "Authorization": "Bearer " + req.user.token },
  }, function (err, ress, body) {
    res.send(body)
  })
});



app.listen(8000, function () {
  console.log("Application 8000-favorites running on http://127.0.0.1:8000")
})
