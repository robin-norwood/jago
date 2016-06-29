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
var gb = require('./gameboard');
var board = null;

var app = express();
app.use(express.bodyParser());

app.http().io();

var PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('server started on port ' + PORT);

// Static content
// FIXME: Serve static content elsewhere?

app.use(express.static(__dirname + '/public'));

// end FIXME

var boards = [];

// HTTP routes

app.get('/', function(req, res) {
	var open_games = [];
	var in_progress_games = [];

	for (var i=0; i<boards.length; i++) {
		if (boards[i].status == gb.STATUS_CREATED) {
			open_games.push(boards[i]);
		}
		if (boards[i].status == gb.STATUS_IN_PROGRESS) {
			in_progress_games.push(boards[i]);
		}
	}

	res.render('index.ejs', { open_games: open_games,
	 												  in_progress_games: in_progress_games });
});

app.post('/game', function(req, res) {
	board = new gb.GameBoard();
	boards.push(board);

	res.redirect('/game/' + board.seq.toString() + '#' + req.body.color);
});

app.get('/game/:id', function(req, res) {
	res.render('game.ejs', { data: { gameid: req.params.id }});
});

// Socket.io routes

app.io.route('client_ready', function(req) {
	console.log("Got client ready for game: " + req.data.game_id);
	req.io.join(req.data.room); // Join the room to get more messages

	var color_pref = req.data.color_pref || "black";
	console.log("color_pref: " + req.data.color_pref);

	var board = null;
	for (var i=0; i<boards.length; i++) {
		if (boards[i].seq.toString() == req.data.game_id) {
			board = boards[i];
		}
	}

	if (! board) {
		throw "Board not found: " + req.data.game_id;
	}

	console.log("Found board " + board.seq.toString());

	if (board.status == gb.STATUS_IN_PROGRESS) {
		// FIXME: Handle observers
	}
	else {
		var player_color = null;
		var player_secret = null;

		if (board.is_available(color_pref)) {
			player_color = color_pref;
		}
		else {
			player_color = board.opposite_color(color_pref);
		}

		console.log("Assigned color " + player_color);

		player_secret = board.join(player_color);

		console.log("Sending joined signal");
		req.io.emit('signaling_message', {type: 'joined',
																			message: "You've joined the game",
																		  player_color: player_color,
																		  player_secret: player_secret});
	}
})

app.io.route('signal', function(req) {
	// Note the use of req instead of app here for broadcasting so
	// the sender doesn't receive their own messages
	console.log("Got signal from room: " + req.data.room);
	console.log("  type: " + req.data.type);
	req.io.room(req.data.room).broadcast('signaling_message', {
        type: req.data.type,
				message: req.data.message
    });
})
