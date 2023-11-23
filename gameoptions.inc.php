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
 * gameoptions.inc.php
 *
 * game options description
 * 
 * In this file, you can define your game options (= game variants).
 *   
 * Note: If your game has no variant, you don't have to modify this file.
 *
 * Note²: All options defined in this file should have a corresponding "game state labels"
 *        with the same ID (see "initGameStateLabels" in .game.php)
 *
 * !! It is not a good idea to modify this file when a game is running !!
 *
 */

$game_options = array(
    100 => [
        'name' => totranslate('Begginers Corporations'),
        'values' => [
            1 => ['name' => totranslate('Yes'), 'tmdisplay' => totranslate('Begginers Corporations'), 'firstgameonly' => true],
            0 => ['name' => totranslate('No'), 'nobeginner' => true],
        ],
        'default' => 0
    ],
    101 => [
        'name' => totranslate('Corporate Era'),
        'values' => [
            1 => ['name' => totranslate('On'), 
            'description' => totranslate('Corporate Era variant includes Corporate Era deck cards and all productions starts at 0'), 
            'tmdisplay' => totranslate('Corporate Era'), 'nobeginner' => true],
            0 => ['name' => totranslate('Off'), 
            'description' => totranslate('Standard Game variant does NOT include Corporate Era deck cards and all productions starts at 1'), 
            'tmdisplay' => totranslate('Standard Game')],
        ],
        'displaycondition' => array(
            // Note: only display for non-solo mode, solo mode is always corporate era
            array(
                'type' => 'minplayers',
                'value' => array (2, 3, 4, 5),
            ),
        ),
        'notdisplayedmessage' => totranslate('Corporate Era is On'),
        'default' => 1
    ],
    102 => array(
        'name' => totranslate('Solo variant'),
        'values' => array(
            0 => array(
                'name' => totranslate( 'Standard' ),
                'description' => totranslate( 'All global parameters must be maxed out by the end of generation 14 to win' ),
            ),
            1 => array(
                'name' => totranslate( 'TR63' ),
                'description' => totranslate( 'You must reach a Terraform Rating of 63 by the end of generation 14 to win' ),
                'tmdisplay' => totranslate( 'TR63' ),
            )
        ),
        'displaycondition' => array(
            // Note: only display for solo mode
            array(
                'type' => 'maxplayers',
                'value' => 1
            ),
        ),
        'default' => 0
    ),
    103 => [
        'name' => totranslate('Draft'),
        'values' => [
            1 => ['name' => totranslate('Yes'), 'tmdisplay' => totranslate('Draft'), 'nobeginner' => true],
            0 => ['name' => totranslate('No')],
        ],
        'displaycondition' => array(
            // Note: only display for non-solo mode, solo mode cannot have draft
            array(
                'type' => 'minplayers',
                'value' => array (2, 3, 4, 5),
            ),
        ),
        'notdisplayedmessage' => totranslate('Draft is Off'),
        'default' => 0
    ],
);
$game_preferences = [
    100 => [
        'name' => totranslate('Theme'),
        'needReload' => true, // after user changes this preference game interface would auto-reload
        'values' => array(
            1 => ['name' => totranslate('Digital'), 'cssPref' => 'mcompact', 'description' => totranslate('Layout is optimized for your screen, unnecessary game elements are hidden. Cards are rended with translated text (if translation is available)')],
            2 => ['name' => totranslate('Cardboard'), 'cssPref' => 'mfull', 'description' => totranslate('Just like the original cardboard game, have full board, game player board and cubes. Cards are rendered as printed in English (toolips are translated)')],
        ),
        'default' => 1
    ],
    101 => [ // MA_PREF_CONFIRM_TURN
        'name' => totranslate('Confirm turn end'),
        'needReload' => false, 
        'values' => array(
            1 => ['name' => totranslate('Confirm') ],
            0 => ['name' => totranslate('No'), 'description' => totranslate('If you do not confirm your turn you cannot undo, as next player will get the turn') ],
        ),
        'default' => 1
    ]
];
