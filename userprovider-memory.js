var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
UserProvider = function(host, port) {
	this.db = new Db('chat', new Server(host, port, {
		auto_reconnect : true
	}, {}));
	this.db.open(function() {
		console.log("Userprovider connected to the database ("+host+":"+port+"/chat)");
	});
};

UserProvider.prototype.getCollection = function(callback) {
	this.db.collection('users', function(error, user_collection) {
		if(error)
			callback(error);
		else
			callback(null, user_collection);
	});
};

UserProvider.prototype.findAll = function(callback) {
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.find().toArray(function(error, results) {
				if(error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
};

UserProvider.prototype.findById = function(id, callback) {
	console.log("findById id: "+id);
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.findOne({
				_id : user_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, function(error, result) {
				if(error)
					callback(error)
				else
					callback(null, result)
			});
		}
	});
};

UserProvider.prototype.findContacts = function(uid, callback) {
	var result = [];
	
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.findOne({
				_id : user_collection.db.bson_serializer.ObjectID.createFromHexString(uid)
			}, function(error, user) {
				if(error)
					callback(error)
				else
					for(var j = 0; j < user.contacts.length; j++) {
						console.log('UserProvider: number of contacts: ' + user.contacts.length);
						if(user.contacts[j].accepted == 'true') {
							this.findById(user.contacts[j].contactId, function(error, user) {
								result.push(user);
								console.log('user_id: ' + user._id)
							})
						}
					}
				callback(null, result)
			});
		}
	});
};

UserProvider.prototype.save = function(users, callback) {
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			if( typeof (users.length) == "undefined")
				users = [users];

			for(var i = 0; i < users.length; i++) {
				user = users[i];
				user._id = userCounter++;
				user.created_at = new Date();

				if(user.contacts === undefined)
					user.contacts = [];

				for(var j = 0; j < user.contacts.length; j++) {
					user.contacts[j].created_at = new Date();
				}
			}
			user_collection.insert(users, function() {
				callback(null, users);
			});
		}
	});
};

exports.UserProvider = UserProvider;
