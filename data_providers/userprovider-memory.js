var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;

var async = require('async');
UserProvider = function(host, port) {
	this.db = new Db('chat', new Server(host, port, {
		auto_reconnect : true
	}, {}));
	this.db.open(function() {
		console.log("Userprovider connected to the database (" + host + ":" + port + "/chat)");
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

UserProvider.prototype.findByUsername = function(username, callback) {
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.findOne({
				username : username
			}, function(error, result) {
				if(error)
					callback(error)
				else
					callback(null, result)
			});
		}
	});
};

UserProvider.prototype.findContacts = function(userId, callback) {
	var result = [];

	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.findOne({
				_id : user_collection.db.bson_serializer.ObjectID.createFromHexString(userId)
			}, function(error, user) {
				if(error)
					callback(error)
				else {
					if(user.contacts != undefined) {	// If contacts exist
						async.forEach(user.contacts, function(contact, callbackFE) {
							if(contact.accepted) {
								// Accepted, add to the result array
								user_collection.findOne({
									_id : user_collection.db.bson_serializer.ObjectID.createFromHexString(contact.contactId.toString())
								},{ password: 0, contacts: 0 }, function(error, contact) {
									result.push(contact);
									callbackFE(error);
								})
							} else {
								// Not accepted, do nothing
								callbackFE(error);
							}
						}, function(error) { callback(error, result)
						})
					} else callback(error, result);
				}
			});
		}
	});
};

UserProvider.prototype.addContact = function(userId, contactId, callback) {
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.findOne({
				_id : userId
			},{ password: 0, contacts: 0 }, function(error, contact) {
				if(error)
					callback(error)
				else
					callback(null, contact)
			});
		}
	});
};

UserProvider.prototype.findUsers = function(username, callback) {
	var result = [];

	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			user_collection.find({
				username : {$regex : username+".*"} ,
			}, { password : 0, contacts: 0 }).toArray(function(error, results) {
				if(error) {
					callback(error);
				} else {
					if(results.length)
						console.log("Search result: " + results);
					callback(null, results);
				}
			});
		}
	});
};

UserProvider.prototype.newUser = function(callback) {
	this.getCollection(function(error, user_collection) {
		if(error)
			callback(error)
		else {
			var user = {};
			user_collection.insert(user, function() {
				callback(null, user);
			});
		}
	});
};

exports.UserProvider = UserProvider;
