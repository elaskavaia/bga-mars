Random notes on todo items

## General

* Colonies

## Server

* Private info leak in tokensUpdate notification (PGameXBody::getTokensUpdate / notifyTokensUpdate).
  The "card" op is skipped only when `$player_id != getCurrentPlayerId()`, but the result goes out with
  notifyAllPlayers, so when the acting player is the one being updated their whole hand playability
  (card ids + info) is broadcast to everyone. State args were fixed separately via `_private`.

## Client - Both layouts


## Client - Digital layout

* Get assets with layout but no language and redo all cards

## Client - Cardboard layout


### Client Bonus Features

* Card reference - done
  * with filters - basic search added
* Sounds
* Flip animation
* Log scratch on undo

## Assets

