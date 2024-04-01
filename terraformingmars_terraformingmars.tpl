{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- game implementation : © Alena Laskavaia <laskava@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------
-->
<div id="hand_area" class="hand_area" data-open="0">
  <!-- hand area has to be outside of zoom-wrapper to float properly -->
  <div class="hand location handy" id="hand_{CURRENT_PLAYER_COLOR}"></div>
  <div class="draw location handy" id="draw_{CURRENT_PLAYER_COLOR}"></div>
  <div class="draft location handy" id="draft_{CURRENT_PLAYER_COLOR}"></div>
  <div id="hand_area_buttons">
    <div id="hand_area_button_pop">
      <div class="icon_hand"><i class="fa fa-hand-paper-o" aria-hidden="true"></i></div>
      <div class="icon_close"><i class="fa fa-arrow-circle-o-down" aria-hidden="true"></i></div>
    </div>
  </div>
</div>
<div id="zoom-wrapper" class="zoom-wrapper">
  <div id="thething">

    <div id="main_area">
      <div id="main_board">
        <div id="map_middle">
          <div id="map_top">
            <div id="oxygen_map">
              <div id="alt_tracker_o" class="tracker param tracker_o"></div>
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
            <div class="outer_generation" id="outer_generation">
              <div id="alt_tracker_gen" class="tracker tracker_gen"></div>
              <div class="generation_bottom">
                <div id="generation_text">Gen</div>
              </div>
            </div>
            <div class="outer_scoretracker" id="outer_scoretracker">
              <i class="fa fa-table" aria-hidden="true"></i>
              <div class="generation_bottom">
                <div id="scoretracker_text">Score</div>
              </div>
            </div>
          </div>
          <div id="map_left">
            <div id="decks_area">
              <div id="deck_holder" class="deck_line">
                <div id="deck_main_title" class="deck_line_text">Draw:</div>
                <div id="deck_main" class="carddeck"></div>
              </div>
              <div id="discard_holder" class="deck_line">
                <div id="discard_title" class="deck_line_text">Discard:</div>
                <div id="discard_main" class="carddeck"></div>
              </div>

              <div id="oceans_pile" class="tile tile_3">
                <div id="alt_tracker_w" class="tracker param tracker_w"></div>
              </div>

              <!-- This area will show cards that has to be revealed from deck  -->
              <div id="reveal" class="reveal"></div>
            </div>
            <div id="standard_projects_area">
              <div id="standard_projects_title_zone">
                <div id="standard_projects_title" class="standard_projects_title">Standard projects</div>
              </div>
              <div id="display_main"></div>
            </div>
            <div class="hex outer" id="hex_0_1"></div>
            <div class="hex_phobos"><div class="hex outer" id="hex_0_2"></div></div>
            <div class="hex_ganymede"><div class="hex outer" id="hex_0_3"></div></div>
          </div>
          <div id="map" class="map">
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
            </div>
          </div>
          <div id="map_right">
            <div id="temperature_map">
              <div id="alt_tracker_t" class="tracker param tracker_t"></div>
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
              <div id="milestones_costs" class="milesawardscosts">
                <div id="milestone_cost_1" class="token_img tracker_m">8</div>
                <div id="milestone_cost_2" class="token_img tracker_m">8</div>
                <div id="milestone_cost_3" class="token_img tracker_m">8</div>
              </div>
              <div id="milestones_title" class="map_title">Milestones</div>
              <div id="milestones_gains" class="milesawardsgains"><div id="milestone_vp_gain" class="card_vp">5</div></div>
              <div id="milestones_progress" class="milesawardsprogress" ><i class="fa fa-tasks" aria-hidden="true"></i></div>
            </div>
            <div id="display_milestones" class="map_milesawardscontent">
              <div id="milestone_1" class="milestone milestone_1"><div id="milestone_label_1" class="milestone_label">NA</div></div>
              <div id="milestone_2" class="milestone milestone_2"><div id="milestone_label_2" class="milestone_label">NA</div></div>
              <div id="milestone_3" class="milestone milestone_3"><div id="milestone_label_3" class="milestone_label">NA</div></div>
              <div id="milestone_4" class="milestone milestone_4"><div id="milestone_label_4" class="milestone_label">NA</div></div>
              <div id="milestone_5" class="milestone milestone_5"><div id="milestone_label_5" class="milestone_label">NA</div></div>
            </div>
          </div>
          <div id="main_awards">
            <div class="map_milesawardsheader">
              <div id="awards_costs" class="milesawardscosts">
                <div id="award_cost_1" class="token_img tracker_m">8</div>
                <div id="award_cost_2" class="token_img tracker_m">14</div>
                <div id="award_cost_3" class="token_img tracker_m">20</div>
              </div>
              <div id="awards_title" class="map_title">Awards</div>
              <div id="awards_gains" class="milesawardsgains">
                <div id="milestone_award_gain_1" class="card_vp">5</div>
                <div id="milestone_award_gain_2" class="card_vp">2</div>
              </div>
              <div id="awards_progress" class="milesawardsprogress" ><i class="fa fa-tasks" aria-hidden="true"></i></div>
            </div>
            <div id="display_awards" class="map_milesawardscontent">
              <div id="award_1" class="award award_1"><div id="award_label_1" class="award_label">NA</div></div>
              <div id="award_2" class="award award_2"><div id="award_label_2" class="award_label">NA</div></div>
              <div id="award_3" class="award award_3"><div id="award_label_3" class="award_label">NA</div></div>
              <div id="award_4" class="award award_4"><div id="award_label_4" class="award_label">NA</div></div>
              <div id="award_5" class="award award_5"><div id="award_label_5" class="award_label">NA</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="players_area">
      <!-- BEGIN player_board -->

      <div id="player_area_{PLAYER_COLOR}" class="player_area plcolor_{PLAYER_COLOR}">
        <div id="player_board_header_{PLAYER_COLOR}" class="playerboard_header">
          <div id="tableau_{PLAYER_COLOR}_corp" class="corp_holder">
            <div id="player_area_name_{PLAYER_COLOR}" class="player_area_name">{PLAYER_NAME}</div>
            <div id="tableau_{PLAYER_COLOR}_corp_logo" class="corp_logo"></div>
            <div id="tableau_{PLAYER_COLOR}_corp_effect" class="corp_effect"></div>

          </div>
          <div class="counters_holder">
            <div id="player_counters_{PLAYER_COLOR}" class="player_counters">
              <div class="tr_playerboard">
                <div class="playerboard_group_img">
                  <div class="token_img tracker_tr">
                    <div id="alt_tracker_tr_{PLAYER_COLOR}" class="tracker"></div>
                  </div>
                </div>
              </div>
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
                  <div id="alt_tracker_pu_{PLAYER_COLOR}" class="tracker"></div>
                </div>
              </div>

              <div id="playergroup_plants_{PLAYER_COLOR}" class="playerboard_group">
                <div class="playerboard_group_img">
                  <div class="playerboard_group_underbutton">
                    <div class="tracker_forest tracker"></div>
                  </div>
                  <div class="token_img tracker_p"></div>
                </div>
                <div class="playerboard_produce">
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
                  <div id="alt_tracker_pe_{PLAYER_COLOR}" class="tracker"></div>
                </div>
                <div class="playerboard_own">
                  <div id="alt_tracker_e_{PLAYER_COLOR}" class="tracker"></div>
                </div>
              </div>

              <div id="playergroup_heat_{PLAYER_COLOR}" class="playerboard_group">
                <div class="playerboard_group_img">
                  <div class="playerboard_group_underbutton">
                    +
                    <div class="token_img temperature_icon"></div>
                  </div>
                  <div class="token_img tracker_h"></div>
                </div>
                <div class="playerboard_produce">
                  <div id="alt_tracker_ph_{PLAYER_COLOR}" class="tracker"></div>
                </div>
                <div class="playerboard_own">
                  <div id="alt_tracker_h_{PLAYER_COLOR}" class="tracker"></div>
                </div>
              </div>
            </div>
            <div id="player_tags_{PLAYER_COLOR}" class="player_tags">
              <div id="tracker_tagBuilding_{PLAYER_COLOR}" class="tracker badge tracker_tagBuilding"></div>
              <div id="tracker_tagSpace_{PLAYER_COLOR}" class="tracker badge tracker_tagSpace"></div>
              <div id="tracker_tagScience_{PLAYER_COLOR}" class="tracker badge tracker_tagScience"></div>
              <div id="tracker_tagEnergy_{PLAYER_COLOR}" class="tracker badge tracker_tagEnergy"></div>

              <div id="tracker_tagEarth_{PLAYER_COLOR}" class="tracker badge tracker_tagEarth"></div>
              <div id="tracker_tagJovian_{PLAYER_COLOR}" class="tracker badge tracker_tagJovian"></div>
              <div id="tracker_tagCity_{PLAYER_COLOR}" class="tracker badge tracker_tagCity"></div>

              <div id="tracker_tagPlant_{PLAYER_COLOR}" class="tracker badge tracker_tagPlant"></div>
              <div id="tracker_tagMicrobe_{PLAYER_COLOR}" class="tracker badge t tracker_tagMicrobe"></div>
              <div id="tracker_tagAnimal_{PLAYER_COLOR}" class="tracker badge tracker_tagAnimal"></div>

              <div id="tracker_tagEvent_{PLAYER_COLOR}" class="tracker badge tracker_tagEvent"></div>
              <div id="tracker_city_{PLAYER_COLOR}" class="tracker tracker_city"></div>
              <div id="tracker_forest_{PLAYER_COLOR}" class="tracker tracker_forest"></div>
              <div id="tracker_land_{PLAYER_COLOR}" class="tracker tracker_land"></div>
            </div>
            <div id="player_controls_{PLAYER_COLOR}" class="player_controls">
              
            </div>
          </div>
        </div>


        <div id="tableau_toprow_{PLAYER_COLOR}" class="tableautoprow"></div>
        <div id="tableau_{PLAYER_COLOR}" class="tableau">
          <div id="pboard_{PLAYER_COLOR}" class="pboard">
            <div id="resarea_m_{PLAYER_COLOR}" class="resarea resarea_m"></div>
            <div id="resarea_s_{PLAYER_COLOR}" class="resarea resarea_s"></div>
            <div id="resarea_u_{PLAYER_COLOR}" class="resarea resarea_u"></div>
            <div id="resarea_p_{PLAYER_COLOR}" class="resarea resarea_p"></div>
            <div id="resarea_e_{PLAYER_COLOR}" class="resarea resarea_e"></div>
            <div id="resarea_h_{PLAYER_COLOR}" class="resarea resarea_h"></div>
          </div>
        </div>
      </div>
      <div id="miniboard_{PLAYER_COLOR}" class="style_2">
        <div id="miniboard_corp_logo_{PLAYER_COLOR}" class="miniboard_corp_logo corp_logo" data-corp=""></div>
        <div id="miniboardentry_{PLAYER_COLOR}" class="miniboard_entry">
          <div id="tracker_tr_{PLAYER_COLOR}" class="token_img tracker_tr mini_counter"></div>
          <div class="hand_symbol">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 296.664 296.664">
              <path d="M 58.355,226.748 V 69.414 c 0,-1.709 0.294,-3.391 0.526,-5.039 L 13.778,79.057 C 3.316,82.455 -2.42,93.797 0.979,104.258 l 48.639,149.633 c 2.738,8.428 10.639,13.816 19.075,13.816 2.035,0 4.109,-0.315 6.143,-0.975 l 12.796,-4.211 C 71.066,259.213 58.355,244.242 58.355,226.748 Z"></path>
              <path d="M 91.098,203.275 139.715,53.673 c 0.491,-1.512 1.078,-3.342 1.746,-4.342 H 94.688 c -11,0 -20.333,9.082 -20.333,20.082 v 157.334 c 0,11 9.333,20.584 20.333,20.584 h 15.969 C 94.061,239.332 85.361,220.932 91.098,203.275 Z"></path>
              <path d="M 282.848,79.057 180.134,45.684 c -2.034,-0.662 -4.102,-0.975 -6.138,-0.975 -8.436,0 -16.326,5.387 -19.064,13.814 l -48.617,149.633 c -3.399,10.463 2.379,21.803 12.841,25.203 l 102.713,33.373 c 2.034,0.66 4.102,0.975 6.138,0.975 8.436,0 16.326,-5.389 19.064,-13.816 L 295.689,104.258 C 299.088,93.797 293.31,82.455 282.848,79.057 Z"></path>
            </svg>
            <div id="counter_hand_{PLAYER_COLOR}" class="counter_hand"></div>
          </div>
          <!--div id="counter_hand_{PLAYER_COLOR}" class="token_img cardback card_icon"></div-->
          <div id="counter_draw_{PLAYER_COLOR}"></div>
          <!-- in full layout the other card counts go there -->
          <div id="fpholder_{PLAYER_COLOR}" class="fp_holder"></div>
        </div>

        <div id="playerboard_{PLAYER_COLOR}" class="playerboard playerboard_header">
          <div class="playerboard_group">
            <div class="playerboard_group_img">
              <div class="token_img tracker_m"></div>
              <div class="playerboard_own">
                <div id="tracker_m_{PLAYER_COLOR}"></div>
              </div>
            </div>

            <div class="playerboard_produce">
              <!-- cannot be + here - it can be negative -->
              <div id="tracker_pm_{PLAYER_COLOR}"></div>
            </div>
          </div>

          <div class="playerboard_group">
            <div class="playerboard_group_img">
              <div class="token_img tracker_s"></div>
              <div class="playerboard_own">
                <div id="tracker_s_{PLAYER_COLOR}"></div>
              </div>
            </div>
            <div class="playerboard_produce">
              <div id="tracker_ps_{PLAYER_COLOR}"></div>
            </div>
          </div>

          <div class="playerboard_group">
            <div class="playerboard_group_img">
              <div class="token_img tracker_u"></div>
              <div class="playerboard_own">
                <div id="tracker_u_{PLAYER_COLOR}"></div>
              </div>
            </div>
            <div class="playerboard_produce">
              <div id="tracker_pu_{PLAYER_COLOR}"></div>
            </div>
          </div>

          <div class="playerboard_group">
            <div class="playerboard_group_img">
              <div class="token_img tracker_p"></div>
              <div class="playerboard_own">
                <div id="tracker_p_{PLAYER_COLOR}"></div>
              </div>
            </div>
            <div class="playerboard_produce">
              <div id="tracker_pp_{PLAYER_COLOR}"></div>
            </div>
          </div>

          <div class="playerboard_group">
            <div class="playerboard_group_img">
              <div class="token_img tracker_e"></div>
              <div class="playerboard_own">
                <div id="tracker_e_{PLAYER_COLOR}"></div>
              </div>
            </div>
            <div class="playerboard_produce">
              <div id="tracker_pe_{PLAYER_COLOR}"></div>
            </div>
          </div>

          <div class="playerboard_group">
            <div class="playerboard_group_img">
              <div class="token_img tracker_h"></div>
              <div class="playerboard_own">
                <div id="tracker_h_{PLAYER_COLOR}"></div>
              </div>
            </div>
            <div class="playerboard_produce">
              <div id="tracker_ph_{PLAYER_COLOR}"></div>
            </div>
          </div>
        </div>
        <div id="miniboard_tags_{PLAYER_COLOR}" class="miniboard_tags">
          <div id="alt_tracker_tagBuilding_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagBuilding"></div>
          <div id="alt_tracker_tagSpace_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagSpace"></div>
          <div id="alt_tracker_tagScience_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagScience"></div>
          <div id="alt_tracker_tagEnergy_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagEnergy"></div>
          <div id="alt_tracker_tagEarth_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagEarth"></div>
          <div id="alt_tracker_tagJovian_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagJovian"></div>
          <div id="alt_tracker_tagCity_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagCity"></div>
          <div id="alt_tracker_tagPlant_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagPlant"></div>
          <div id="alt_tracker_tagMicrobe_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagMicrobe"></div>
          <div id="alt_tracker_tagAnimal_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagAnimal"></div>
          <div id="alt_tracker_tagEvent_{PLAYER_COLOR}" class="mini_counter tracker badge tracker_tagEvent"></div>
          <!-- non tag counters -->
          <div id="alt_tracker_city_{PLAYER_COLOR}" class="mini_counter tracker micon tracker_city"></div>
          <div id="alt_tracker_forest_{PLAYER_COLOR}" class="mini_counter tracker micon tracker_forest"></div>
          <div id="alt_tracker_land_{PLAYER_COLOR}" class="mini_counter tracker micon tracker_land"></div>
        </div>
      </div>

      <!-- END player_board -->
    </div>

    <div id="allcards" class="allcards">
      <div id="allcards_main" class="allcards_main expandable">
        <div class="expandabletitle">	
          <a href="#" id="allcards_main_toggle" class="expandabletoggle expandablearrow">
            <div class="icon20 icon20_expand"></div>
            <span id="allcards_main_title"></span>
          </a>
        </div>
        <div class="expandablecontent" >
           <div id="filter-allcards_main_content" class="cards-filter">
              <input type="text" placeholder="Search..." id="filter-allcards_main_content-fuzzy" class="filter-text" size="30"></input>
              <i class="fa fa-remove filter-text-clear"></i>
           </div>
           <div id="allcards_main_content" class="expandablecontent_cards"></div>
        </div>
      </div>
      <div id="allcards_corp" class="allcards_corp expandable">
        <div class="expandabletitle">	
          <a href="#" id="allcards_corp_toggle" class="expandabletoggle expandablearrow">
            <div class="icon20 icon20_expand"></div>
            <span id="allcards_corp_title"></span>
          </a>
        </div>
        <div class="expandablecontent">
          <div id="filter-allcards_corp_content" class="cards-filter"></div>
          <div id="allcards_corp_content" class="expandablecontent_cards"></div>
        </div>
      </div>
    </div>
    <div id="limbo">
      <div id="starting_player"></div>
      <div id="player_board_params">
        <div id="tracker_o_param" class="params_line">
          <div class="token_img oxygen_icon"></div>
          <div class="groupline">
            <div id="tracker_o" class="tracker param"></div>
            %
          </div>
        </div>
        <div id="tracker_t_param" class="params_line">
          <div class="token_img temperature_icon"></div>
          <div class="groupline">
            <div id="tracker_t" class="tracker param"></div>
            °C
          </div>
        </div>
        <div id="tracker_w_param" class="params_line">
          <div  class="token_img tracker_w"></div>
          <div class="groupline">
            <div id="tracker_w" class="tracker param"></div>
          </div>
        </div>
        <div id="tracker_gen_param" class="params_line">
          <div class="token_img tracker_gen"></div>
          <div class="groupline">
            <div id="tracker_gen" class="tracker param"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="params"></div>
    <div id="dev_null" class="defhidden"></div>

    <div id="player_board_config" class="player-board">
      <div id="player_config">
        <div id="player_config_row">
          <button id="zoom-out" class="fa fa-search-minus fa-2x config-control"></button>
          <button id="zoom-in" class="fa fa-search-plus fa-2x config-control"></button>

          <button id="help-mode-switch" class="fa fa-question-circle fa-2x config-control help-mode-switch"></button>

          <button id="show-settings" class="config-control fa fa-cog fa-2x"></button>
        </div>
        <div class="settingsControlsHidden" id="settings-controls-container">
          <div id="settings-controls-container-prefs">
            
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="oversurface"></div>
{OVERALL_GAME_FOOTER}
