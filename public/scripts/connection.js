'use strict';

/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// FIXME: Rewrite all of this to use Promise(s) instead of callbacks

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
var connectButton = document.querySelector('button#connectButton');
var sendButton = document.querySelector('button#sendButton');
var disconnectButton = document.querySelector('button#disconnectButton');
var statusArea = document.querySelector('#statusArea');
var players = [null, "black", "white"];
var player = null;
var turn = JGO.BLACK; // black goes first

connectButton.onclick = openDataChannel;
sendButton.onclick = sendData;
disconnectButton.onclick = closeDataChannel;

dataChannelSend.addEventListener('keypress', function(event) {
  if (event.keyCode == 13) { // enter
    event.preventDefault();
    sendButton.click();
  }
});

var signalRoom = "chatroom";

// Browser compatability for webRTC
var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
                        window.webkitRTCPeerConnection;

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
io.emit('client_ready', {"signal_room": signalRoom});

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
  else if (data.type == 'owner') {
    trace("Got owner signal");
    player = JGO.BLACK;
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

  io.emit('signal', {"type": "user_here", "message": "Would you like to play a game?", "room": signalRoom});
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
      "message": JSON.stringify({ 'candidate': event.candidate }), "room": signalRoom});
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

  connectButton.disabled = true;
  sendButton.disabled = false;
  disconnectButton.disabled = false;

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

  connectButton.disabled = true;
  sendButton.disabled = false;
  disconnectButton.disabled = false;

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

  connectButton.disabled = false;
  sendButton.disabled = true;
  disconnectButton.disabled = true;
  status("Disconnected")
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

function closeDataChannel() {
  status('Closing data channel');
  dataChannel.close();
  trace('Closed data channel with label: ' + dataChannel.label);

  dataChannelSend.value = '';
  dataChannelSend.placeholder = 'Not connected';
  dataChannelSend.disabled = true;

  sendButton.disabled = true;
  disconnectButton.disabled = true;
  status("Disconnected")
}

function offerDescription(desc) {
  trace('Offer from peerConnection \n' + desc.sdp);
  peerConnection.setLocalDescription(desc, function () {
    io.emit('signal',
      {"type": "SDP", "message": JSON.stringify({ 'sdp': peerConnection.localDescription }), "room": signalRoom}
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
  cite.appendChild(document.createTextNode(who + ": "))

  quote.appendChild(cite);
  quote.appendChild(document.createTextNode(message));

  dataChannelReceive.appendChild(quote);

  return;
}

function onReceiveMessage(event) {
  trace('Received Message');
  var message = JSON.parse(event.data);

  if (message.chat) {
    addChatMessage("other", message.chat.text);
  }
  else if (message.announce) {
    var otherColor = message.announce.myColor;
    if (otherColor == players[player]) {
      trace("ERROR: Other player tried to claim my color: " + players[player]); // FIXME: Handle this better
    }
    else if (! player) { // I don't have a color yet, so I must be...
      player = JGO.WHITE;
      var data = JSON.stringify({announce: { myColor: players[player] }});
      dataChannel.send(data);
    }

    addChatMessage("other", "I will play " + otherColor);
  }
  else if (message.move) {
    var move = new JGO.Coordinate(message.move.i, message.move.j);
    var opp = (player == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;
    var play = makeMove(move, opp);
  }
}

createConnection();
