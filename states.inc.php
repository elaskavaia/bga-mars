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
 * states.inc.php
 *
 * game states description
 *
 */

/*
 Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
 in a very easy way from this configuration file.
 
 Please check the BGA Studio presentation about game state to understand this, and associated documentation.
 
 Summary:
 
 States types:
 _ activeplayer: in this type of state, we expect some action from the active player.
 _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
 _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
 _ manager: special type for initial and final state
 
 Arguments of game states:
 _ name: the name of the GameState, in order you can recognize it on your own code.
 _ description: the description of the current game state is always displayed in the action status bar on
 the top of the game. Most of the time this is useless for game state with "game" type.
 _ descriptionmyturn: the description of the current game state when it's your turn.
 _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
 _ action: name of the method to call when this game state become the current game state. Usually, the
 action method is prefixed by "st" (ex: "stMyGameStateName").
 _ possibleactions: array that specify possible player actions on this step. It allows you to use "checkAction"
 method on both client side (Javacript: this.checkAction) and server side (PHP: self::checkAction).
 _ transitions: the transitions are the possible paths to go from a game state to another. You must name
 transitions in order to use transition names in "nextState" PHP method, and use IDs to
 specify the next game state for each transition.
 _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
 client side to be used on "onEnteringState" or to set arguments in the gamestate description.
 _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
 method).
 */

//    !! It is not a good idea to modify this file when a game is running !!

if (!defined("STATE_END_GAME")) {
    // guard since this included multiple times
    define("STATE_MULTIPLAYER_DISPATCH", 4);
    define("STATE_GAME_DISPATCH", 10);
    define("STATE_PLAYER_TURN_CHOICE", 11);
    define("STATE_PLAYER_CONFIRM", 12);
    define("STATE_MULTIPLAYER_CHOICE", 6);
    define("STATE_END_GAME", 99);
}

$machinestates = [
    // The initial state. Please do not modify.
    1 => [
        "name" => "gameSetup",
        "description" => "",
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => ["" => STATE_GAME_DISPATCH],
    ],

    STATE_PLAYER_CONFIRM => [
        "name" => "playerConfirm",
        "description" => clienttranslate(
            '${actplayer} must confirm or undo'
        ),
        "descriptionmyturn" => clienttranslate(
            '${you} must confirm'
        ),
        "type" => "activeplayer",
        "args" => "arg_playerTurnChoice",
        "possibleactions" => ["confirm", "undo"],
        "transitions" => [
            "next" => STATE_GAME_DISPATCH,
        ],
    ],

    STATE_GAME_DISPATCH => [
        "name" => "gameDispatch",
        "description" => "",
        "type" => "game",
        "action" => "st_gameDispatch",
        "updateGameProgression" => true,
        "transitions" => [
            "next" => STATE_PLAYER_TURN_CHOICE,
            "loopback" => STATE_GAME_DISPATCH,
            "multiplayer" => STATE_MULTIPLAYER_DISPATCH,
            "confirm" => STATE_PLAYER_CONFIRM,
            "last" => STATE_END_GAME,
        ],
    ],

    STATE_PLAYER_TURN_CHOICE => [
        "name" => "playerTurnChoice",
        "description" => clienttranslate(
            '${actplayer} makes their choices'
        ),
        "descriptionmyturn" => clienttranslate(
            '${you} must choose'
        ),
        "type" => "activeplayer",
        "args" => "arg_playerTurnChoice",
        "possibleactions" => ["choose", "resolve", "decline", "skip", "undo", "whatever"],
        "transitions" => [
            "next" => STATE_GAME_DISPATCH,
        ],
    ],


    STATE_MULTIPLAYER_DISPATCH => [
        "name" => "multiplayerDispatch",
        "type" => "multipleactiveplayer",
        "action" => "st_gameDispatchMultiplayer",
        "description" => clienttranslate(
            'Other players make their choices'
        ),
        "descriptionmyturn" => clienttranslate(
            '${you} must choose'
        ),
        "initialprivate" => STATE_MULTIPLAYER_CHOICE,
        "possibleactions" => ["undo"], // ??
        "transitions" => [
            "next" => STATE_GAME_DISPATCH,
            "loopback" => STATE_MULTIPLAYER_DISPATCH,
            "confirm" => STATE_PLAYER_CONFIRM,
        ],
        //  "args" => "arg_multiplayerTurnChoice",
    ],

    STATE_MULTIPLAYER_CHOICE => [
        "name" => "multiplayerChoice",
        "descriptionmyturn" => clienttranslate('${you} must choose'),
        "type" => "private",
        "args" => "arg_multiplayerChoice", //this method will be called with playerId as a parametar and is used to calculate arguments for this action for specific player
        "action" => "st_multiplayerChoice", // this method will be called with playerId as a parameter and can be used to make some changes when player enters this private state
        "possibleactions" => ["choose", "resolve", "decline", "skip", "undo", "whatever"],
        "transitions" => [
            "next" => STATE_GAME_DISPATCH,
            "loopback" => STATE_MULTIPLAYER_CHOICE,
        ]
    ],

    // Final state.
    // Please do not modify.
    STATE_END_GAME => [
        "name" => "gameEnd",
        "description" => clienttranslate("End of game"),
        "type" => "manager",
        "action" => "stGameEnd",
        "args" => "argGameEnd",
    ],
];
