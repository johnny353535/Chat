$(document).ready(function() {"use strict";

	// for better performance - to avoid searching in DOM
	var content = $('#conversation-wrapper');
	var input = $('#chatinput-js');
	var status = $('#status');

	// if browser doesn't support WebSocket, just show some notification and exit
	if(!window.WebSocket) {
		content.html($('<p>', {
			text : 'Sorry, but your browser doesn\'t ' + 'support WebSockets.'
		}));
		input.hide();
		$('span').hide();
		return;
	}

	// open connection
	var connection = new WebSocket('ws://localhost:8000');

	connection.onopen = function() {
	};

	connection.onerror = function(error) {
		// just in there were some problems with conenction...
		content.html($('<p>', {
			text : 'Sorry, but there\'s some problem with your ' + 'connection or the server is down.</p>'
		}));
	};
	// most important part - incoming messages
	connection.onmessage = function(message) {
		// try to parse JSON message. Because we know that the server always returns
		// JSON this should work without any problem but we should make sure that
		// the massage is not chunked or otherwise damaged.
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}

		// NOTE: if you're not sure about the JSON structure
		// check the server source code above
		if(json.type === 'history') {// entire message history
			// insert every single message to the chat window
			for(var i = 0; i < json.data.length; i++) {
				addMessage(json.data[i].text, json.data[i].author, new Date(json.data[i].time));
			}
		} else if(json.type === 'message') {// it's a single message
			input.removeAttr('disabled');
			// let the user write another message
			addMessage(json.data.text, json.data.author, new Date(json.data.time));
		} else {
			console.log('Hmm..., I\'ve never seen JSON like this: ', json);
		}
	};
	/**
	 * Send mesage when user presses Enter key
	 */
	window.sendMessage = function(msg, receiver) {
		// send the message as JSON
		var obj = {
			type : 'message',
			text : msg,
			receiver : contact
		};

		var outgoing = JSON.stringify(obj);
		
		console.log('send: '+outgoing);
		
		connection.send(outgoing);
	}
	/**
	 * This method is optional. If the server wasn't able to respond to the
	 * in 3 seconds then show some error message to notify the user that
	 * something is wrong.
	 */
	setInterval(function() {
		if(connection.readyState !== 1) {
			status.text('Error');
			input.attr('disabled', 'disabled').val('Unable to communicate ' + 'with the WebSocket server.');
		}
	}, 3000);
});
