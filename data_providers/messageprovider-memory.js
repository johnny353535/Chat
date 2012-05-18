var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;

MessageProvider = function(host, port) {
	this.db = new Db('chat', new Server(host, port, {
		auto_reconnect : true
	}, {}));
	this.db.open(function() {
		console.log("Messageprovider connected to the database (" + host + ":" + port + "/chat)");
	});
};

MessageProvider.prototype.getCollection = function(callback) {
	this.db.collection('messages', function(error, message_collection) {
		if(error)
			callback(error);
		else
			callback(null, message_collection);
	});
};

MessageProvider.prototype.findAll = function(callback) {
	this.getCollection(function(error, message_collection) {
		if(error)
			callback(error)
		else {
			message_collection.find().toArray(function(error, results) {
				if(error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
};

// Get conversation between user and contact
MessageProvider.prototype.getConversation = function(userId, contactId, callback) {
	this.getCollection(function(error, message_collection) {
		console.log("History request ("+userId+", "+contactId+")");

		if(error)
			callback(error)
		else {
			message_collection.find({
				$or : [{
					sender : userId, receiver: contactId
				}, {
					sender : contactId, receiver: userId
				}]
			}).toArray(function(error, results) {
				if(error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
};



MessageProvider.prototype.save = function(messages, callback) {
	this.getCollection(function(error, message_collection) {
		if(error)
			callback(error)
		else {
			if( typeof (messages.length) == "undefined")
				messages = [messages];

			for(var i = 0; i < messages.length; i++) {
				message = messages[i];
				message.created_at = new Date();

			}

			message_collection.insert(messages, function() {
				callback(null, messages);
			});
		}
	});
};

exports.MessageProvider = MessageProvider;
