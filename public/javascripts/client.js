$(document).ready(function() {"use strict";

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
			text : 'The connection couldn\'t be established or the server is down.</p>'
		}));
	};
	
	// Incoming message
	connection.onmessage = function(message) {
		// The server always sends JSON
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}

		// The type field defines the kind of message
		if(json.type === 'message') { // A single message
			input.removeAttr('disabled');
			// let the user write another message
			newMessage(json.data.text, json.data.sender, new Date(json.data.time));
		} else if(json.type === 'history') { // The server sends the history of the conversation
			console.log("Received history");
			for(var i = 0; i < json.data.length; i++) {
				newMessage(json.data[i].text, json.data[i].sender, new Date(json.data[i].time));
			}
		} else if(json.type === 'availability') {
			setAvailability(json.data.contactId,json.data.availability);
		} else {
			console.log('Unknown JSON message type: ', json);
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
		console.log('sendMessage: ' + outgoing);
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
		console.log('requestedHistory: ' + obj.contactId);
	}

	// If the server doesn't respond for 3 seconds a error message is being displayed
	setInterval(function() {
		if(connection.readyState !== 1) {
			input.attr('disabled', 'disabled').val('Unable to communicate with the WebSocket server.');
		}
	}, 3000);
});
