$(document).ready(function() {

	// Global variables
	userId = $("#userId").val();
	userName = $("#userName").val();
	contactId = null;
	contactName = null;

	console.log("User: " + userId + " (" + userName + ")");

	// On startup
	$("#mainframe").css('height', $('#wrapper').outerHeight() - $('#header').outerHeight());
	$("#contactlist-wrapper").css('height', $('#left-panel').outerHeight() - $('#searchuser-wrapper').outerHeight());
	$("#conversation-wrapper").css('height', $('#right-panel').outerHeight() - $('#chatinput-wrapper').outerHeight());
	$('#contactlist').change();
	$('input#chatinput-js').attr('disabled', 'disabled').val('Please select a user or add a new user to your contactlist.');

	// Functions
	//$('#settingsMenu').css('right','-1px');	//TODO
	//$('#settingsWrapper').click( function(){ $('#settingsMenu').css('right','-1'); });

	$('#addUser-js').click(function() { prompt("Add User");
	});
	// Eventlistener for the logout button
	$('#logout').click(function() {
		logout();
	});
	// Filter the userlist
	$('#searchInput-js').keyup(function(e) {
		// Check if escape pressed and fire the change event after keyup
		if((e.keyCode || e.which) == 27)
			$('#searchInput-js').val('');
		// Clear input
		$(this).change();
	});
	// Fix to make jQuery's "contains" case insensitive
	jQuery.expr[':'].contains = function(a, i, m) {
		return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
	};

	$('#searchInput-js').change(function() {
		var filter = $(this).val();
		if(filter) {
			// this finds all links in a list that contain the input,
			// and hide the ones not containing the input while showing the ones that do
			$('#contactlist li').find("strong:not(" + filter + ")").parent().parent().hide();
			$('#contactlist li').find("strong:contains(" + filter + ")").parent().parent().show();
		} else {
			$('#contactlist li').show();
		}
		return false;
	});
	// Sort the userlist
	// Source: http://www.onemoretake.com/2009/02/25/sorting-elements-with-jquery/
	$('#contactlist').change(function() {
		var mylist = $(this);

		var online = mylist.children('.online').get();
		online.sort(function(a, b) {
			var compA = $(a).text().toUpperCase();
			var compB = $(b).text().toUpperCase();
			return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
		})
		var offline = mylist.children('.offline').get();
		offline.sort(function(a, b) {
			var compA = $(a).text().toUpperCase();
			var compB = $(b).text().toUpperCase();
			return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
		})

		$.each(online, function(idx, itm) {
			mylist.append(itm);
		});
		$.each(offline, function(idx, itm) {
			mylist.append(itm);
		});
	});
	// Set users availability
	window.setAvailability = function(contactId, available) {
		console.log(contactId + " is " + available);
		element = $("#contactlist #uid" + contactId);
		if(available) {
			element.removeClass('offline');
			element.find(".availability").html('&bull; Online');
			element.addClass('online');
		} else {
			element.removeClass('online');
			element.find(".availability").html('&bull; Offline');
			element.addClass('offline');
		}

		$('#contactlist').change();
		//fire change event for reorganization
	}
	// Set unread count
	function incrementUnreadCount(receiver) {
		var element = $("#contactlist #uid" + receiver + " .unreadCounter");

		// If element doesn't exist add the counter
		if(element.length == 0) {
			$("#contactlist #uid" + receiver).append('<div class="unreadCounter">1</div>');
		} else {
			currentCount = parseInt(element.text(), 10);
			element.html(currentCount + 1);
		}
	}

	// Changing contacts
	$("#contactlist li").click(function() {
		$("#contactlist li").removeClass('selected');
		$(this).addClass('selected');
		$(".unreadCounter", this).remove();
		// remove unread counter

		$('input#chatinput-js').removeAttr('disabled').val('');
		$("input#chatinput-js").focus();

		window.contactId = $(this).attr('id').substring(3, $(this).attr('id').length);
		window.contactName = $(this).find('.username').html();
		$("ul#conversation").html('');
		console.log('Contact changed to ' + contactName + ' (' + contactId + ')');
		requestHistory();
	});
	// Display conversation
	window.newMessage = function(text, sender, date) {
		console.log("Sender: " + sender + " contactId: " + contactId + " userId:" + userId + " at " + date);
		if(sender == contactId || sender == userId) {
			console.log("currentConversation");
			addMessage(text, sender, date);
		} else {
			console.log("notCurrentConversation");
			incrementUnreadCount(sender);
		}
	}
	// Helper function for escaping input strings
	function htmlEntities(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	function addMessage(text, sender, date) {
		var lastMessage = $('.message').last();

		if(sender == contactId) {// incoming
			if(!lastMessage.length || !lastMessage.hasClass('incomingMessage')) {
				// Create message thread
				var newThreadLi = $('<li></li>');
				newThreadLi.html('<div class="message incomingMessage"><img src="images/userimages/' + contactId + '.jpg" alt="userimage' + contactName + '"><div class="messagetext"><strong class="username">' + contactName + '</strong><ul class="messages"></ul><p class="time"></p></div>');
				$('ul#conversation').append(newThreadLi);
				lastMessage = $('.message').last();
			}
		} else {// outgoing
			if(!lastMessage.length || !lastMessage.hasClass('outgoingMessage')) {
				// Create message thread
				var newThreadLi = $('<li></li>');
				newThreadLi.html('<div class="message outgoingMessage"><img src="images/userimages/' + userId + '.jpg" alt="userimage' + userName + '"><div class="messagetext"><strong class="username">' + userName + '</strong><ul class="messages"></ul><p class="time"></p></div>');
				
				$('ul#conversation').append(newThreadLi);
				lastMessage = $('.message').last();
			}
		}

		// Create a new chat entry
		var newMessageLi = $('<li></li>');
		newMessageLi.html('<p>' + htmlEntities(text) + '</p>');

		$(lastMessage).find('.messages').append(newMessageLi);

		var formattedDate = '';
		// TODO: leading zeros when time is e.g. 09:02
		var now = new Date();

		if(date.toDateString() == now.toDateString()) {// If today: only show time
			formattedDate = date.getHours() + ':' + date.getMinutes();
		} else {
			if(date.getFullYear() == now.getFullYear())// If this year: show date+time
				formattedDate = date.getDay() + '/' + date.getMonth() + ' ' + date.getHours() + ':' + date.getMinutes();
			else
				formattedDate = date.getDay() + '/' + date.getMonth() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes();
		}

		$(lastMessage).find('.time').html(formattedDate);
		scrollChat();
	}

	// Chatinput control
	$("input#chatinput-js").keydown(function(e) {
		if(e.keyCode == 13) {
			value = $("input#chatinput-js").val();

			if(value != '') {

				sendMessage(value, contactId);
				// send message to server
				addMessage(value, userId, new Date());
				// display message

				$("input#chatinput-js").val('');
				// empty input
			}
		}
	});
	function scrollChat() {
		$("#conversation-wrapper").scrollTop(9999);
	}

});
