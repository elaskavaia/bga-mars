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
 * .game.php
 *
 * This is the main file for your game logic.
 *]
 * In this PHP file, you are going to defines the rules of the game.
 *
 */

require_once "modules/PGameXBody.php";

class terraformingmars extends PGameXBody {
    function __construct() {
        parent::__construct();
    }

    protected function getGameName() {
        // Used for translations and stuff. Please do not modify.
        return "terraformingmars";
    }

    /*
     * setupNewGame:
     *
     * This method is called only once, when a new game is launched.
     * In this method, you must setup the game according to the game rules, so that
     * the game is ready to be played.
     */
    protected function setupNewGame($players, $options = []) {
        parent::setupNewGame($players, $options);
    }

    /*
     * getAllDatas:
     *
     * Gather all informations about current game situation (visible by the current player).
     *
     * The method is called each time the game interface is displayed to a player, ie:
     * _ when the game starts
     * _ when a player refreshes the game page (F5)
     */
    protected function getAllDatas() {
        $result = parent::getAllDatas();
        return $result;
    }

    /*
     * getGameProgression:
     *
     * Compute and return the current game progression.
     * The number returned must be an integer beween 0 (=the game just started) and
     * 100 (= the game is finished or almost finished).
     *
     * This method is called each time we are in a game state with the "updateGameProgression" property set to true
     * (see states.inc.php)
     */
    function getGameProgression() {
        return parent::getGameProgression();
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Zombie
    ////////////
    /*
     * zombieTurn:
     *
     * This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
     * You can do whatever you want in order to make sure the turn of this player ends appropriately
     * (ex: pass).
     */
    function zombieTurn($state, $active_player) {
        parent::zombieTurn($state, $active_player);
    }

    ///////////////////////////////////////////////////////////////////////////////////:
    ////////// DB upgrade
    //////////
    /*
     * upgradeTableDb:
     *
     * You don't have to care about this until your game has been published on BGA.
     * Once your game is on BGA, this method is called everytime the system detects a game running with your old
     * Database scheme.
     * In this case, if you change your Database scheme, you just have to apply the needed changes in order to
     * update the game database and allow the game to continue to run with your new version.
     *
     */
    function upgradeTableDb($from_version) {

        if ($from_version <= 2408211710) { // where your CURRENT version in production has number YYMMDD-HHMM

            // // You DB schema update request.
            // // Note: all tables names should be prefixed by "DBPREFIX_" to be compatible with the applyDbUpgradeToAllDB method you should use below
            // try {
            //     $sql = "ALTER TABLE `DBPREFIX_gamelog` ADD `cancel` TINYINT(1) NOT NULL DEFAULT 0";

            //     // The method below is applying your DB schema update request to all tables, including the BGA framework utility tables like "zz_replayXXXX" or "zz_savepointXXXX".
            //     // You should really use this request, in conjunction with "DBPREFIX_" in your $sql, so ALL tables are updated. All utility tables MUST have the same schema than the main table, otherwise the game may be blocked.
            //     self::applyDbUpgradeToAllDB($sql);
            //     return;
            // } catch (Exception $e) {
            // }
            try {
                $sql = "ALTER TABLE `zz_savepoint_gamelog` ADD `cancel` TINYINT(1) NOT NULL DEFAULT 0";
                $this->DbQuery($sql);
            } catch (Exception $e) {
            }
            try {
                $sql = "ALTER TABLE `gamelog` ADD `cancel` TINYINT(1) NOT NULL DEFAULT 0";
                $this->DbQuery($sql);
            } catch (Exception $e) {
            }
        }
    }
}
