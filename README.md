## Vision
Real time two-player Go in the browser.

## About

Jago ("Yah-GO") is in early development, and is intended to become a complete Go game server and community.

## Running

  * Install node.js
  * Run `npm install`
  * Run `node server.js`
  * Open `localhost:3000` in two different Chrome windows
    * It doesn't work in Firefox yet

## Planned Features
  * Chat (+optional audio/video)
  * "one click" game start
  * Rankings
  * Public & private games
  * Random matching (or not)
  * Saved game history
  * User profiles & preferences
  * Pause/resume/forfeit games
  * Sound
  * Time limits
  * Teaching games

## TODO
  * M1: Integrate jGoBoard: https://github.com/jokkebk/jgoboard
    * <del>Basic POC</del>
  * M1: Implement webRTC, POC: Two browsers control one board
    * <del>Read https://webrtchacks.com/datachannel-multiplayer-game/</del>
    * <del>Read http://www.html5rocks.com/en/tutorials/webrtc/datachannels/</del>
    * <del>POC: Transfer data between two browsers</del>
    * <del>Clean up chat</del>
    * <del>Clean up UI a bit, select player</del>
    * <del>Transfer moves & enable/disable local board control</del>
    * <del>Handle invalid moves/cheating attempts</del>
    * Heartbeat/notice disconnects
    * Handle reconnects
  * M1: Setup test framework
  * M1: Setup "production" stun server
  * M1: Setup "production" environment

## Milestones

### Milestone 1
  1. Working game between two players with chat

### RELEASE 1.0
  1. Full 9x9 game over webRTC, with score and declared winner.
  2. Multiple games, start new game, view in progress game.
  3. In-game chat, pause/resume forfeit games, time limits.
  4. Profiles, rankings, game history.
  5. Other board sizes, configure board options, Sound.
  6. Audio & video Chat.
  7. Teaching games & other game types.
  8. Code of conduct.

### RELEASE _FUTURE_
  * Moderation/warnings/bans/etc
  * Rooms & room Chat
  * Undo request/accept
  * Download/upload .sgf files
  * Game library - enhance game history with uploaded games/etc.

## License

Jago is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/4.0/deed.en_US

Jago uses the "jGoBoard" library from http://jgoboard.com, which is also CC BY-NC licensed.

## Tutorials/documentation

Based on https://github.com/webrtc/samples/tree/gh-pages/src/content/datachannel/basic and https://github.com/agilityfeat/memory-webrtc-data-channel
