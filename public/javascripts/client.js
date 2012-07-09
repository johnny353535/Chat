$(document).ready(function() {"use strict";// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/

	// Partly: http://gist.github.com/2031681

	var content = $('#conversation-wrapper');
	var input = $('#chatinput-js');

	// If the browser doesn't support websockets
	if(!window.WebSocket) {
		content.html($('<p>', {
			text : 'Sorry, but your browser doesn\'t support WebSockets.'
		}));
		input.hide();
		$('span').hide();
		return;
	}

	// Create a new connection
	var connection = new WebSocket('ws://localhost:8000');

	connection.onopen = function() {
	};
	// Display error, if an error occurs
	connection.onerror = function(error) {
		content.html($('<p>', {
			text : 'The connection can\'t be established or the server is down.</p>'
		}));
	};
	// Incoming message
	connection.onmessage = function(message) {
		// The server always sends JSON
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('Invalid JSON (' + message.data + ')');
			return;
		}

		// The type field defines the kind of message
		if(json.type === 'message') {// A single message
			// let the user write another message
			newMessage(json.data.text, json.data.sender, new Date(json.data.time));
		} else if(json.type === 'history') {// The server sends the history of the conversation
			console.log("History received");
			for(var i = 0; i < json.data.length; i++) {
				newMessage(json.data[i].text, json.data[i].sender, new Date(json.data[i].time));
			}
		} else if(json.type === 'availability') {
			setAvailability(json.contactId, json.available);
		} else if(json.type === 'searchResult') {// The server sends the searchresult of a user search
			console.log("Searchresult received (" + JSON.stringify(json.username) + ")");
			displaySearchresult(json.username, json.data);
		} else if(json.type === 'newContact') {// The server sends the searchresult of a user search
			console.log("New contact received (" + JSON.stringify(json.contact.username) + ')');
			newContact(json.contact._id, json.contact.username, json.availability);
		} else {
			console.log('Unknown JSON message type (' + JSON.stringify(json) + ')');
		}
	};
	// Send message when user presses Enter key
	window.sendMessage = function(msg) {
		// send the message as JSON
		var obj = {
			type : 'message',
			text : msg,
			receiver : contactId
		};

		var outgoing = JSON.stringify(obj);
		connection.send(outgoing);
		console.log('Message sent (' + outgoing + ')');
	}
	// Request the history
	window.requestHistory = function() {
		// send the message as JSON
		var obj = {
			type : 'historyRequest',
			contactId : contactId
		};

		var outgoing = JSON.stringify(obj);
		connection.send(outgoing);
		console.log('History requested (' + obj.contactId + ')');
	}
	// Search users
	window.searchUsers = function(username) {
		// send the message as JSON
		var obj = {
			type : 'searchUsers',
			username : username
		};

		var outgoing = JSON.stringify(obj);
		connection.send(outgoing);
		console.log('Search requested (' + obj.username + ')');
	}
	// Add contact
	window.addContact = function(contactId) {
		// send the message as JSON
		var obj = {
			type : 'addContact',
			contactId : contactId
		};

		var outgoing = JSON.stringify(obj);
		connection.send(outgoing);
		console.log('New contact requested (' + obj.contactId + ')');
	}
	// Logout
	window.logout = function() {
		// send the message as JSON
		var obj = {
			type : 'logout'
		};
		connection.send(JSON.stringify(obj));
		console.log('User logged out');
	}
	// If the server doesn't respond for 3 seconds a error message is being displayed
	setInterval(function() {
		if(connection.readyState !== 1) {
			input.attr('disabled', 'disabled').val('Unable to communicate with the WebSocket server.');
		}
	}, 3000);
});
