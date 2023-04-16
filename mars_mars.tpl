{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- mars implementation : © Alena Laskavaia <laskava@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------
-->

<div id="thething">
  <div id="hand_area" class="whiteblock">
    <div class="hand" id="hand_{CURRENT_PLAYER_COLOR}"></div>
  </div>
  <div id="main_area">
    <div id="params">
    </div>
    <div id="display_main">
    </div>
    <div id="map">
       <div class="hex" id="hex_1_1"></div>
       <div class="hex" id="hex_1_2"></div>
       <div class="hex" id="hex_2_2"></div>
    </div>
    <div id="decks_area">
      <div id="deck_main" class="card carddeck"></div>
      <div id="discard_main" class="card carddeck"></div>
    </div>
  </div>
  <div id="players_area">
    <!-- BEGIN player_board -->
    <div id="tableau_{PLAYER_COLOR}" class="whiteblock"></div>
	  <div id="miniboard_{PLAYER_COLOR}">
		  <div id="counter_hand_{PLAYER_COLOR}"></div>
      <div id="tracker_pm_{PLAYER_COLOR}"></div>
      <div id="tracker_m_{PLAYER_COLOR}"></div>
      <div id="tracker_tm_{PLAYER_COLOR}"></div>
	  </div>
    <!-- END player_board -->
  </div>
  <div id="limbo"></div>
  <div id="dev_null" class="defhidden"></div>
  <div id="oversurface"></div>
</div>

{OVERALL_GAME_FOOTER}
