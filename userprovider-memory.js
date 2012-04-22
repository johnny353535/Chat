var userCounter = 1;

UserProvider = function(){};
UserProvider.prototype.dummyData = [];

UserProvider.prototype.findAll = function(callback) {
  callback( null, this.dummyData )
};

UserProvider.prototype.findById = function(id, callback) {
  var result = null;
  for(var i =0;i<this.dummyData.length;i++) {
    if( this.dummyData[i]._id == id ) {
      result = this.dummyData[i];
      break;
    }
  }
  callback(null, result);
};

UserProvider.prototype.save = function(users, callback) {
  var user = null;

  if( typeof(users.length)=="undefined")
    users = [users];

  for( var i =0;i< users.length;i++ ) {
    user = users[i];
    user._id = userCounter++;
    user.created_at = new Date();

    if( user.contacts === undefined )
      user.contacts = [];

    for(var j =0;j< user.contacts.length; j++) {
      user.contacts[j].created_at = new Date();
    }
    this.dummyData[this.dummyData.length]= user;
  }
  callback(null, users);
};

/* Lets bootstrap with dummy data */
new UserProvider().save([
  {username: 'Peter', contacts:[{contactId:'2', accepted:'true'}, {contactId:'3', accepted:'false'}]},
  {username: 'Fritz'},
  {username: 'Hubert'},
  {username: 'Sepp'}
], function(error, users){});

exports.UserProvider = UserProvider;