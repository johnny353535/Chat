/**
 * Module dependencies.
 */

var express = require('express'), routes = require('./routes'), http = require('http'), lessMiddleware = require('less-middleware');

var chat = express();
var MemStore = express.session.MemoryStore;
// TODO: Delete me later

chat.configure(function() {
	chat.set('views', __dirname + '/views');
	chat.set('view engine', 'jade');
	chat.use(express.favicon());
	chat.use(express.logger('dev'));
	chat.use(express.static(__dirname + '/public'));
	chat.use(express.bodyParser());
	chat.use(express.methodOverride());
	chat.use(express.cookieParser("keyboardcat"));
	chat.use(express.session({
		secret : "keyboardcat",
		store : MemStore({
			reapInterval : 60000 * 10
		})
	}));
	//TODO: Later mongoDB store (https://github.com/kcbanner/connect-mongo)
	chat.use(chat.router);
	chat.use(lessMiddleware({
		src : __dirname + '/public',
		compress : true
	}));
});

chat.configure('development', function() {
	chat.use(express.errorHandler());
});
// Data providers
var UserProvider = require('./userprovider-memory').UserProvider;
var userProvider = new UserProvider();

var MessageProvider = require('./messageprovider-memory').MessageProvider;
var messageProvider = new MessageProvider();

//TODO: Export routes to routes directory
chat.get('/', function(req, res) {
	userProvider.findAll(function(error, users) {
		var messages = messageProvider.findAll(function(error, messages) {
			res.render('index.jade', {
				title : 'Chat',
				user_id: 1,
				users : users,
				messages : messages
			});
		});
	});
});
// Routing
//chat.get('/', routes.index);
/*chat.get('/login', function(req, res) {
res.send('Hello Login2');
});*/
//chat.get('/register', routes.register);

http.createServer(chat).listen(3000);

console.log("Express server listening on port 3000");
