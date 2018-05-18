var express = require('express');
var bodyParser = require("body-parser")
var cors = require("cors")

var request = require("request")

var passport = require('passport');
var passStrategyLocal = require('passport-local').Strategy;


// Create a new Express application.
var app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use("/favorites/bower_components", express.static(__dirname + "/public/bower_components"))
app.use("/bower_components", express.static(__dirname + "/public/bower_components"))

//==================================================================================================
// Local Passport
//==================================================================================================
// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new passStrategyLocal(function (username, password, cb) {
  request({
    url: "http://localhost/mongodb/api/auth/users?username=" + username + "&password=" + password,
    headers: { "Authorization": "Bearer %Sdf1234" }
  }, function (err, res, body) {
    var users = JSON.parse(body)
    if (err) return cb(err)
    if (!users.length) { return cb(null, false); }
    return cb(null, users[0]);
  })
}));


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
  request({
    url: "http://localhost/mongodb/api/auth/users?username=" + username,
    headers: { "Authorization": "Bearer %Sdf1234" }
  }, function (err, res, body) {
    var users = JSON.parse(body)
    if (err) return cb(err)
    if (!users.length) { return cb(null, false); }
    return cb(null, users[0]);
  })
});


// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get('/favorites/login', function (req, res) {
  res.sendFile(__dirname + '/public/login.html');
});

app.post('/favorites/login', passport.authenticate('local', { failureRedirect: '/favorites/login', successRedirect: '/favorites' }), function (req, res) {
  res.redirect('/favorites');
});

app.get('/favorites/logout', function (req, res) {
  req.logout();
  res.redirect('/favorites');
});


app.get('/favorites', require('connect-ensure-login').ensureLoggedIn({ redirectTo: "/favorites/login" }), function (req, res) {
  res.sendFile(__dirname + '/public/index.html')
});

app.get('/favorites/user', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  MongoClient.connect(mongodb_url + "/auth", function (err, db) {
    db.collection("users").findOne({ token: req.user.token }, function (err, user) {
      if (err) res.send(err)
      else res.send(user)
      db.close();
    });
  });
});


//==================================================================================================
// Api
//==================================================================================================
app.get('/favorites/api', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  request({
    url: "http://localhost/mongodb/api/apps/favorites",
    headers: { "Authorization": "Bearer " + req.user.token }
  }, function (err, ress, body) {
    res.send(JSON.parse(body))
  })
});

app.post('/favorites/api', require('connect-ensure-login').ensureLoggedIn(), function (req, res) {
  request({
    url: "http://localhost/mongodb/api/apps/favorites",
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
    url: "http://localhost/mongodb/api/apps/favorites/" + req.params.id,
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
    url: "http://localhost/mongodb/api/apps/favorites/" + req.params.id,
    method: "DELETE",
    headers: { "Authorization": "Bearer " + req.user.token },
  }, function (err, ress, body) {
    res.send(body)
  })
});



app.listen(8000, function () {
  console.log("Application 8000-favorites running on http://127.0.0.1:8000")
})
