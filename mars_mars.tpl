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
<div id="zoom-wrapper" class="zoom-wrapper">
  <div id="thething">
    <div id="hand_area" class="hand_area" data-open="0">
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
    <div id="main_area">
      <div id="main_board">
        <div id="map_middle">
          <div id="map_top">
            <div id="oxygen_map">
              <div id="tracker_o" class="tracker param"></div>
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
              <div id="tracker_gen" class="tracker"></div>
              <div class="generation_bottom">
                <div id="generation_text">Gen</div>
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
                <div id="tracker_w" class="tracker param"></div>
              </div>
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
              <div id="tracker_t" class="tracker param"></div>
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
          </div>
        </div>

        <div id="player_controls_{PLAYER_COLOR}" class="player_controls">
          <div id="player_area_name_{PLAYER_COLOR}" class="player_area_name">{PLAYER_NAME}</div>


          <div
            id="player_viewcards_2_{PLAYER_COLOR}"
            class="viewcards_button"
            data-cardtype="2"
            data-selected="1"
            data-player="{PLAYER_COLOR}"
          >
            <div class="buttoncard card_icon">
              <div id="local_counter_{PLAYER_COLOR}_cards_2" class="viewcardbutton_counter">0</div>
              <i class="fa fa-eye" aria-hidden="true"></i>
            </div>
          </div>
          <div
            id="player_viewcards_1_{PLAYER_COLOR}"
            class="viewcards_button"
            data-cardtype="1"
            data-selected="0"
            data-player="{PLAYER_COLOR}"
          >
            <div class="buttoncard card_icon">
              <div id="local_counter_{PLAYER_COLOR}_cards_1" class="viewcardbutton_counter">0</div>
              <i class="fa fa-eye" aria-hidden="true"></i>
            </div>
          </div>
          <div
            id="player_viewcards_3_{PLAYER_COLOR}"
            class="viewcards_button"
            data-cardtype="3"
            data-selected="0"
            data-player="{PLAYER_COLOR}"
          >
            <div class="buttoncard card_icon">
              <div id="local_counter_{PLAYER_COLOR}_cards_3" class="viewcardbutton_counter">0</div>
              <i class="fa fa-eye" aria-hidden="true"></i>
            </div>
          </div>
          <div
                  id="player_viewcards_0_{PLAYER_COLOR}"
                  class="viewcards_button"
                  data-cardtype="0"
                  data-selected="0"
                  data-player="{PLAYER_COLOR}"
          >
            <div class="buttoncard card_icon">
              <div id="local_counter_{PLAYER_COLOR}_cards_0" class="viewcardbutton_counter">*</div>
              <i class="fa fa-eye" aria-hidden="true"></i>
            </div>
          </div>
      </div>

        <div id="tableau_{PLAYER_COLOR}" class="tableau" data-visibility_2="1" data-visibility_1="0" data-visibility_3="0">
          <div id="pboard_{PLAYER_COLOR}" class="pboard"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_4" class="cards_4 cards_bin"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_2a" class="cards_2a cards_bin"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_2" class="cards_2 cards_bin stacked"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_3vp" class="cards_3vp cards_bin"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_3" class="cards_3 cards_bin stacked"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_1vp" class="cards_1vp cards_bin"></div>
          <div id="tableau_{PLAYER_COLOR}_cards_1" class="cards_1 cards_bin stacked"></div>
        </div>
      </div>
      <div id="miniboard_{PLAYER_COLOR}" class="style_2">
        <div id="miniboardentry_{PLAYER_COLOR}" class="miniboard_entry">
          <div id="tracker_tr_{PLAYER_COLOR}" class="token_img tracker_tr mini_counter"></div>
          <div id="counter_hand_{PLAYER_COLOR}" class="token_img cardback card_icon"></div>
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
        <div class="expandablecontent"  id="allcards_main_content"></div>
      </div>
      <div id="allcards_corp" class="allcards_corp expandable">
        <div class="expandabletitle">	
          <a href="#" id="allcards_corp_toggle" class="expandabletoggle expandablearrow">
            <div class="icon20 icon20_expand"></div>
            <span id="allcards_corp_title"></span>
          </a>
        </div>
        <div class="expandablecontent"  id="allcards_corp_content"></div>
      </div>
    </div>
    <div id="limbo">
      <div id="starting_player"></div>
      <div id="player_board_params">
        <div id="tracker_o_param" class="params_line">
          <div class="token_img oxygen_icon"></div>
          <div class="groupline">
            <div id="alt_tracker_o" class="tracker param"></div>
            %
          </div>
        </div>
        <div id="tracker_t_param" class="params_line">
          <div class="token_img temperature_icon"></div>
          <div class="groupline">
            <div id="alt_tracker_t" class="tracker param"></div>
            °C
          </div>
        </div>
        <div id="tracker_w_param" class="params_line">
          <div  class="token_img tracker_w"></div>
          <div class="groupline">
            <div id="alt_tracker_w" class="tracker param"></div>
          </div>
        </div>
        <div id="tracker_gen_param" class="params_line">
          <div class="token_img tracker_gen"></div>
          <div class="groupline">
            <div id="alt_tracker_gen" class="tracker param"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="params"></div>
    <div id="dev_null" class="defhidden"></div>
    <div id="oversurface"></div>
    <div id="player_board_config" class="player-board">
      <div id="player_config">
        <div id="player_config_row">
          <button id="zoom-out" class="fa fa-search-minus fa-2x config-control"></button>
          <button id="zoom-in" class="fa fa-search-plus fa-2x config-control"></button>

          <button id="help-mode-switch" class="fa fa-question-circle fa-2x config-control help-mode-switch"></button>

          <button id="show-settings" class="config-control fa fa-cog fa-2x"></button>
        </div>
        <div class="settingsControlsHidden" id="settings-controls-container"></div>
      </div>
    </div>
  </div>
</div>
{OVERALL_GAME_FOOTER}
