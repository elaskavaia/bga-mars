
define([
  "dojo",
  "dojo/_base/declare",
  "ebg/core/gamegui",
  "ebg/counter"
], function (dojo, declare) {
  declare("bgagame.mars", ebg.core.gamegui, new GameXBody());
});
