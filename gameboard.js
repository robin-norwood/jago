"use strict";
// FIXME: Really hating how I implemented "white" and "black" here. :(

var sequence = 1;
const crypto = require('crypto');
const hash_algorithm = 'sha256';
const STATUS_CREATED = 1;
const STATUS_IN_PROGRESS = 2;
const STATUS_FINISHED = 3;

class GameBoard {
  constructor(options) {
    this.seq = sequence++;
    this._salt = this.make_salt();
    this.black_secret = null;
    this.white_secret = null;
    this.status = STATUS_CREATED;
  }

  join(player) { // Ugly function. :(
    // Join as 'player', returns new player's secret key
    this._check_player(player);

    if (player == "black") {
      if (this.black_secret) {
        throw "Black already joined";
      }

      this.black_secret = this.make_secret("black");

      return this.black_secret;
    }
    else if (player == "white") {
      if (this.white_secret) {
        throw "White already joined";
      }

      this.white_secret = this.make_secret("white");

      return this.white_secret;
    }

    if (this.black_secret && this.white_secret) {
      this.status = STATUS_IN_PROGRESS;
    }

  }

  is_available(player) {
    this._check_player(player);

    if (player == "white") {
      return Boolean(! this.white_secret);
    }

    return Boolean(! this.black_secret);
  }

  opposite_color(player) {
    this._check_player(player);

    if (player == "white") {
      return "black";
    }

    return "white";
  }

  make_salt() {
    // Make a random salt value
    const letters = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var salt = "";
    for (var i=0; i<32; i++) {
      salt += letters.charAt(Math.floor((Math.random() * letters.length)));
    }

    return salt;
  }

  make_secret(player) {
    // Make a secret string based on the player, sequence, and salt
    this._check_player(player);

    const hash = crypto.createHash(hash_algorithm);
    hash.update(this._salt + this.seq.toString() + player);

    return hash.digest('hex');
  }

  check_secret(player, proposed) {
    // Check the proposed secret against the saved on
    this._check_player(player);
    var secret = this.make_secret(player);

    return Boolean(secret == proposed);
  }

  _check_player(player) {
    if (! ((player == "white") || (player == "black"))) {
      throw "Invalid player";
    }

    return;
  }
};

exports.GameBoard = GameBoard;
exports.STATUS_CREATED = STATUS_CREATED;
exports.STATUS_IN_PROGRESS = STATUS_IN_PROGRESS;
exports.STATUS_FINISHED = STATUS_FINISHED;
