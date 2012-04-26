var userCounter = 1;

UserProvider = function() {
};

UserProvider.prototype.dummyData = [];

UserProvider.prototype.findAll = function(callback) {
	callback(null, this.dummyData)
};

UserProvider.prototype.findById = function(id, callback) {
	var result = null;
	for(var i = 0; i < this.dummyData.length; i++) {
		if(this.dummyData[i]._id == id) {
			result = this.dummyData[i];
			break;
		}
	}
	callback(null, result);
};

UserProvider.prototype.findContacts = function(uid, callback) {
	var result = [];
	for(var i = 0; i < this.dummyData.length; i++) {
		if(this.dummyData[i]._id == uid) {	// When correct user if found
			console.log('UserProvider: user found');
			for(var j = 0; j < this.dummyData[i].contacts.length; j++) {
				console.log('UserProvider: number of contacts: '+this.dummyData[i].contacts.length);
				if(this.dummyData[i].contacts[j].accepted == 'true') {
					this.findById(this.dummyData[i].contacts[j].contactId,function(error, user) {
						result.push(user);
						console.log('user_id: '+user._id)
					})
				}
			}
			break;
		}
	}
	callback(null, result);
};

UserProvider.prototype.save = function(users, callback) {
	var user = null;

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
		this.dummyData[this.dummyData.length] = user;
	}
	callback(null, users);
};
/* Lets bootstrap with dummy data */
new UserProvider().save([{
	username : 'Peter',
	contacts : [{
		contactId : '2',
		accepted : 'true'
	}, {
		contactId : '3',
		accepted : 'true'
	}, {
		contactId : '4',
		accepted : 'false'
	}]
}, {
	username : 'Fritz',
	contacts : [{
		contactId : '3',
		accepted : 'true'
	}]
}, {
	username : 'Hubert'
}, {
	username : 'Sepp'
}], function(error, users) {
});

exports.UserProvider = UserProvider;
