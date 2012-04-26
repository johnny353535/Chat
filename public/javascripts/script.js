$(document).ready(function() {

	// Global variables
	uid = 1;
	contact = null;
	contact = 2;

	// On startup
	$("#mainframe").css('height', $('#wrapper').outerHeight() - $('#header').outerHeight());
	$("#contactlist-wrapper").css('height', $('#left-panel').outerHeight() - $('#searchuser-wrapper').outerHeight());
	$("#conversation-wrapper").css('height', $('#right-panel').outerHeight() - $('#chatinput-wrapper').outerHeight());
	scrollChat();
	$("input#chatinput-js").focus();

	// Testing
	incrementUnreadCount(3);
	incrementUnreadCount(4);

	// functions
	//$('#settingsMenu').css('right','-1px');	//TODO
	//$('#settingsWrapper').click( function(){ $('#settingsMenu').css('right','-1'); });

	$('#addUser-js').click(function() { prompt("Add User");
	});
	// filter the userlist
	$('#searchInput-js').keyup(function(e) {
		// Check if escape pressed and fire the change event after keyup
		if((e.keyCode || e.which) == 27)
			$('#searchInput-js').val('');
		// Clear input
		$(this).change();
	});
	// fix to make jQuery's "contains" case insensitive
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
	// sort the userlist
	// source: http://www.onemoretake.com/2009/02/25/sorting-elements-with-jquery/
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

	$('#contactlist').change();
	$('#contactlist li:first-child').addClass('selected');

	// set users availability
	// @status: 0=offline, 1=offline
	function setAvailability(uid, status) {
		element = $("#contactlist #uid" + uid);
		if(status == 0) {
			element.removeClass('online');
			element.addClass('offline');
		} else if(status == 1) {
			element.removeClass('offline');
			element.addClass('online');
		}

		$('#contactlist').change();
		//fire change event for reorganization
	}

	// set unread count
	function incrementUnreadCount(uid) {
		element = $("#contactlist #uid" + uid + " .unreadCounter");

		// If elment doesn't exist add the counter
		if(element.length == 0) {
			$("#contactlist #uid" + uid).append('<div class="unreadCounter">1</div>');
			//$("#contactlist #uid"+uid+" .unreadCounter").effect("bounce", { times:3 }, 300);
		} else {
			currentCount = parseInt(element.text(), 10);
			element.html(currentCount + 1);
		}
	}

	// changing contacts

	$("#contactlist li").click(function() {
		$("#contactlist li").removeClass('selected');
		$(this).addClass('selected');
		$(".unreadCounter", this).remove();
		// remove unread counter

		id = $(this).attr('id');
		loadConversation(id.substring(4, id.length));
	});
	// display conversation

	function loadConversation(contact) {
		window.contact = contact;
	}


	window.addMessage = function(value, contact, time) {

		// TODO add notification if contact is not being displayed
		var lastMessage = $('.message').last();
		if(uid == contact) {// incoming
			if(!lastMessage.hasClass('incomingMessage')) {
				// Create message thread
				var newMessage = $('<li></li>');
				newMessage.html('<div class="message incomingMessage"><img src="images/userimages/' + contact + '.jpg"><div class="messagetext"><strong class="username">' + contact + '</strong><ul class="messages"></ul><p class="time"></p></div>');
				$('#conversation ul').append(newMessage);
				lastMessage = $('.message').last();
			}
		} else {// outgoing
			if(!lastMessage.hasClass('outgoingMessage')) {
				// Create message thread
				var newMessage = $('<li></li>');
				newMessage.html('<div class="message outgoingMessage"><img src="images/userimages/' + contact + '.jpg"><div class="messagetext"><strong class="username">' + contact + '</strong><ul class="messages"></ul><p class="time"></p></div>');
				$('ul#conversation').append(newMessage);
				lastMessage = $('.message').last();
			}
		}
		// Create a new chat entry
		var li = $('<li></li>');
		li.html('<p>' + value + '</p>');

		$(lastMessage).find('.messages').append(li);
		// Add message
		$(lastMessage).find('.time').html(new Date().getTime());
		// Update time
		scrollChat();
	}
	// chatinput control
	$("#chatinput-js").keydown(function(e) {
		if(e.keyCode == 13) {
			value = $("#chatinput-js").val();

			sendMessage(value, contact);
			// send message to server
			addMessage(value, contact, new Date());
			// display message

			$("#chatinput-js").val('');
			// empty input
		}
	});
	function scrollChat() {
		$("#conversation-wrapper").scrollTop(9999);
	}

});
