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
    <div id="map">
      <div class="map_bg"></div>
      <div class="map_hexes">

        <div class="hex" id="hex_3_1"></div>
        <div class="hex" id="hex_4_1"></div>
        <div class="hex" id="hex_5_1"></div>
        <div class="hex" id="hex_6_1"></div>
        <div class="hex" id="hex_7_1"></div>

        <div class="hex even" id="hex_3_2"></div>
        <div class="hex even" id="hex_4_2"></div>
        <div class="hex even" id="hex_5_2"></div>
        <div class="hex even" id="hex_6_2"></div>
        <div class="hex even" id="hex_7_2"></div>
        <div class="hex even" id="hex_8_2"></div>

        <div class="hex" id="hex_2_3"></div>
        <div class="hex" id="hex_3_3"></div>
        <div class="hex" id="hex_4_3"></div>
        <div class="hex" id="hex_5_3"></div>
        <div class="hex" id="hex_6_3"></div>
        <div class="hex" id="hex_7_3"></div>
        <div class="hex" id="hex_8_3"></div>

        <div class="hex even" id="hex_2_4"></div>
        <div class="hex even" id="hex_3_4"></div>
        <div class="hex even" id="hex_4_4"></div>
        <div class="hex even" id="hex_5_4"></div>
        <div class="hex even" id="hex_6_4"></div>
        <div class="hex even" id="hex_7_4"></div>
        <div class="hex even" id="hex_8_4"></div>
        <div class="hex even" id="hex_9_4"></div>

        <div class="hex" id="hex_1_5"></div>
        <div class="hex" id="hex_2_5"></div>
        <div class="hex" id="hex_3_5"></div>
        <div class="hex" id="hex_4_5"></div>
        <div class="hex" id="hex_5_5"></div>
        <div class="hex" id="hex_6_5"></div>
        <div class="hex" id="hex_7_5"></div>
        <div class="hex" id="hex_8_5"></div>
        <div class="hex" id="hex_9_5"></div>

        <div class="hex even" id="hex_2_6"></div>
        <div class="hex even" id="hex_3_6"></div>
        <div class="hex even" id="hex_4_6"></div>
        <div class="hex even" id="hex_5_6"></div>
        <div class="hex even" id="hex_6_6"></div>
        <div class="hex even" id="hex_7_6"></div>
        <div class="hex even" id="hex_8_6"></div>
        <div class="hex even" id="hex_9_6"></div>

        <div class="hex" id="hex_2_7"></div>
        <div class="hex" id="hex_3_7"></div>
        <div class="hex" id="hex_4_7"></div>
        <div class="hex" id="hex_5_7"></div>
        <div class="hex" id="hex_6_7"></div>
        <div class="hex" id="hex_7_7"></div>
        <div class="hex" id="hex_8_7"></div>

        <div class="hex even" id="hex_3_8"></div>
        <div class="hex even" id="hex_4_8"></div>
        <div class="hex even" id="hex_5_8"></div>
        <div class="hex even" id="hex_6_8"></div>
        <div class="hex even" id="hex_7_8"></div>
        <div class="hex even" id="hex_8_8"></div>

        <div class="hex" id="hex_3_9"></div>
        <div class="hex" id="hex_4_9"></div>
        <div class="hex" id="hex_5_9"></div>
        <div class="hex" id="hex_6_9"></div>
        <div class="hex" id="hex_7_9"></div>


        <div class="hex outer" id="hex_0_1"></div>
        <div class="hex outer" id="hex_0_2"></div>
        <div class="hex outer" id="hex_0_3"></div>
      </div>

    </div>
    <div id="params">
    </div>
    <div id="display_main">
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
