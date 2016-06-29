var updateCaptures = function (node) {
  document.getElementById('black-captures').innerText = node.info.captures[JGO.BLACK];
  document.getElementById('white-captures').innerText = node.info.captures[JGO.WHITE];
};

var jrecord = new JGO.Record(13);
var jboard = jrecord.jboard;
var jsetup = new JGO.Setup(jboard, JGO.BOARD.medium);
var ko = null; // ko coordinates
var lastMove = null; // last move coordinates
var lastHover = false, lastX = -1, lastY = -1; // hover helper vars

// FIXME: Implement handicap
//jboard.setType(JGO.util.getHandicapCoordinates(jboard.width, 2), JGO.BLACK);

function makeMove(coord, plyr) {
  var play = jboard.playMove(coord, plyr, ko);

  if (play.success) {
    node = jrecord.createNode(true);
    node.info.captures[plyr] += play.captures.length; // tally captures
    node.setType(coord, plyr); // play stone
    node.setType(play.captures, JGO.CLEAR); // clear opponent's stones

    if (lastMove) {
      node.setMark(lastMove, JGO.MARK.NONE); // clear previous mark
    }

    if (ko) {
      node.setMark(ko, JGO.MARK.NONE); // clear previous ko mark
      ko = null;
    }

    node.setMark(coord, JGO.MARK.CIRCLE); // mark move
    lastMove = coord;

    if (play.ko) {
      node.setMark(play.ko, JGO.MARK.CIRCLE); // mark ko, too
      ko = play.ko;
    }

    turn = (plyr == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;
    updateCaptures(node);
  }
  else { // Either a bug or someone is doing something naughty
    alert('Illegal move: ' + play.errorMsg);
  }

  return play;
}

function showHover(coord, color) {
  if (coord.i == -1 || coord.j == -1 || (coord.i == lastX && coord.j == lastY))
    return; // either off the board or same spot as last time

  clearHover();

  lastX = coord.i;
  lastY = coord.j;

  // Show a "hover" stone if it's the player's turn
  if (jboard.getType(coord) == JGO.CLEAR &&
      jboard.getMark(coord) == JGO.MARK.NONE) {
    jboard.setType(coord, color == JGO.WHITE ? JGO.DIM_WHITE : JGO.DIM_BLACK);
    lastHover = true;

    if (color == player) {
      data = JSON.stringify({hover: { i: coord.i, j: coord.j }});
      dataChannel.send(data);
    }
  }
  else {
    lastHover = false;
  }

}

function clearHover() {
  if(lastHover) { // clear previous hover if there was one
    jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);
    lastHover = false;
  }
}

jsetup.setOptions(
  {stars: {points:5},
   coordinates: {top:false, bottom:true, left:true, right:false}
});

jsetup.create('board', function(canvas) {
  canvas.addListener('click', function(coord, ev) {
    if(ev.shiftKey) { // on shift make a mark
      if(jboard.getMark(coord) == JGO.MARK.NONE)
        jboard.setMark(coord, JGO.MARK.SELECTED);
      else
        jboard.setMark(coord, JGO.MARK.NONE);

      return; // Marks are local only
    }

    if (turn != player) {
      return; // Not this player's turn
    }
    // clear hover away - it'll be replaced or it will be an illegal move
    // in any case so no need to worry about putting it back afterwards
    clearHover();

    var localPlay = makeMove(coord, player);

    if (localPlay.success) {
      // When a local play succeeds, send it to the opponent
      data = JSON.stringify({move: { i: coord.i, j: coord.j }});
      dataChannel.send(data);
    }
  });

  canvas.addListener('mousemove', function(coord, ev) {
    if (turn == player) {
      showHover(coord, player);
    }
  });

  canvas.addListener('mouseout', function(ev) {
    clearHover();
  });
});
