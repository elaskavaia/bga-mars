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
    <div class="hand location" id="hand_{CURRENT_PLAYER_COLOR}"></div>
    <div class="draw location" id="draw_{CURRENT_PLAYER_COLOR}"></div>
  </div>
  <div id="main_area">
    <div id="main_board">
      <div id="map_middle">
        <div id="map_top">
          <div id="oxygen_map">
            <div class="oxygen_scale">
              <div class="oxygen_scale_item" data-val="0"></div>
              <div class="oxygen_scale_item" data-val="1"></div>
              <div class="oxygen_scale_item" data-val="2"></div>
              <div class="oxygen_scale_item" data-val="3"></div>
              <div class="oxygen_scale_item" data-val="4"></div>
              <div class="oxygen_scale_item" data-val="5"></div>
              <div class="oxygen_scale_item" data-val="6"></div>
              <div class="oxygen_scale_item" data-val="7"></div>
              <div class="oxygen_scale_item" data-val="8"></div>
              <div class="oxygen_scale_item" data-val="9"></div>
              <div class="oxygen_scale_item" data-val="10"></div>
              <div class="oxygen_scale_item" data-val="11"></div>
              <div class="oxygen_scale_item" data-val="12"></div>
              <div class="oxygen_scale_item" data-val="13"></div>
              <div class="oxygen_scale_item" data-val="14"></div>

            </div>
          </div>
        </div>
        <div id="map_left">

          <div id="decks_area">
            <div id="deck_main" class="card carddeck"></div>
            <div id="discard_main" class="card carddeck"></div>
            <div id="oceans_pile" class="tile tile_3"></div>
          </div>
          <div id="standard_projects_area">
            <div id="standard_projects_title_zone">
              <div id="standard_projects_title" class="standard_projects_title">Standard projects</div>
            </div>
            <div id="display_main">
            </div>
          </div>
          <div class="hex outer" id="hex_0_1"></div>
          <div class="hex_phobos"><div class="hex outer" id="hex_0_2"></div></div>
          <div class="hex_ganymede"><div class="hex outer" id="hex_0_3"></div></div>
        </div>
        <div id="map">
          <div class="map_bg"></div>
          <div id="map_hexes" class="map_hexes">

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
            <div class="hex even" id="hex_5_4"> </div>
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



          </div>
        </div>
        <div id="map_right">
          <div id="temperature_map">
            <div class="temperature_scale">
              <div class="temperature_scale_item" data-val="-30"></div>
              <div class="temperature_scale_item" data-val="-28"></div>
              <div class="temperature_scale_item" data-val="-26"></div>
              <div class="temperature_scale_item" data-val="-24"></div>
              <div class="temperature_scale_item" data-val="-22"></div>
              <div class="temperature_scale_item" data-val="-20"></div>
              <div class="temperature_scale_item" data-val="-18"></div>
              <div class="temperature_scale_item" data-val="-16"></div>
              <div class="temperature_scale_item" data-val="-14"></div>
              <div class="temperature_scale_item" data-val="-12"></div>
              <div class="temperature_scale_item" data-val="-10"></div>
              <div class="temperature_scale_item" data-val="-8"></div>
              <div class="temperature_scale_item" data-val="-6"></div>
              <div class="temperature_scale_item" data-val="-4"></div>
              <div class="temperature_scale_item" data-val="-2"></div>
              <div class="temperature_scale_item" data-val="0"></div>
              <div class="temperature_scale_item" data-val="2"></div>
              <div class="temperature_scale_item" data-val="4"></div>
              <div class="temperature_scale_item" data-val="6"></div>
              <div class="temperature_scale_item" data-val="8"></div>
            </div>
          </div>
        </div>
      </div>

      <div id="map_bottom">
        <div id="main_milestones">
          <div class="map_milesawardsheader">
            <div id="milestones_costs" class="milesawardscosts"></div>
            <div id="milestones_title" class="map_title">Milestones</div>
            <div id="milestones_gains" class="milesawardsgains"></div>
          </div>
          <div id="display_milestones" class="map_milesawardscontent">
            <div id="milestone_1" class="milestone milestone_1"></div>
            <div id="milestone_2" class="milestone milestone_2"></div>
            <div id="milestone_3" class="milestone milestone_3"></div>
            <div id="milestone_4" class="milestone milestone_4"></div>
            <div id="milestone_5" class="milestone milestone_5"></div>
          </div>
        </div>
        <div id="main_awards">
          <div class="map_milesawardsheader">
            <div id="awards_costs" class="milesawardscosts"></div>
            <div id="awards_title" class="map_title">Awards</div>
            <div id="awards_gains" class="milesawardsgains"></div>
          </div>
          <div id="display_awards" class="map_milesawardscontent">
            <div id="award_1" class="award award_1"></div>
            <div id="award_2" class="award award_2"></div>
            <div id="award_3" class="award award_3"></div>
            <div id="award_4" class="award award_4"></div>
            <div id="award_5" class="award award_5"></div>
          </div>
        </div>
      </div>
    </div>



    <div id="thisplayer_zone">

    </div>

  </div>


  <div id="players_area">
    <!-- BEGIN player_board -->

    <div id="player_area_{PLAYER_COLOR}" class="player_area" style="--plcolor:#{PLAYER_COLOR};">
      <div id="player_board_header_{PLAYER_COLOR}" class="playerboard_header">
        <div id="tableau_{PLAYER_COLOR}_corp" class="corp_holder">
          <div id="tableau_{PLAYER_COLOR}_corp_logo" class="corp_logo">
          </div>
          <div id="tableau_{PLAYER_COLOR}_corp_effect" class="corp_effect">
          </div>
        </div>
        <div class="counters_holder">
          <div id="player_counters_{PLAYER_COLOR}" class="player_counters">
            <div class="playerboard_group">
              <div class="playerboard_group_img">
                <div class="token_img tracker_m"></div>
              </div>
              <div class="playerboard_own">
                <div id="alt_tracker_m_{PLAYER_COLOR}" class="tracker"></div>
              </div>
              <div class="playerboard_produce">
                <!-- cannot be + here - it can be negative -->
                <div id="alt_tracker_pm_{PLAYER_COLOR}" class="tracker"></div>
              </div>
            </div>

            <div class="playerboard_group">
              <div class="playerboard_group_img">
                <div class="token_img tracker_s"></div>
              </div>
              <div class="playerboard_own">
                <div id="alt_tracker_s_{PLAYER_COLOR}" class="tracker"></div>
              </div>
              <div class="playerboard_produce">
                +
                <div id="alt_tracker_ps_{PLAYER_COLOR}" class="tracker"></div>
              </div>
            </div>

            <div class="playerboard_group">
              <div class="playerboard_group_img">
                <div class="token_img tracker_u"></div>
              </div>
              <div class="playerboard_own">
                <div id="alt_tracker_u_{PLAYER_COLOR}" class="tracker"></div>
              </div>
              <div class="playerboard_produce">
                +
                <div id="alt_tracker_pu_{PLAYER_COLOR}" class="tracker"></div>
              </div>
            </div>

            <div class="playerboard_group">
              <div class="playerboard_group_img">
                <div class="token_img tracker_p"></div>
              </div>
              <div class="playerboard_produce">
                +
                <div id="alt_tracker_pp_{PLAYER_COLOR}" class="tracker"></div>
              </div>
              <div class="playerboard_own">
                <div id="alt_tracker_p_{PLAYER_COLOR}" class="tracker"></div>
              </div>
            </div>

            <div class="playerboard_group">
              <div class="playerboard_group_img">
                <div class="token_img tracker_e"></div>
              </div>
              <div class="playerboard_produce">
                +
                <div id="alt_tracker_pe_{PLAYER_COLOR}" class="tracker"></div>
              </div>
              <div class="playerboard_own">
                <div id="alt_tracker_e_{PLAYER_COLOR}" class="tracker"></div>
              </div>
            </div>

            <div class="playerboard_group">
              <div class="playerboard_group_img">
                <div class="token_img tracker_h"></div>
              </div>
              <div class="playerboard_produce">
                +
                <div id="alt_tracker_ph_{PLAYER_COLOR}" class="tracker"></div>
              </div>
              <div class="playerboard_own">
                <div id="alt_tracker_h_{PLAYER_COLOR}" class="tracker"></div>
              </div>
            </div>


          </div>
          <div id="player_tags_{PLAYER_COLOR}" class="player_tags"></div>
        </div>
      </div>


      <div id="player_controls_{PLAYER_COLOR}" class="player_controls">
        <div id="player_area_name_{PLAYER_COLOR}" class="player_area_name">{PLAYER_NAME}</div>
        <div id="player_filter_blue_{PLAYER_COLOR}" class="filter_button filter_blue"  data-color="blue"  data-enabled="1" data-player="{PLAYER_COLOR}">Actions(Blue)</div>
        <div id="player_filter_green_{PLAYER_COLOR}" class="filter_button filter_green" data-color="green"  data-enabled="1" data-player="{PLAYER_COLOR}">Automated (Gren)</div>
        <div id="player_filter_red_{PLAYER_COLOR}" class="filter_button filter_red" data-color="red" data-enabled="1" data-player="{PLAYER_COLOR}">Events(Red)</div>
      </div>

      <div id="tableau_{PLAYER_COLOR}" class="whiteblock" data-visibilityblue="1" data-visibilitygreen="1" data-visibilityred="1">
           <div id="tableau_{PLAYER_COLOR}_cards_2a" class="cards_2a"></div>
           <div id="tableau_{PLAYER_COLOR}_cards_2" class="cards_2"></div>
           <div id="tableau_{PLAYER_COLOR}_cards_1" class="cards_1"></div>
           <div id="tableau_{PLAYER_COLOR}_cards_3" class="cards_3"></div>
      </div>


    </div>
    <div id="miniboard_{PLAYER_COLOR}">
      <div id="counter_hand_{PLAYER_COLOR}"></div>
      <div id="counter_draw_{PLAYER_COLOR}"></div>
      <div id="tracker_tr_{PLAYER_COLOR}"></div>
      <div id="playerboard_{PLAYER_COLOR}" class="playerboard playerboard_header">


        <div class="playerboard_group">
          <div class="playerboard_group_img">
            <div class="token_img tracker_m"></div>
          </div>
          <div class="playerboard_own">
            <div id="tracker_m_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_produce">
            <!-- cannot be + here - it can be negative -->
            <div id="tracker_pm_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_group_img">
            <div class="token_img tracker_s"></div>
          </div>
          <div class="playerboard_own">
            <div id="tracker_s_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_produce">
            +
            <div id="tracker_ps_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_group_img">
            <div class="token_img tracker_u"></div>
          </div>
          <div class="playerboard_own">
            <div id="tracker_u_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_produce">
            +
            <div id="tracker_pu_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_group_img">
            <div class="token_img tracker_p"></div>
          </div>
          <div class="playerboard_produce">
            +
            <div id="tracker_pp_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_own">
            <div id="tracker_p_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_group_img">
            <div class="token_img tracker_e"></div>
          </div>
          <div class="playerboard_produce">
            +
            <div id="tracker_pe_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_own">
            <div id="tracker_e_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_group_img">
            <div class="token_img tracker_h"></div>
          </div>
          <div class="playerboard_produce">
            +
            <div id="tracker_ph_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_own">
            <div id="tracker_h_{PLAYER_COLOR}"></div>
          </div>
        </div>
<!--
        <div class="playerboard_group">
          <div class="playerboard_own">
            <div class="token_img tracker_m"></div>
            <div id="tracker_m_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_produce">
            <div class="token_img tracker_m"></div>
            <div id="tracker_pm_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_own">
            <div class="token_img tracker_s"></div>
            <div id="tracker_s_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_produce">
            <div class="token_img tracker_s"></div>
            +
            <div id="tracker_ps_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">
          <div class="playerboard_own">
            <div class="token_img tracker_u"></div>
            <div id="tracker_u_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_produce">
            <div class="token_img tracker_u"></div>
            +
            <div id="tracker_pu_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">

          <div class="playerboard_produce">
            <div class="token_img tracker_p"></div>
            +
            <div id="tracker_pp_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_own">
            <div class="token_img tracker_p"></div>
            <div id="tracker_p_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">

          <div class="playerboard_produce">
            <div class="token_img tracker_e"></div>
            +
            <div id="tracker_pe_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_own">
            <div class="token_img tracker_e"></div>
            <div id="tracker_e_{PLAYER_COLOR}"></div>
          </div>
        </div>

        <div class="playerboard_group">

          <div class="playerboard_produce">
            <div class="token_img tracker_h"></div>
            +
            <div id="tracker_ph_{PLAYER_COLOR}"></div>
          </div>
          <div class="playerboard_own">
            <div class="token_img tracker_h"></div>
            <div id="tracker_h_{PLAYER_COLOR}"></div>
          </div>
        </div>
-->
      </div>
    </div>


    <!-- END player_board -->
  </div>
  <div id="limbo"></div>
  <div id="params"></div>
  <div id="dev_null" class="defhidden"></div>
  <div id="oversurface"></div>
</div>

{OVERALL_GAME_FOOTER}
