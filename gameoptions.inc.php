<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * mars implementation : © Alena Laskavaia <laskava@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * gameoptions.inc.php
 *
 * mars game options description
 * 
 * In this file, you can define your game options (= game variants).
 *   
 * Note: If your game has no variant, you don't have to modify this file.
 *
 * Note²: All options defined in this file should have a corresponding "game state labels"
 *        with the same ID (see "initGameStateLabels" in mars.game.php)
 *
 * !! It is not a good idea to modify this file when a game is running !!
 *
 */

$game_options = array(
    100 => [
        'name' => totranslate('Begginers Corporations'),   
        'values' => [
            1 => ['name' => totranslate('Yes'), 'tmdisplay' => totranslate('Begginers Corporations')],
            2 => ['name' => totranslate('No'), 'nobeginner' => true  ],
        ],
        'default' => 2
    ],

    /* Example of game variant:
    
    
    // note: game variant ID should start at 100 (ie: 100, 101, 102, ...). The maximum is 199.
    100 => array(
                'name' => totranslate('my game option'),    
                'values' => array(

                            // A simple value for this option:
                            1 => array( 'name' => totranslate('option 1') ),

                            // A simple value for this option.
                            // If this value is chosen, the value of "tmdisplay" is displayed in the game lobby
                            2 => array( 'name' => totranslate('option 2'), 'tmdisplay' => totranslate('option 2') ),

                            // Another value, with other options:
                            //  beta=true => this option is in beta version right now.
                            //  nobeginner=true  =>  this option is not recommended for beginners
                            3 => array( 'name' => totranslate('option 3'),  'beta' => true, 'nobeginner' => true ),) )
                        )
            )

    */);
$game_preferences = [
    100 => [
        'name' => totranslate('Layout and Theme'),
        'needReload' => true, // after user changes this preference game interface would auto-reload
        'values' => array(
            1 => ['name' => totranslate('Compact'), 'cssPref' => 'mcompact'],
            2 => ['name' => totranslate('Full'), 'cssPref' => 'mfull'],
        ),
        'default' => 1
    ]
];
