var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;

var async = require('async');
SessionProvider = function(host, port) {
	this.db = new Db('chat', new Server(host, port, {
		auto_reconnect : true
	}, {}));
	this.db.open(function() {
		console.log("SessionProvider connected to the database (" + host + ":" + port + "/chat)");
	});
};

SessionProvider.prototype.getCollection = function(callback) {
	this.db.collection('sessions', function(error, session_collection) {
		if(error)
			callback(error);
		else
			callback(null, session_collection);
	});
};

SessionProvider.prototype.findAll = function(callback) {
	this.getCollection(function(error, session_collection) {
		if(error)
			callback(error)
		else {
			session_collection.find().toArray(function(error, results) {
				if(error)
					callback(error);
				else
					callback(null, results);
			});
		}
	});
};

SessionProvider.prototype.findById = function(id, callback) {
	this.getCollection(function(error, session_collection) {
		if(error)
			callback(error);
		else {
			session_collection.findOne({
				_id : id
			}, function(error, result) {
				if(error) {
					callback(error);
				} else {
					callback(null, result);
				}
			});
		}
	});
};

SessionProvider.prototype.findByUserId = function(userId, callback) {
	this.getCollection(function(error, session_collection) {
		if(error)
			callback(error);
		else {
			session_collection.findOne({
				session : {$regex : ".*"+userId+".*"}
			}, function(error, result) {
				if(error){
					callback(error);
				} else {
					callback(null, result);
				}
			});
		}
	});
};

SessionProvider.prototype.save = function(sessions, callback) {
	this.getCollection(function(error, session_collection) {
		if(error){
			callback(error);
		} else {
			if(typeof(sessions.length) == "undefined")
				sessions = [sessions];

			for(var i = 0; i < sessions.length; i++) {
				session = sessions[i];
				session._id = sessionCounter++;
				session.created_at = new Date();

				if(session.contacts === undefined)
					session.contacts = [];

				for(var j = 0; j < session.contacts.length; j++) {
					session.contacts[j].created_at = new Date();
				}
			}
			session_collection.insert(sessions, function() {
				callback(null, sessions);
			});
		}
	});
};

exports.SessionProvider = SessionProvider;
