/*
This code was developed by @ArinSime and WebRTC.ventures for a WebRTC blog post.
You are welcome to use it at your own risk as starter code for your applications,
but please be aware that this is not a complete code example with all the necessary
security and privacy considerations implemented that a production app would require.
It is for educational purposes only, and any other use is done at your own risk.
*/

//FIXME: Do that ^^

//Server.js:  This is the core Node.js configuration code, and also used for
//setting up signaling channels to be used by socket.io

var express = require('express.io');
var app = express();
app.http().io();
var PORT = 3000;
console.log('server started on port ' + PORT);

// FIXME: Serve static content elsewhere

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
	res.render('connection.ejs');
});

// END FIXME

app.listen(process.env.PORT || PORT);

// FIXME: sucks that we're keeping state for the room here.
// Find a better way, or at least support multiple rooms without too much overhead.
var roomClaimed = false;

app.io.route('client_ready', function(req) {
	console.log("Got client ready for room: " + req.data.signal_room);
	req.io.join(req.data.signal_room); // Join the room and wait for more signals
	if (! roomClaimed) {
		console.log("Sending owner signal");
		req.io.emit('signaling_message', {type: 'owner',
																			message: 'You own the room'})
		roomClaimed = true;
	}
})

app.io.route('signal', function(req) {
	// Note the use of req instead of app here for broadcasting so
	// only the sender doesn't receive their own messages
	console.log("Got signal from room: " + req.data.room);
	console.log("  type: " + req.data.type);
	req.io.room(req.data.room).broadcast('signaling_message', {
        type: req.data.type,
				message: req.data.message
    });
})
