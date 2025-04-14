<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * game implementation : © Alena Laskavaia <laskava@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * .view.php
 *
 * This is your "view" file.
 *
 * The method "build_page" below is called each time the game interface is displayed to a player, ie:
 * _ when the game starts
 * _ when a player refreshes the game page (F5)
 *
 * "build_page" method allows you to dynamically modify the HTML generated for the game interface. In
 * particular, you can set here the values of variables elements defined in .tpl (elements
 * like {MY_VARIABLE_ELEMENT}), and insert HTML block elements (also defined in your HTML template file)
 *
 * Note: if the HTML of your game interface is always the same, you don't have to place anything here.
 *
 */

require_once(APP_BASE_PATH . "view/common/game.view.php");

class view_terraformingmars_terraformingmars extends game_view
{
  function getGameName()
  {
    return "terraformingmars";
  }

  function getTemplateName()
  {
    return self::getGameName() . "_" . self::getGameName();
  }

  function insertBlockWithUppercaseKeys($block, $map)
  {
    $block_info = [];

    foreach ($map as $key => $value) {
      $block_info[strtoupper($key)] = $value;
    }

    $this->page->insert_block($block,  $block_info);
  }

  function build_page($viewArgs)
  {
    // Get players & players number
    $players = $this->game->loadPlayersBasicInfos();
    $players_nbr = count($players);

    /*********** Place your code below:  ************/
    $this->tpl['PLAYER_NUMBER'] = $players_nbr;
    $this->tpl['CURRENT_PLAYER_COLOR'] = 'ffffff'; // spectator
    $cplayer = $this->game->getCurrentPlayerId();

    if (isset($players[$cplayer])) {
      $this->tpl['CURRENT_PLAYER_COLOR'] = $players[$cplayer]['player_color'];
    }

    $template = self::getTemplateName();
    $this->page->begin_block($template, "player_board");
    // inner blocks in player blocks
    // boards in players order
    $players = $this->game->getPlayersInOrder($cplayer);
    foreach ($players as $player_id => $player) {
      $this->insertBlockWithUppercaseKeys("player_board", $player);
    }

    /*********** Do not change anything below this line  ************/
  }
}
