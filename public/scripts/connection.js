'use strict';

/*
 * Handle connection and player negotiation.
 *
 * Based on WebRTC demo code.
 *
 */

// FIXME: Rewrite all of this to use Promises instead of callbacks

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ' + text);
  } else {
    console.log(text);
  }
}

function status(text) {
  trace(text);

  statusArea.innerHTML = text;
}

function logError(error) {
	trace(error.name + ': ' + error.message);
}

var peerConnection;
var dataChannel;
var dataChannelSend = document.querySelector('input#dataChannelSend');
var dataChannelReceive = document.querySelector('#dataChannelReceive');
var sendButton = document.querySelector('button#sendButton');
var statusArea = document.querySelector('#statusArea');
var players = [null, "black", "white"];
var player = null;
var player_secret = null;

var turn = JGO.BLACK; // black goes first

sendButton.onclick = sendData;

dataChannelSend.addEventListener('keypress', function(event) {
  if (event.keyCode == 13) { // enter
    event.preventDefault();
    sendButton.click();
  }
});

// Browser compatability for webRTC
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
                        window.webkitRTCPeerConnection;

if (! RTCPeerConnection) {
  alert("This only works with modern browsers");
}

var RTCPeerConfiguration = {
	'iceServers': [{
		'urls': 'stun:stun.l.google.com:19302' /* FIXME: demo only */
	}]
};

var dataChannelConfiguration = {
  ordered: true,
  maxRetransmitTime: 5000 //milliseconds
};

status("Initializing");

// Set up Socket.io
trace("Setting up socket.io");
io = io.connect();

var game_id = window.location.pathname.split("/").pop();
var color_pref = window.location.hash || "#";
color_pref = color_pref.slice(1);
window.location.hash = '';

trace("Requesting color " + color_pref)
trace("Connecting to game " + game_id);

io.emit('client_ready', { "room": "game_" + game_id,
                          "game_id": game_id,
                          "color_pref": color_pref });

io.on('signaling_message', function(data) {
  trace('Signal received: ' + data.type);

  if (!peerConnection) {
    createConnection();
  }

  if (data.type == 'ice_candidate') {
    status("Got ICE candidate");
    var message = JSON.parse(data.message);
    trace('Adding ice candidate: ' + message.candidate);
    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
  }
  else if (data.type == 'SDP') {
    status("Got remote session");
    var message = JSON.parse(data.message);

    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
      // if we received an offer, we need to answer
      status('Setting remote description');
      if (peerConnection.remoteDescription.type == 'offer') {
        peerConnection.createAnswer(offerDescription, logError);
      }
    }, logError);
  }
  else if (data.type == 'user_here' && !dataChannel) {
    // Another client connected; create our data channel and negotiate communication
    status("Connecting to remote client");
    openDataChannel();
  }
  else if (data.type == 'joined') {
    trace("Got joined signal");
    player_secret = data.player_secret;
    if (data.player_color == "black") {
      trace("I am playing black");
      player = JGO.BLACK;
    }
    else {
      trace("I am playing white");
      player = JGO.WHITE;
    }
  }
});

function createConnection() {
  if (peerConnection) {
    return;
  }

  status("Setting up connection");
  peerConnection = new RTCPeerConnection(RTCPeerConfiguration);
  trace('Created peer connection object peerConnection');

  peerConnection.onicecandidate = iceCallback;
  peerConnection.ondatachannel = receiveChannelCallback;
  peerConnection.onnegotiationneeded = negotiationCallback;

  io.emit('signal', {"type": "user_here",
                     "message": "Would you like to play a game?",
                     "room": "game_" + game_id});

  status("Waiting for remote client");
}

function iceCallback(event) {
  trace('Ice callback');
  if (!peerConnection || !event || !event.candidate) {
    trace("Returning...");
  }
  if (event.candidate) {
    trace('ICE candidate: \n' + event.candidate.candidate);
    io.emit('signal', {"type": "ice_candidate",
                       "message": JSON.stringify({ 'candidate': event.candidate }),
                       "room": "game_" + game_id});
  }
}

function negotiationCallback() {
  status('Creating session offer');
  peerConnection.createOffer(offerDescription, function (error) {
    trace('Failed to create session description: ' + error.toString());
  });
};

function openDataChannel() {
  dataChannel = peerConnection.createDataChannel('sendDataChannel',
    dataChannelConfiguration);
  status('Created data channel');

  dataChannel.onopen = onDataChannelOpen;
  dataChannel.onclose = onDataChannelClose;
  dataChannel.onmessage = onReceiveMessage;

  dataChannelSend.placeholder = '';
  dataChannelSend.disabled = false;
  dataChannelSend.focus();

  sendButton.disabled = false;

  status('Ready');
}

function receiveChannelCallback(event) {
  status('Received data channel');
  dataChannel = event.channel;

  dataChannel.onopen = onDataChannelOpen;
  dataChannel.onclose = onDataChannelClose;
  dataChannel.onmessage = onReceiveMessage;
}

function onDataChannelOpen() {
  trace('Data channel state is: ' + dataChannel.readyState);

  dataChannelSend.placeholder = '';
  dataChannelSend.disabled = false;
  dataChannelSend.focus();

  sendButton.disabled = false;

  status('Ready');

  if (player) {
    var data = JSON.stringify({announce: { myColor: players[player] }});
    dataChannel.send(data);
  }
}

function onDataChannelClose() {
  status("Closing data channel");
  trace('Data channel state is: ' + dataChannel.readyState);

  dataChannelSend.value = '';
  dataChannelSend.placeholder = 'Not connected';
  dataChannelSend.disabled = true;

  sendButton.disabled = true;
  status("Disconnected");
}

function sendData() {
  status("Sending...");

  var data = JSON.stringify({chat: { text: dataChannelSend.value }});

  dataChannel.send(data);
  addChatMessage("self", dataChannelSend.value);
  trace('Sent Data: ' + dataChannelSend.value);
  dataChannelSend.value = '';

  status("Ready");
}

function closeDataChannel() { // Not used at the moment
  status('Closing data channel');
  dataChannel.close();
  trace('Closed data channel with label: ' + dataChannel.label);

  dataChannelSend.value = '';
  dataChannelSend.placeholder = 'Not connected';
  dataChannelSend.disabled = true;

  sendButton.disabled = true;
  status("Disconnected");
}

function offerDescription(desc) {
  trace('Offer from peerConnection \n' + desc.sdp);
  peerConnection.setLocalDescription(desc, function () {
    io.emit('signal', {"type": "SDP",
                       "message": JSON.stringify({ 'sdp': peerConnection.localDescription }),
                       "room": "game_" + game_id}
    );
  }, logError);
}

function addChatMessage(who, message) {
  if (message.length == 0) {
    return;
  }

  var quote = document.createElement('blockquote');
  quote.className = "chatArea--chatMessage chatArea--chatMessage__" + who;

  var cite = document.createElement('cite');
  cite.appendChild(document.createTextNode(who + ": "));

  quote.appendChild(cite);
  quote.appendChild(document.createTextNode(message));

  dataChannelReceive.appendChild(quote);

  return;
}

function onReceiveMessage(event) {
  trace('Received Message -> ' + event.data);
  var message = JSON.parse(event.data);

  if (message.chat) {
    trace(' chat: ' + message.chat.text)
    addChatMessage("other", message.chat.text);
  }
  else if (message.announce) {
    trace(' announce: ' + message.announce.myColor);
    addChatMessage("other", "I will play " + message.announce.myColor);
  }
  else if (message.move) {
    trace(' move: (' + message.move.i + ', ' + message.move.j +')');

    var move = new JGO.Coordinate(message.move.i, message.move.j);
    var opp = (player == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;
    clearHover();
    var play = makeMove(move, opp);
  }
  else if (message.pass) {
    trace(' pass');
    var opp = (player == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;
    clearHover();
    var play = makeMove(null, opp);
    addChatMessage("other", "pass");
  }
  else if (message.hover) {
    trace(' hover: (' + message.hover.i + ', ' + message.hover.j + ')');
    var hover = new JGO.Coordinate(message.hover.i, message.hover.j);
    var opp = (player == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;
    showHover(hover, opp);
  }
}

createConnection();
