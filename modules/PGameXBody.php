<?php

require_once "PGameMachine.php";
require_once "MathExpression.php";
require_once "DbUserPrefs.php";
require_once "DbMultiUndo.php";
require_once "operations/AbsOperation.php";
require_once "operations/ComplexOperation.php";
require_once "operations/DelegatedOperation.php";
require_once "operations/Operation_turn.php";
require_once "operations/Operation_trade.php";

define("MA_STAGE_SETUP", 1);
define("MA_STAGE_PRELUDE", 2);
define("MA_STAGE_GAME", 3);
define("MA_STAGE_LASTFOREST", 5);
define("MA_STAGE_ENDED", 9);

abstract class PGameXBody extends PGameMachine {
    protected $eventListners = null; // events cache
    protected $map = null; // mars map cache
    protected $token_types_adjusted2 = false;
    public $dbUserPrefs;
    public $dbMultiUndo;
    protected $undoSavepointMeta = [];


    // cache
    function __construct() {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        self::initGameStateLabels([
            "gamestage" => 11,
            // game variants
            "var_begginers_corp" => 100,
            "var_corporate_era" => 101,
            "var_solo_flavour" => 102,
            "var_draft" => 103,
            "var_prelude" => 104,
            "var_live_scoring" => 105,
            "var_xundo" => 106, // multi step undo
            "var_map" => 107, // map number
            "var_colonies" => 108,
        ]);
        $this->dbUserPrefs = new DbUserPrefs($this);
        $this->tokens->autoreshuffle = true;
        $this->tokens->autoreshuffle_custom['deck_main'] = 'discard_main';
        $this->dbMultiUndo = new DbMultiUndo($this);
    }

    /**
     * override to setup all custom tables
     */
    protected function initTables() {
        try {
            $players = $this->loadPlayersBasicInfos();
            if ($this->player_preferences) $this->dbUserPrefs->setup($players, $this->player_preferences);
            $this->setGameStateValue('gamestage', MA_STAGE_SETUP);
            if ($this->isSolo() && !$this->isCorporateEraVariant()) {
                // for now it has to be set automatically
                $this->setGameStateValue("var_corporate_era", 1); // cannot be basic for solo
            }

            $this->adjustedMaterial(true);
            $this->createTokens();
            $this->tokens->shuffle("deck_main");
            $this->tokens->shuffle("deck_corp");
            $prelude  = $this->isPreludeVariant();
            $colonies  = $this->isColoniesVariant();
            if ($prelude) {
                $this->tokens->shuffle("deck_prelude");
            }

            $initial_draw = 10;
            $tr_value = 20;
            if ($this->isSolo()) {
                $tr_value = 14;
            }
            if ($this->isBasicVariant()) {
                $this->notifyAllPlayers('message', clienttranslate('Basic mode - everybody starts with 1 resource income'), []);
            }
            if ($this->isCorporateEraVariant()) {
                $this->notifyWithName('message', clienttranslate('Module: ${op_name}'), ['op_name' => 'Corporate Era']);
            } else if ($prelude) {
                $this->notifyWithName('message', clienttranslate('Module: ${op_name}'), ['op_name' => 'Prelude']);
            }

            if ($colonies) {
                $this->tokens->shuffle("deck_colo");
                $this->notifyWithName('message', clienttranslate('Module: ${op_name}'), ['op_name' => 'Colonies']);
                $numPlayers = count($players);

                if ($numPlayers == 2) $coloniesNum = 5;
                else if ($numPlayers == 1) $coloniesNum = 4; // will discard one later
                else $coloniesNum = $numPlayers + 2;
                $this->tokens->pickTokensForLocation($coloniesNum, 'deck_colo', 'display_colonies', -1);
                $this->activateColonies('');
            }

            $corps = 2; //(int)( $this->tokens->countTokensInLocation('deck_corp') / $this->getPlayersNumber());
            $begginerCorps = $this->getGameStateValue('var_begginers_corp') == 1;
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                if ($begginerCorps) {
                    $corp = $this->tokens->getTokenOfTypeInLocation("card_corp_1_", null, 0);
                    $this->effect_playCorporation($color, $corp['key'], false);
                    $this->tokens->pickTokensForLocation($initial_draw, "deck_main", "hand_$color");
                }

                if ($this->isBasicVariant()) {
                    $production = ['pm', 'ps', 'pu', 'pp', 'pe', 'ph'];
                    foreach ($production as $prodtype) {
                        $this->effect_incProduction($color, $prodtype, 1);
                    }
                }

                // set proper TR and matching score and matching stat
                $tr_traker = $this->getTrackerId($color, 'tr');
                $this->tokens->setTokenState($tr_traker, $tr_value);
                $this->dbSetScore($player_id, $tr_value, '');
                $this->setStat($tr_value, 'game_vp_tr', $player_id);

                // theme stat
                $theme = $this->dbUserPrefs->getPrefValue($player_id, 100);
                $this->setStat($theme, 'game_theme', $player_id);
            }

            if (!$begginerCorps) {
                $this->effect_queueMultiDrawSetup($initial_draw, $corps, $prelude ? 4 : 0);
            }


            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->queue($color, "finsetup");
                // give more time for setup
                if (!$begginerCorps) {
                    $this->giveExtraTime($player_id);
                    $this->giveExtraTime($player_id);
                }
            }

            if ($prelude) {
                foreach ($players as $player_id => $player) {
                    $color = $player["player_color"];
                    $this->queue($color, "prelude");
                }
            }
            $adj = $this->getMapNumber();
            $this->notifyWithName('message', clienttranslate('Map: ${map_name}'), ['map_name' => $this->getTokenName("map_$adj")]);

            if ($this->isSolo()) {
                $this->setupSoloMap();
            }

            $player_id = $this->getFirstPlayer();
            $this->setCurrentStartingPlayer($player_id);
            $this->queuePlayersTurn($player_id, false);
            $this->doUndoSavePoint(); // TODO?
        } catch (Exception $e) {
            $this->error($e);
        }
    }

    function getNonReservedHexes() {
        $nonreserved = [];
        foreach ($this->token_types as $key => $info) {
            if (startsWith($key, "hex_")) {
                if (array_get($info, 'reserved')) continue;
                if (array_get($info, 'ocean')) continue;
                $nonreserved[] = $key;
            }
        }
        return $nonreserved;
    }

    function getSoloMapPlacements() {
        $res['city'] = [];
        $res['forest'] = [];
        $nonreserved = $this->getNonReservedHexes();
        $len = count($nonreserved);
        $part[0] = array_slice($nonreserved, 0, floor($len / 2) - 2);
        $part[1] = array_slice($nonreserved, floor($len / 2) + 2);
        shuffle($part[0]);
        shuffle($part[1]);

        for ($i = 0; $i < 2; $i++) {
            while (true) {
                $hex = array_shift($part[$i]);
                if ($i == 0) break;
                $adj = $this->getAdjecentHexes($hex);
                $index = array_search($res['city'][0], $adj);
                if ($index !== false) continue;
                break;
            }
            unset($nonreserved[$hex]);
            $res['city'][$i] = $hex;
            $adj = $this->getAdjecentHexes($hex);
            shuffle($adj);

            while (true) {
                $foresthex = array_shift($adj);
                if (!$foresthex) break;
                $index = array_search($foresthex, $nonreserved);
                if ($index === false) {
                    continue;
                }
                unset($nonreserved[$index]); // remove adjecent to city so 2nd city cannot be there
                $res['forest'][$i] = $foresthex;
                break;
            }
        }
        return $res;
    }

    function setupSoloMap() {
        // place 2 random cities with forest
        $placements = $this->getSoloMapPlacements();
        $num = $this->getPlayersNumber() + 1;
        $botcolor = 'ffffff';
        for ($i = 0; $i < 2; $i++) {
            $hex =  $placements['city'][$i];
            $tile = $this->tokens->getTokenOfTypeInLocation("tile_2_", null, 0); // city
            $this->systemAssertTrue("tile not found", $tile);
            $this->dbSetTokenLocation($tile['key'], $hex, $num);
            $marker = $this->createPlayerMarker($botcolor);
            $this->tokens->moveToken($marker, $tile['key'], 0);
            $this->incTrackerValue($botcolor, 'city');
            $this->incTrackerValue($botcolor, 'cityonmars');
            $this->incTrackerValue($botcolor, 'land');

            $foresthex = $placements['forest'][$i];
            if (!$foresthex) continue;
            $tile = $this->tokens->getTokenOfTypeInLocation("tile_1_", null, 0); //forest
            $this->systemAssertTrue("tile not found", $tile);
            $this->dbSetTokenLocation($tile['key'], $foresthex, $num);
            $marker = $this->createPlayerMarker($botcolor);
            $this->tokens->moveToken($marker, $tile['key'], 0);
            $this->incTrackerValue($botcolor, 'forest');
            $this->incTrackerValue($botcolor, 'land');
        }
        $this->map = null;
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
        if ($this->isSolo()) {
            $gen = $this->tokens->getTokenState("tracker_gen");
            $max = $this->getLastGeneration() + 1;
            return 100 / $max * $gen;
        }
        return $this->getTerraformingProgression();
    }

    function getTerraformingProgression() {
        $oxigen = $this->tokens->getTokenState("tracker_o");
        $oceans = $this->tokens->getTokenState("tracker_w");
        $temp = $this->tokens->getTokenState("tracker_t");
        $max_oceans = $this->getRulesFor('tracker_w', 'max');
        $max_oxigen = $this->getRulesFor('tracker_o', 'max');
        $max_temp = $this->getRulesFor('tracker_t', 'max');
        return (100 * ($oxigen / $max_oxigen + $oceans / $max_oceans + ($temp + 30) / ($max_temp + 30))) / 3;
    }

    function isCorporateEraVariant() {
        return $this->getGameStateValue('var_corporate_era') == 1;
    }

    function isBasicVariant() {
        if ($this->isCorporateEraVariant()) return false;
        // if ($this->isPreludeVariant()) return false;
        // if ($this->isColoniesVariant()) return false;
        return true;
    }

    function isPreludeVariant() {
        return $this->getGameStateValue('var_prelude') == 1;
    }

    function isColoniesVariant() {
        return $this->getGameStateValue('var_colonies') == 1;
    }

    function isDraftVariant() {
        return $this->getGameStateValue('var_draft') == 1 && !$this->isSolo();
    }

    function getMapNumber() {
        return $this->getGameStateValue('var_map', 0);
    }

    protected function getAllDatas(): array {
        $this->prof_point("getAllDatas", "start");
        $result = parent::getAllDatas();
        $result['CON'] = $this->getPhpConstants("MA_");
        $current = $this->getCurrentPlayerId();
        if ($this->isRealPlayer($current)) {
            $result['server_prefs'] = $this->dbUserPrefs->getAllPrefs($current);
            $result['card_info'] = $this->getCardInfoInHand($current);
        } else
            $result['server_prefs'] = [];
        $result['scoringTable'] = $this->scoreAllTable();
        $result['progressTable'] = $this->getProgressTable();
        $result['gamestage'] = $this->getGameStateValue('gamestage');

        $result += $this->argUndo();
        $this->prof_point("getAllDatas", "end");
        return $result;
    }
    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////
    /*
     * In this space, you can put any utility methods useful for your game logic
     */
    function createCounterToken($token) {
        $info = $this->tokens->getTokenInfo($token);
        if ($info != null) {
            return $info;
        }
        $this->systemAssertTrue("Not found $token");
        $info = $this->getRulesFor($token, '*');
        $id = $info['_key'];
        $this->createTokenFromInfo($id, $info);
        return $info;
    }

    function debug_q() {
        //$this->dbMultiUndo->doSaveUndoSnapshot();
        $player_id = $this->getCurrentPlayerId();
        $this->debug_incparam('o', 13);
        $this->debug_incparam('t', 18);
        $this->debug_incparam('w', 11);
        $this->debug_incparam('gen', 10);
        $this->debug_optionUndo(1);

        $players = $this->loadPlayersBasicInfos();


        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $this->effect_incCount($color, 'pp', 8);
            $this->effect_incCount($color, 'pm', 20);
        }
        //$this->dbSetTokensLocation($cards, 'temp');
        //$this->gamestate->jumpToState(STATE_GAME_DISPATCH);
        //$card = "card_stanproj_1";
        //return $this->debug_opInfo("counter(all_city),m", $card);
        //$this->gamestate->nextState("next");

        // $player_id = $this->getFirstPlayer();
        // $this->setCurrentStartingPlayer($player_id);
        // $this->machine->queue("turn", 1, 1, $this->getPlayerColorById($player_id));


        // $this->dbIncScoreValueAndNotify($player_id, 5, clienttranslate('${player_name} scores ${inc} point/s'), null, [
        //     'target' => 'tile_3_1', // target of score animation
        // ]);
    }

    function debug_drawCard(string $fuzzy_card, string $loc = null) {
        $color = $this->getCurrentPlayerColor();


        if (!$loc) $loc = "hand_$color";
        if ($loc == 'draw') $loc = "draw_$color";
        if ($loc == 'tableau') $loc = "tableau_$color";
        if (!$fuzzy_card) {
            $this->effect_draw($color, 'deck_main', $loc, 1);
            return;
        }
        $token = $this->findCard($fuzzy_card);
        if (!$token) {
            throw new feException("Cannot find $fuzzy_card");
        }
        if ($this->tokens->getTokenInfo($token) == null) {
            // create
            $this->createTokenFromInfo($token, $this->getRulesFor($token, '*'));
        }
        $this->dbSetTokenLocation($token, $loc, 0);
    }
    function findCard($num) {
        if (is_numeric($num)) {
            $token = "card_main_$num";
            if (!array_get($this->token_types, $token)) {
                throw new feException("card not found $token");
            }
        } else if (is_string($num)) {
            $token = $num;
            if (!array_get($this->token_types, $token)) {
                $token = $this->mtFind('name', $num);
                if (!$token) throw new feException("card not found $num");
            }
        }
        return $token;
    }
    function debug_discardCard($fuzzy_card, $color = null) {
        if ($color === null) $color = $this->getCurrentPlayerColor();
        $card_id = $this->findCard($fuzzy_card);
        $this->effect_moveCard($color, $card_id, "discard_main", 0);
    }

    function debug_op(string $type) {
        $color = $this->getCurrentPlayerColor();
        $this->machine->interrupt();
        $this->push($color, $type);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
    function debug_dispatch() {
        $this->machine->normalize();
        // $this->debugLog("- done resolve", ["t" => $this->machine->gettableexpr()]);
        if ($this->isInMultiplayerMasterState()) {
            $currentPlayer = $this->getCurrentPlayerId();
            $this->machineMultiplayerDistpatchPrivate($currentPlayer);
        } else {
            $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
        }
    }

    function debug_money(int $x = 40) {
        $color = $this->getCurrentPlayerColor();
        $this->effect_incCount($color, 'm', $x);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }

    function debug_inc(string $res = 'm', int $count = 1) {
        $color = $this->getCurrentPlayerColor();
        $this->effect_incCount($color, $res, $count);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
    function debug_incparam(string $res = 'o', int $count = 1) {
        $color = $this->getCurrentPlayerColor();
        $this->effect_increaseParam($color, $res, $count, $res == 't' ? 2 : 1);
    }

    function debug_res(string $card) {
        $color = $this->getCurrentPlayerColor();
        $this->putInEffectPool($color, "res", $card);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }

    function debug_optionDraft(int $draft = 1) {
        $this->setGameStateValue('var_draft', $draft);
    }

    function debug_optionMap(int $number) {
        $this->setGameStateValue('var_map', $number);
    }
    function debug_optionPrelude(int $number) {
        $this->setGameStateValue('var_prelude', $number);
    }
    function debug_optionColonies(int $number) {
        $this->setGameStateValue('var_colonies', $number);
    }
    function debug_optionUndo(int $number = 1) {
        $this->setGameStateValue('var_xundo', $number);
    }


    function debug_cardInfo($card_id) {
        $color = $this->getCurrentPlayerColor();
        $payment = $this->getPayment($color, $card_id);
        return [
            "r" => $this->debug_opInfo($this->getRulesFor($card_id), $card_id),
            "canAfford" => $this->canAfford($color, $card_id),
            "payment" => $payment,
            "paymentop" => $this->debug_opInfo($payment, $card_id),
        ];
    }

    function debug_opInfo(string $type, string $data = '') {
        if (!$type) return [];
        $color = $this->getCurrentPlayerColor();
        $inst = $this->getOperationInstanceFromType($type, $color, 1, $data);
        return [
            "type" => $type,
            "args" => $inst->arg(),
            "canresolve" => $inst->canResolveAutomatically(),
            "ack" => $inst->requireConfirmation(),
            "auto" => $inst->isFullyAutomated()
        ];
    }

    // HEX MATH
    function getAdjecentHexes($coords, $valid_coords = null) {
        if (!$coords) {
            $this->error("empty coords in getAdjecentHexes");
            return [];
        }
        if ($coords == 'limbo') return [];
        $axis = explode("_", $coords);
        if (count($axis) < 3) {
            $this->error("bad $coords coords in getAdjecentHexes");
            return [];
        }
        if ($valid_coords == null)
            $valid_coords = $this->getPlanetMap(false);

        $neighbours = array();
        $x = $axis[1];
        $y = $axis[2];
        if ($x == 0)
            return []; // space areas
        $dx = ($y % 2) - 1;
        $trylist = [
            [$x + $dx, $y - 1],
            [$x + $dx + 1, $y - 1],
            [$x - 1, $y],
            [$x + 1, $y],
            [$x + $dx, $y + 1],
            [$x + $dx + 1, $y + 1],
        ];
        foreach ($trylist as $newax) {
            if ($newax[0] == 0)
                continue; // space areas
            $new_coords = "hex_" . ($newax[0]) . "_" . ($newax[1]);
            if (array_key_exists($new_coords, $valid_coords))
                $neighbours[] = $new_coords;
        }
        return $neighbours;
    }

    function getAdjecentHexesOfType($what, $towhat = 0, $ownwer = null) {
        $map = $this->getPlanetMap();
        if (startsWith($what, 'tile')) {
            $what = $this->tokens->getTokenLocation($what);
        }
        $adj = $this->getAdjecentHexes($what, $map);
        $res = [];
        foreach ($adj as $hex) {
            $tile = array_get($map[$hex], 'tile');
            if ($tile) {
                $tt = $this->getRulesFor($tile, 'tt');
                if ($towhat > 0 && $tt != $towhat) {
                    continue;
                }
                if ($ownwer !== null) {
                    $tileowner = array_get($map[$hex], 'owner');
                    if ($tileowner != $ownwer)
                        continue;
                }
                $res[] = $hex;
            }
        }
        return $res;
    }

    /**
     * Recursively floods the map with $flood_area color, it cannot be 0, all area has to painted 0 before this
     */
    private function  hexFlood($flood_area, $what, &$flood_map, $map, $owner) {
        if ($flood_map[$what] != 0) return;
        $info = array_get($map, $what);
        if (!$info) return;
        $tileowner = array_get($info, 'owner');
        if ($tileowner != $owner) return;
        $flood_map[$what] = $flood_area;

        $adj = $this->getAdjecentHexes($what, $map);
        foreach ($adj as $hex) {
            $this->hexFlood($flood_area, $hex, $flood_map, $map, $owner);
        }
    }


    function evaluateAdj($color, $ohex, $rule) {
        if (!$rule)
            return 0;
        switch ($rule) {
            case 'adj_city':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY));
            case 'adj_city_2':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY)) >= 2;
            case 'adj_city_0':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY)) == 0;
            case 'adj_forest':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_FOREST));
            case 'adj_ocean':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_OCEAN));
            case 'adj_own':
                return count($this->getAdjecentHexesOfType($ohex, 0, $color));
            case 'adj_no':
                return count($this->getAdjecentHexesOfType($ohex, 0)) == 0;
            case 'has_su':
                $pp = $this->getProductionPlacementBonus($ohex);
                return !!$pp;
            case 'Noctis City': // this happen when time rule in map that has it
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY)) == 0;
            default:
                throw new BgaSystemException("Unknown adj rule '$rule'");
        }
    }

    function getProductionPlacementBonus($ohex) {
        $bonus = $this->getRulesFor($ohex, 'r', '');
        if (strpos($bonus, 's') !== false) {
            if (strpos($bonus, 'u') !== false) {
                return 'ps/pu';
            }
            return 'ps';
        }
        if (strpos($bonus, 'u') !== false) {
            return 'pu';
        }
        if (strpos($bonus, 'q') !== false) { // any resource
            return 'ps/pu';
        }
        return '';
    }

    function createPlayerMarker($color) {
        $token = "marker_{$color}";
        $key = $this->tokens->createTokenAutoInc($token, "miniboard_{$color}");
        return $key;
    }

    function createPlayerResource($color) {
        $token = "resource_{$color}";
        $key = $this->tokens->createTokenAutoInc($token, "miniboard_{$color}");
        return $key;
    }

    function getCardInfoInHand($player_id = null) {
        if (!$player_id)
            $player_id  = $this->getCurrentPlayerId();
        $color = $this->getPlayerColorById($player_id);
        $keys = array_keys($this->tokens->getTokensInLocation("hand_$color"));
        return $this->filterPlayable($color, $keys);
    }

    function isSolo() {
        return $this->getPlayersNumber() == 1;
    }

    function getTags() {
        $res = [];
        foreach ($this->token_types as $key => $rules) {
            if (startsWith($key, 'tag'))
                $res[$key] = $rules;
        }
        return $res;
    }

    function getPlanetMap($load = true) {
        if ($this->map)
            return $this->map;
        $res = [];
        foreach ($this->token_types as $key => $rules) {
            if (startsWith($key, 'hex'))
                $res[$key] = $rules;
        }
        if (!$load)
            return $res;
        $tokens = $this->tokens->getTokensInLocation("hex%");
        foreach ($tokens as $key => $rec) {
            $loc = $rec['location'];
            if (startsWith($key, 'marker')) {
                // claimed
                $res[$loc]['claimed'] = getPart($key, 1);
            } else {
                $res[$loc]['tile'] = $key;
                $res[$loc]['owno'] = $rec['state']; // for now XXX
                $res[$loc]['owner'] = $this->getPlayerColorByNo($res[$loc]['owno']);
            }
        }
        $this->map = $res; // only cache full map
        return $res;
    }

    function notifyMessageWithTokenName($message, $card_id, $player_color = null, $args = []) {
        if (is_array($card_id)) {
            $card_id = $card_id["token_key"];
        }
        $args['token_name'] = $card_id;
        return $this->notifyMessage($message, $args, $this->getPlayerIdByColor($player_color));
    }

    protected function createTokens() {
        $corp_era  = $this->isCorporateEraVariant();
        $prelude  = $this->isPreludeVariant();
        $colonies  = $this->isColoniesVariant();
        foreach ($this->token_types as $id => $info) {
            if (startsWith($id, "card_")) {
                $deck = array_get($info, 'deck');
                if (!$corp_era) {
                    if ($deck == 'Corporate') {
                        continue;
                    }
                }
                if (!$prelude) {
                    if ($deck == 'Prelude') {
                        continue;
                    }
                }
                if (!$colonies) {
                    if ($deck == 'Colonies') {
                        continue;
                    }
                } else {
                    if ($deck == 'Corporate') {
                        continue;
                    }
                }
            }
            if ($id == 'card_stanproj_7') { // Buffer Gas
                if (!$this->isSolo()) continue;
                if ($this->getGameStateValue('var_solo_flavour') != 1) {      // !=TR63
                    continue;
                }
            }
            if ($id == 'card_stanproj_8') { // Colony
                if (!$colonies) {
                    continue;
                }
            }
            $this->createTokenFromInfo($id, $info);
        }
    }

    function adjustedMaterial(bool $force = false) {
        if ($this->token_types_adjusted2 && $force == false) {
            return $this->token_types;
        }
        $this->prof_point("adjust", "start");
        $this->token_types = $this->token_types_orignal;
        parent::adjustedMaterial($force);

        $adj = $this->getMapNumber();
        $num = $this->getPlayersNumber();
        $this->doAdjustMaterial($num, $adj);

        $expr_keys = ['r', 'e', 'a'];
        foreach ($this->token_types as $key => &$info) {
            if (startsWith($key, "card_") || startsWith($key, "hex_")) {
                $info['expr'] = [];
                foreach ($expr_keys as $field) {
                    $r = array_get($info, $field);
                    try {
                        if ($r) $info['expr'][$field] = OpExpression::arr($r);
                    } catch (Exception $e) {
                        $this->error("error while parsing $field $r");
                        $this->error($e);
                    }
                }
                $field = 'pre';
                $r = array_get($info, $field);
                try {
                    if ($r) $info['expr'][$field] = MathExpression::arr($r);
                } catch (Exception $e) {
                    $this->error("error while parsing $field $r");
                    $this->error($e);
                }
            }
            if (startsWith($key, "hex_")) {
                $name = array_get($info, 'name');
                if (!$name) {
                    //$info['name'] = clienttranslate('Hex');
                } else if (endsWith($name, 'Mons') || endsWith($name, 'Tholus')) {
                    $info['vol'] = 1;
                }
                if (array_get($info, 'ocean', 0) && !array_get($info, 'reserved', 0)) {
                    $info['reserved'] = 1;
                };
            }
        }
        $this->token_types['map']['w'] = 5;
        $this->token_types['map']['name'] = '';
        if ($this->getMapNumber() == MA_OPTVALUE_MAP_AMAZONIS_PLANITIA) {
            $this->token_types['tracker_o']['max'] = 18;
            $this->token_types['tracker_w']['max'] = 11;
            $this->token_types['tracker_t']['max'] = 14;
            $this->token_types['map']['w'] = 6;
        }
        switch ($this->getMapNumber()) {
            case MA_OPTVALUE_MAP_THARSIS:
                $this->token_types['map']['name'] = clienttranslate('Tharsis');
                break;
            case MA_OPTVALUE_MAP_AMAZONIS_PLANITIA:
                $this->token_types['map']['name'] = clienttranslate('Amazonis');
                break;
        }

        $this->token_types_adjusted2 = true;
        $this->prof_point("adjust", "end");
        return $this->token_types;
    }

    function doAdjustMaterial($num, $map) {
        //$this->debugConsole("adjust-variants p{$num}m{$map}");
        $table = &$this->token_types;
        foreach ($table as $key => $info) {
            $vars = explode('@', $key, 2);
            if (count($vars) <= 1)
                continue;
            $primary = $vars[0];
            $variant = $vars[1];
            // if variant matches
            $orig = $variant;
            $variant = preg_replace("/p{$num}/", "", $variant, 1);
            if ($orig != $variant) {
                $variant = preg_replace("/p[0-9]/", "", $variant);
            }

            $orig = $variant;
            $variant = preg_replace("/m{$map}/", "", $variant, 1);
            if ($orig != $variant) {
                $variant = preg_replace("/m[0-9]/", "", $variant);
            }

            if ($variant !== '') {
                unset($table[$key]);
                //$table["$primary@$variant"] = $table[$key]; // want not reduces, incompatible with this game
            } else {
                // override existing value
                if (is_array($table[$key])) {
                    $prev = array_get($table, $primary, []);
                    if (!is_array($prev)) {
                        $this->systemAssertTrue("Expecting array for $primary");
                    }
                    $table[$primary] = array_replace_recursive($prev, $table[$key]);
                } else
                    $table[$primary] = $table[$key];
                if ($key != $primary)
                    unset($table[$key]);
            }
        }
    }

    /**
     * Checks if can afford payment, if 4th arg is passed sets field $info['payop'] to payment operation  
     */
    function canAfford($color, $tokenid, $cost = null, &$info = null, string $extracontext = null) {
        if ($info == null) $info = [];
        if ($cost !== null) {
            $payment_op = "{$cost}nm";
        } else
            $payment_op = $this->getPayment($color, $tokenid, $extracontext);

        $info['payop'] = $payment_op;
        if ($this->isVoidSingle($payment_op, $color, 1, $tokenid)) {
            return false;
        }

        return true;
    }

    function evaluatePrecondition($cond, $owner, $tokenid, string $extracontext = null) {
        if ($cond) {
            $valid = $this->evaluateExpression($cond, $owner, $tokenid, ['wilds' => []]);
            if (!$valid) {
                $delta = $this->tokens->getTokenState("tracker_pdelta_{$owner}") ?? 0;
                // there is one more stupid event card that has temp delta effect
                $listeners = $this->collectListeners($owner, ['onPre_delta'], null, $extracontext);

                foreach ($listeners as $lisinfo) {
                    $outcome = $lisinfo['outcome'];
                    $delta += $outcome;
                }
                if ($delta) {
                    $valid = $this->evaluateExpression($cond, $owner, $tokenid, ['mods' => $delta, 'wilds' => []])
                        || $this->evaluateExpression($cond, $owner, $tokenid, ['mods' => -$delta, 'wilds' => []]);
                }
                if (!$valid) return false; // fail prereq check
            }
        }
        return true;
    }

    function precondition($owner, $tokenid, string $extracontext = null) {
        // check precondition
        $cond = $this->getRulesFor($tokenid, "pre");
        if ($cond) {
            $valid = $this->evaluatePrecondition($cond, $owner, $tokenid, $extracontext);
            if (!$valid) return MA_ERR_PREREQ; // fail prereq check
        }
        return MA_OK;
    }

    function postcondition($owner, $tokenid) {
        // special project sell XXX
        if (startsWith($tokenid, "card_stanproj_1")) {
            if ($this->isVoidSingle("sell", $owner)) {
                return MA_ERR_MANDATORYEFFECT;
            }
        }
        // check immediate effect affordability
        // note: we cannot check beyond first rule because afters its executed word changes and we cannot adjust for that
        $r = $this->getRulesFor($tokenid, "r");
        if ($r) {
            if ($this->isVoidSingle($r, $owner, 1, $tokenid)) {
                return MA_ERR_MANDATORYEFFECT;
            }
        }
        return MA_OK;
    }

    function playability($owner, $tokenid, &$info = null, $extracontext = null) {
        if ($info == null) $info = [];

        if (!$owner) {
            $owner = $this->getActivePlayerColor();
        }


        // check precondition
        $info['pre'] = $this->precondition($owner, $tokenid, $extracontext);

        // check immediate effect affordability
        $info['m'] = $this->postcondition($owner, $tokenid);

        // check cost
        $info['c'] = $this->canAfford($owner, $tokenid, null, $info, $extracontext) ? MA_OK : MA_ERR_COST;


        if ($info['pre']) {
            return $info['pre'];
        }

        if ($info['m']) {
            return  $info['m'];
        }

        if ($info['c']) {
            return $info['c'];
        }

        return MA_OK;
    }

    function evaluateExpression($cond, $owner = 0, $context = null, $options = null): int {
        try {
            if (!$owner)
                $owner = $this->getActivePlayerColor();
            if (strlen($cond) > 80) {
                throw new BgaSystemException("Parse expression is too long '$cond'");
            }
            $expr = MathExpression::parse($cond);
            $mapper = function ($x) use ($owner, $context, $options) {
                return $this->evaluateTerm($x, $owner, $context, $options);
            };
            return $expr->evaluate($mapper);
        } catch (Exception $e) {
            $this->error($e);
            throw new BgaSystemException("Cannot evaluate math expression '$cond'");
        }
    }

    function evaluateTerm($x, $owner, $context = null, ?array $options = null) {
        switch ($x) {
            case 'chand':
                return $this->tokens->countTokensInLocation("hand_$owner");
            case  'cityonmars':
                return $this->getCountOfCitiesOnMars("$owner");

            case  'all_cityonmars':
                return $this->getCountOfCitiesOnMars(null);

            case  'uniquetags':
                return $this->getCountOfUniqueTags("$owner");

            case  'cardreq':
                return $this->getCountOfCardsWithPre("$owner");
            case  'card_green':
                return $this->getCountOfCardsGreen("$owner");
            case  'card_blue':
                return $this->getCountOfCardsBlue("$owner");
            case 'polartiles':
                return $this->getCountOfPolarTiles("$owner");

            case  'resCard':
                return $this->tokens->countTokensInLocation("$context"); // number of resources on the card
            case  'res':
                if ($context) $this->tokens->countTokensInLocation("$context");
                return $this->getCountOfResOnCards("$owner");
            case  'resFloater':
                return $this->getCountOfResOnCards("$owner", 'Floater');
            case  'cost':
                return $this->getRulesFor($context, 'cost');

            case  'vptag':
                $rules = $this->getRulesFor($context, 'vp', '');
                if ($rules) {
                    if (is_numeric($rules) && $rules < 0) return 0;
                    return 1;
                }
                return 0;
            case 'generalist':
                return $this->getGeneralistCount($owner);
            case 'specialist':
                return $this->getSpecialistCount($owner);
            case 'ecologist':
                return $this->getEcologistCount($owner);
            case 'tycoon':
                return $this->getTycoonCount($owner);
            case 'celebrity':
                return $this->getCelebrity($owner);
            case 'desert':
                return $this->getCountOfDesertTiles($owner);
            case 'estate':
                return $this->getCountOfEstateTiles($owner);
            case 'geologist':
                return $this->getCountOfGeologistTiles($owner);
            case 'farmer':
                return $this->getCountOfResOnCards($owner, 'Animal') + $this->getCountOfResOnCards($owner, 'Microbe');
            case 'highlander':
                return $this->getCountOfHighlanderTiles($owner);
            case 'landscaper':
                return $this->getCountOfLandscapeTiles($owner);
            case 'collector':
                return $this->getCountOfUniqueTypesOfResources($owner);
            case 'landshaper':
                return $this->getCountOfUniqueTileTypes($owner);
            case 'minstanres':
                return $this->getMinOfStanardResources($owner);
            case 'delegates':
                return 0; // Turmoil expantion
            case 'cardsRed':
                return $this->getCountOfCardsRed($owner);
            case 'cardsGreen':
                return $this->getCountOfCardsGreen($owner);
            case 'cardsBlue':
                return $this->getCountOfCardsBlue($owner);
            case 'colony':
                return count($this->tokens->getTokensOfTypeInLocation("marker_{$owner}", "card_colo_%"));
            case 'tagNone':
                return $this->getCountOfCardTags($owner, "");
        }
        $type = $this->getRulesFor("tracker_$x", 'type', '');
        if ($type == 'param') {
            $value = $this->tokens->getTokenState("tracker_{$x}");
            if (!$options) return $value;
            $mods = array_get($options, 'mods', 0);
            if ($x == 't') $mods = $mods * 2;
            return $value + $mods;
        }

        $opp = startsWith($x, 'opp_');
        if (startsWith($x, 'all_') || $opp) {
            $x = substr($x, 4);
            $colors = $this->getPlayerColors();
            if ($this->isSolo()) $colors[] = 'ffffff';
            $value = 0;
            foreach ($colors as $color) {
                if ($opp && $color === $owner)
                    continue;
                $value += $this->evaluateTerm($x, $color, $context);
            }
            return $value;
        }
        if (startsWith($x, 'adj_')) {
            $cardNum = $this->getRulesFor($context, 'num');
            $tileId = "tile_$cardNum";
            return $this->evaluateAdj($owner, $tileId, $x);
        }
        $create = $this->getRulesFor("tracker_$x", "create", null);
        if ($create === null) {
            throw new feException("Cannot evalute $x");
        }
        # TODO: special processing with _all
        if ($create == 4) {
            // per player counter XXX _all
            $value = $this->tokens->getTokenState("tracker_{$x}_{$owner}");
            if (startsWith($x, 'tag')) {
                $wilds = array_get($options, 'wilds', null);

                if ($context == 'card_main_135') { // advanced ecosystems
                    // special expression one of each tag 
                    //((tagMicrobe>0) & (tagAnimal>0)) & (tagPlant>0)
                    // do not add wilds in this case
                    $wilds = null;
                }
                if ($wilds !== null) {
                    $valueWild = $this->tokens->getTokenState("tracker_tagWild_{$owner}");
                    $value += $valueWild;
                }
            }
        } else {
            $value = $this->tokens->getTokenState("tracker_{$x}");
        }
        return $value;
    }

    function getOperationInstance(array $opinfo): AbsOperation {
        $type = stripslashes($opinfo['type']);
        if ($opinfo['id'] === null) throw new feException('sd');
        $classname = 'xxx';
        try {
            $expr = $this->parseOpExpression($type);
            $issimple = $expr->isSimple();
            if (!$expr->isUnranged()) {
                $classname = "DelegatedOperation";
                $opinst = new DelegatedOperation($opinfo, $this);
                return $opinst;
            } else if (!$issimple) {
                // too complex
                $classname = "ComplexOperation";
                $opinst = new ComplexOperation($opinfo, $this);
                return $opinst;
            }
            $type = $expr->toUnranged(); // only things left is 1,1
            $matches = null;
            $params = null;
            if (preg_match("/^(\w+)\((.*)\)$/", $type, $matches)) {
                // function call
                $params = $matches[2];
                $type = $matches[1];
            }
            $rules = $this->getOperationRules($type);
            if (!$rules) {
                $rules = [];
                //throw new BgaSystemException("Operation is not defined for $type");
            }
            $classname = array_get($rules, "class", "Operation_$type");
            require_once "operations/$classname.php";
            $opinst = new $classname($type, $opinfo, $this);
            if ($params)
                $opinst->setParams($params);
            return $opinst;
        } catch (Throwable $e) {
            $this->error($e);
            throw new BgaSystemException("Cannot instantiate $classname for $type");
        }
    }

    function getOperationInstanceFromType(string $type, string $color, ?int $count = 1, string $data = ''): AbsOperation {
        $opinfo = [
            'type' => $type,
            'owner' => $color,
            'mcount' => $count,
            'count' => $count,
            'data' => $data,
            'flags' => 0,
            'id' => 0
        ];
        return self::getOperationInstance($opinfo);
    }

    function isPassed($color) {
        $playerId = $this->getPlayerIdByColor($color);
        return $this->isZombiePlayer($playerId) || $this->getTrackerValue($color, 'passed') == 1;
    }

    function incTrackerValue(string $color, $type, $inc = 1) {
        $token_id = $this->getTrackerId($color, $type);
        $this->tokens->incTokenState($token_id, $inc);
        $value = $this->tokens->getTokenState($token_id);
        $this->notifyCounterDirect($token_id, $value, '');
    }

    function setTrackerValue(string $color, $type, $value) {
        $token_id = $this->getTrackerId($color, $type);
        $this->tokens->setTokenState($token_id, $value);
        $this->notifyCounterDirect($token_id, $value, '');
        return $value;
    }

    function getTrackerId(string $color, string $type) {
        if ($color === '') {
            $token_id = "tracker_{$type}";
        } else {
            if (!$color) {
                $color = $this->getActivePlayerColor();
            }
            $token_id = "tracker_{$type}_{$color}";
        }
        return $token_id;
    }

    function getTrackerValue(string $color, string $type): int {
        $value = (int) $this->tokens->getTokenState($this->getTrackerId($color, $type));
        return $value;
    }

    function getCardsWithResource($par, $cardlike = "card_%") {
        $tokens = $this->tokens->getTokensOfTypeInLocation("resource", $cardlike);
        $keys = [];
        foreach ($tokens as $info) {
            $card = $info['location'];
            $holds = $this->getRulesFor($card, 'holds', '');
            if (!$holds)
                continue;
            if ($par && $holds != $par)
                continue;
            if (array_key_exists($card, $keys)) {
                $keys[$card]++;
            } else {
                $keys[$card] = 1;
            }
        }
        return $keys;
    }

    function queue($color, $type, $data = '') {
        $this->machine->queue($type, 1, 1, $color, MACHINE_OP_SEQ, $data);
    }

    function queueremove($color, $type, $pool = null) {
        $op = $this->findOpByType($color, $type, $pool);
        if ($op) $this->machine->hide($op);
        return $op;
    }

    function findOpByType($color, $type, $pool = null) {
        $ops = $this->machine->getOperations($color, $pool);
        foreach ($ops as $op_key => $op) {
            if ($op['type'] == $type) {
                return $op;
            }
        }
        return null;
    }

    function multiplayerqueue($color, $type, $data = '') {
        $this->machine->queue($type, 1, 1, $color, MACHINE_OP_SEQ, $data, 'multi');
    }

    function multiplayerpush($color, $type, $data = '') {
        $this->machine->push($type, 1, 1, $color, MACHINE_OP_SEQ, $data, 'multi');
    }

    function push($color, $type, $data = '') {
        $this->machine->push($type, 1, 1, $color, MACHINE_OP_SEQ, $data);
    }

    function put($color, $type, $data = '') {
        $this->machine->put($type, 1, 1, $color, MACHINE_OP_SEQ, $data);
    }

    function putInEffectPool($owner, $type, $data = '') {
        $this->machine->put($type, 1, 1, $owner, MACHINE_FLAG_UNIQUE, $data);
    }

    function getActiveEventListeners() {
        if (!$this->eventListners) {
            $cards = $this->tokens->getTokensOfTypeInLocation("card", "tableau_%");
            //$this->debugConsole("info",["cards"=>$cards]);
            $this->eventListners = [];
            foreach ($cards as $key => $info) {
                if ($this->updateListenerInfoForCard($key, $info))
                    $this->eventListners[$key] = $info;
            }
        }
        return $this->eventListners;
    }

    function updateListenerInfoForCard($key, &$info) {
        $e = $this->getRulesFor($key, 'e');
        if (!$e)
            return false;
        if (array_get($info, 'state', 1) == MA_CARD_STATE_FACEDOWN)
            return false;
        $info['e'] = $e;
        $loc = array_get($info, 'location');
        $info['owner'] = $loc ? substr($loc, strlen('tableau_')) : "";
        $info['key'] = $key;
        return true;
    }

    function clearEventListenerCache() {
        $this->eventListners = null; // clear event cache, have to call after any card comes into play or leaves play
    }

    function effect_moveCard($owner, $card_id, $place_id, $state = 0, $notif = "", $args = []) {
        if (!array_key_exists('_private', $args) && $place_id) {
            // moving cards to hand, draft and draw usuall private
            $site = getPart($place_id, 0);
            if ($site == 'hand' || $site == 'draw' || $site == 'draft') {
                $args['_private'] = true;
            }
        }
        $this->dbSetTokenLocation($card_id,  $place_id, $state, $notif, $args, $this->getPlayerIdByColor($owner));
    }
    function effect_moveResource($owner, $res_id, $place_id, $state = null, $notif = "", $card_id) {
        $holds = $this->getRulesFor($card_id, 'holds', '');

        $this->dbSetTokenLocation($res_id,  $place_id, $state, $notif, [
            'card_name' => $this->getTokenName($card_id),
            'restype_name' => $this->getTokenName("tag$holds")
        ], $this->getPlayerIdByColor($owner));
    }

    function effect_drawAndRevealTag(string $color, string $tag_name, bool $showWarning = false) {
        $deck = "deck_main";
        $card = $this->tokens->getTokenOnTop($deck, false);
        if (!$card) {
            $this->notifyMessage(clienttranslate('no more cards'), ['_notifType' => 'message_warning']);
            return null;
        }
        $this->setUndoSavepoint(true);
        $card_id = $card['key'];

        $this->effect_moveCard($color, $card_id, "reveal", MA_CARD_STATE_SELECTED);

        $tags = $this->getRulesFor($card_id, 'tags', '');
        $args = ['tag_name' => $tag_name];
        if ($showWarning)   $args += ['_notifType' => 'message_warning'];
        $this->giveExtraTime($this->getPlayerIdByColor($color)); // compensate for reveal time
        if (strstr($tags, $tag_name)) {
            $this->notifyMessageWithTokenName(clienttranslate('${player_name} reveals ${token_name}: it has a ${tag_name} tag'), $card_id, $color, $args);
            $this->notifyAnimate(1000); // delay to show the card
            return $card_id;
        } else {
            $this->notifyMessageWithTokenName(clienttranslate('${player_name} reveals ${token_name}: it does not have a ${tag_name} tag'), $card_id, $color, $args);
            $this->notifyAnimate(500); // delay to show the card
            $this->effect_moveCard($color, $card_id, "discard_main", 0);
            return false;
        }
    }

    function getNextDraftPlayerColor($color) {
        $player_id = $this->getPlayerIdByColor($color);
        $this->systemAssertTrue("invalid player id", $this->isRealPlayer($player_id));


        $gen = $this->tokens->getTokenState("tracker_gen");
        $num = $this->getPlayersNumber();

        while ($num-- >= 0) {
            if ($gen % 2 == 0)
                $other_id = $this->getPlayerAfter($player_id);
            else
                $other_id = $this->getPlayerBefore($player_id);

            if ($this->isPlayerAlive($other_id))
                return $this->getPlayerColorById($other_id);
            $player_id = $other_id;
        }
        // run out of attempts
        return $color;
    }

    function getNextReadyPlayer($player_id, $previous = false) {
        if (!$player_id) $player_id = $this->getCurrentStartingPlayer(); // fallback if we lost player id due to zombie
        $this->systemAssertTrue("invalid player id", $this->isRealPlayer($player_id));

        $num = $this->getPlayersNumber();
        while ($num-- >= 0) {
            if ($previous)
                $player_id = $this->getPlayerBefore($player_id);
            else
                $player_id = $this->getPlayerAfter($player_id);
            if ($this->isPlayerAlive($player_id) && !$this->isPassed($this->getPlayerColorById($player_id)))
                return $player_id;
        }
        // run out of attempts
        return 0;
    }


    function triggerEffect($owner, $events, $card_context) {
        $listeners = $this->collectListeners($owner, $events, $card_context);
        foreach ($listeners as $lisinfo) {
            $outcome = $lisinfo['outcome'];
            $card = $lisinfo['card'];
            $effect_owner = $lisinfo['owner'];
            if ($outcome == 'flip') {
                // special rule - flip does not trigger on itself
                if ($lisinfo['target'] == $card)
                    continue;
                // otherwise its immediate resolves
                $this->executeImmediately($effect_owner, $outcome, 1, $card);
                continue;
            }
            $data = $lisinfo['target'] . ":e:" . $card;
            if (startsWith($outcome, 'counter')) {
                // conditional
                $counterexpt = $this->parseOpExpression($outcome);
                $c = OpExpression::str($counterexpt->args[0]);
                $opinst = $this->getOperationInstanceFromType($c, $owner, 1, $data);
                if ($opinst instanceof Operation_counter) {
                    $val = $opinst->evaluate()[0];
                    if (!$val) continue;
                }
            }
            $this->notifyMessageWithTokenName(clienttranslate('${player_name} triggered effect of ${token_name}'), $card, $owner);
            // these goes in the pull where player can pick the sequence
            $this->putInEffectPool($effect_owner, $outcome, $data);
        }
    }

    function hasTag(string $card_id, string $tag) {
        $tags = $this->getRulesFor($card_id, 'tags', '');
        if (strstr($tags, $tag)) return true;
        if ($tags == "" && $tag == "none") return true;
        if (!$tag) return true;
        return false;
    }

    function collectDiscounts($owner, $card_id, string $extracontext = null) {
        // event will be onPay_card or similar
        // load all active effect listeners
        $discount = 0;
        if ($this->playerHasCard($owner, 'card_corp_12')) {
            // ThorGate
            if ($card_id == 'card_stanproj_2' || strstr($this->getRulesFor($card_id, 'tags', ''), 'Energy')) {
                $discount += 3;
            }
        }

        if (startsWith($card_id, 'card_main')) {
            $events = $this->getPlayCardEvents($card_id, 'onPay_');
            $listeners = $this->collectListeners($owner, $events, null, $extracontext);
            foreach ($listeners as $lisinfo) {
                $outcome = $lisinfo['outcome'];
                // at this point only discounts are MC
                $opexpr = $this->parseOpExpression($outcome);
                $this->systemAssertTrue("Not expecting other payment options", $opexpr->args[0] == 'm');
                $discount += $opexpr->to;
            }
        }
        return $discount;
    }

    function collectListeners($owner, $events, $card_context = null, string $extracontext = null) {
        // load all active effect listeners
        $cards = $this->getActiveEventListeners();

        if (!is_array($events)) {
            $events = [$events];
        }
        $contextcardinplay = false;
        foreach ($cards as $info) {
            $card = array_get($info, 'key');
            if ($card === $extracontext) $contextcardinplay = true;
        }
        $res = [];
        if ($extracontext && !$contextcardinplay) {
            $info = ['key' => $extracontext];
            $this->updateListenerInfoForCard($extracontext, $info);
            $cards[] = $info;
        }
        foreach ($cards as $info) {
            $card = array_get($info, 'key');
            if ($card === $extracontext) $contextcardinplay = true;
            $e = array_get($info, 'e');
            if (!$e) continue;
            $lisowner = $info['owner'] ? $info['owner'] : $owner;
            foreach ($events as $event) {
                $ret = $info;
                // filter for listener for specific effect
                if ($this->mtMatchEvent($e, $lisowner, $event, $owner, $ret)) {
                    $context = $ret['context'];
                    $ret['card'] = $card;
                    $ret['event'] = $event;
                    $ret['target'] = $context === 'that' ? $card_context : $card;
                    $res[] = $ret;
                }
            }
        }

        return $res;
    }

    function protectedOwners($color, $defense) {
        $protected = [];
        if ($defense == 'p') $defense = 'Plant';
        if ($defense) {
            $listeners = $this->collectListeners(null, ["defense$defense"]);
            foreach ($listeners as $lisinfo) {
                $other_player_color = $lisinfo['owner'];
                if ($other_player_color !== $color)
                    $protected[$lisinfo['owner']] = 1;
            }
        }
        return $protected;
    }

    /** Find stuff in material file */
    function mtFind(string $field, ?string $value, bool $ignorecase = true) {
        foreach ($this->token_types as $key => $rules) {
            $cur = array_get($rules, $field, null);
            if ($cur === $value) return $key;
            if ($ignorecase && is_string($cur) && strcasecmp($cur, $value) == 0) return $key;
        }
        return null;
    }
    function mtFindByName(string $value, bool $ignorecase = true) {
        return $this->mtFind('name', $value, $ignorecase);
    }

    /**
     * Triggered action syntax:
     * <list> ::= <trigger_rule> || <trigger_rule> ';' <list>
     * <trigger_rule> ::= <trigger> ':' <outcome> | <trigger> ':' <outcome> ':' 'that'
     *
     * <event> ::= <trigger>
     *
     * @param string $declared
     *            Effect: When you play a plant, microbe, or an animal tag, including this, gain 1 plant or add 1
     *            resource TO THAT CARD.
     *            - play_tagPlant: (p/res): that; play_tagMicrobe: (p/res): that
     *            
     * @param string $event-
     *            what actually happen, play_tagMicrobe
     * @param array $splits
     * @return boolean
     */
    function mtMatchEvent($trigger_rule, $trigger_owner, $event, $event_owner, &$splits = []) {
        if (!$trigger_rule)
            return false;
        $expr = $this->parseOpExpression($trigger_rule);
        if ($expr->op != ';')
            $args = [$expr];
        else
            $args = $expr->args;
        $match = false;
        foreach ($args as $arg) {
            if ($arg->op != ':')
                throw new BgaSystemException("Cannot parse $trigger_rule missing : " . OpExpression::str($arg));
            $all = OpExpression::str(array_get($arg->args, 3, ''));
            if (($trigger_owner === $event_owner || $all === 'any')) { // for now only listen to own events
                $declareevent = OpExpression::str($arg->args[0]);
                $regex = MathLexer::toregex($declareevent);
                if (preg_match($regex, $event) == 1) {
                    $outcome = $arg->args[1]->__toString();
                    if (array_get($splits, 'outcome')) {
                        $splits['outcome'] .= "," . $outcome;
                    } else {
                        $splits['outcome'] = $outcome;
                    }
                    $splits['context'] = OpExpression::str(array_get($arg->args, 2, '')); // can be 'that' - meaning context of card that triggered the event vs event handler

                    $match = true;
                }
            }
        }
        return $match;
    }

    function getPayment($color, $card_id, string $extracontext = null): string {
        $costm = $this->getRulesFor($card_id, "cost", 0);

        $discount = $this->collectDiscounts($color, $card_id, $extracontext);
        $costm = max(0, $costm - $discount);
        if ($costm == 0)
            return "nop"; // no-op

        return "{$costm}nm";
    }

    function getCurrentStartingPlayer() {
        $loc = $this->tokens->getTokenLocation('starting_player');
        if (!$loc)
            return $this->getFirstPlayer();
        $color = getPart($loc, 1, true);
        if (!$color)
            return $this->getFirstPlayer();
        return $this->getPlayerIdByColor($color);
    }

    function setCurrentStartingPlayer(int $playerId) {
        $color = $this->getPlayerColorById($playerId);
        $this->gamestate->changeActivePlayer($playerId);
        if (!$this->isSolo()) {
            $this->dbSetTokenLocation('starting_player', "tableau_$color", 0, clienttranslate('${player_name} is starting player for this generation'), [], $playerId);
        }
    }

    function isEndOfGameAchived() {
        if ($this->isSolo()) {
            $gen = $this->tokens->getTokenState("tracker_gen");
            $maxgen = $this->getLastGeneration();
            if ($gen >= $maxgen) {
                return true;
            } else {
                return false; // game ends after generation X even terraforming is complete before
            }
        }
        return $this->getTerraformingProgression() >= 100;
    }

    function getLastGeneration() {
        $maxgen = $this->getRulesFor('solo', 'gen');
        if ($this->isPreludeVariant()) $maxgen -= 2; // Prelude sole ends with 12 generations not 14
        if ($this->getMapNumber() == MA_OPTVALUE_MAP_AMAZONIS_PLANITIA && $this->getGameStateValue('var_solo_flavour') == 0) $maxgen += 2; // This map is not design for solo mode really
        return $maxgen;
    }

    function playerHasCard($color, $token_id) {
        $info = $this->tokens->getTokenInfo($token_id);
        if (!$info) return false;
        if ($info['location'] == "tableau_$color") return true;
        return false;
    }

    function switchActivePlayerIfNeeded($player_color) {
        if (!$player_color) return;
        $player_id = $this->getPlayerIdByColor($player_color);
        if (!$player_id) return;
        if ($this->isZombiePlayer($player_id)) return;

        if ($this->isInMultiplayerMasterState()) {
            if (!$this->gamestate->isPlayerActive($player_id))
                $this->gamestate->setPlayersMultiactive([$player_id], "notpossible", false);
            $this->giveExtraTime($player_id);
            return;
        }

        $active_player = $this->getActivePlayerId();

        // in this game we never switch active player during the single active state turns
        // in the normal game state
        if ($active_player != $player_id) {
            $stage = $this->getGameStateValue('gamestage');
            if ($stage != MA_STAGE_GAME || $this->isZombiePlayer($active_player)) {
                $this->setNextActivePlayerCustom($player_id);
                $this->undoSavepointWithLabel("switchplayer");
                return;
            }
        }

        $this->giveExtraTime($active_player);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////


    function action_undo(int $move_id = 0) {
        // unchecked action

        if ($this->isMultiActive()) {
            // special undo 
            $player_id = $this->getCurrentPlayerId();
            //for now there is only one case so not need to check oprations
            //$operations = $this->getTopOperations();
            $color = $this->getPlayerColorById($player_id);
            if (!$color) return; // not a player
            $this->effect_undoBuyCards($color);
            return;
        }
        $this->customUndoRestorePoint($move_id); //UNDOX
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }


    function action_changePreference($player_id, $pref, $value) {
        // anytime action, no checks
        $current_player_id = $this->getCurrentPlayerId();
        $this->systemAssertTrue("unauthorized action", $current_player_id == $player_id);
        $message = '';
        if ($this->isRealPlayer($player_id)) {
            $this->dbUserPrefs->setPrefValue($player_id, $pref, $value);

            if ($pref == 100) {
                // record the theme for bug report info
                $message = clienttranslate('${player_name} changed "Theme" to value ${pref_value}');
            }
        }
        $this->notifyWithName('ack', $message, ['pref_id' => $pref, 'pref_value' => $value], $current_player_id);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Effects
    ////////////


    function effect_playCard($color, $card_id) {
        $rules = $this->getRulesFor($card_id, '*');
        $ttype = $rules['t']; // type of card
        $state = MA_CARD_STATE_TAGUP;
        if ($ttype == MA_CARD_TYPE_EVENT) {
            $state = MA_CARD_STATE_FACEDOWN;
        }
        if ($ttype == MA_CARD_TYPE_EVENT || $ttype == MA_CARD_TYPE_PRELUDE) {
            if (isset($rules['e'])) {
                // single use effect
                $state = MA_CARD_STATE_ACTION_SINGLEUSE;
            }
        }
        if (isset($rules['a'])) {
            $state = MA_CARD_STATE_ACTION_UNUSED; // activatable cars
        }
        $tags = $rules['tags'] ?? "";
        $tagsarr = explode(' ', $tags);
        if ($ttype != MA_CARD_TYPE_EVENT && $tags) {
            $tagsMap = $this->getTagsMap($color);
            unset($tagsMap['']);
            unset($tagsMap['Wild']);
            foreach ($tagsarr as $tag) {
                $this->incTrackerValue($color, "tag$tag");
                if (array_get($tagsMap, $tag, 0) == 0) {
                    $this->triggerEffect($color, 'play_newtag', $card_id);
                }
            }
        }
        $this->dbSetTokenLocation($card_id, "tableau_$color", $state, clienttranslate('${player_name} plays card ${token_name}'), [], $this->getPlayerIdByColor($color));
        $this->clearEventListenerCache(); // clear cache since card came into play

        if ($ttype == MA_CARD_TYPE_EVENT) {
            $this->incTrackerValue($color, "tagEvent");
        }
        $playeffect = array_get($rules, 'r', '');
        if ($playeffect) {
            //$this->debugLog("-come in play effect $playeffect");
            $this->putInEffectPool($color, $playeffect, "$card_id:r");
        }
        $events = $this->getPlayCardEvents($card_id, 'play_');
        $this->triggerEffect($color, $events, $card_id);
        $this->activateColonies($card_id);
        $this->notifyScoringUpdate();
    }

    function effect_playCorporation(string $color, string $card_id, bool $setup) {
        $player_id = $this->getPlayerIdByColor($color);
        if ($setup) {
            $cost = -$this->getRulesFor($card_id, 'cost');
            $this->effect_moveCard($color, $card_id, "hand_$color", MA_CARD_STATE_ACTION_UNUSED, clienttranslate('${player_name} chooses corporation ${token_name}'), [
                "_private" => true,
                "cost" => $cost
            ]);

            $this->effect_incCount($color, 'm', $cost, ['message' => '']);
            return;
        }
        $this->effect_moveCard($color, $card_id, "tableau_$color", MA_CARD_STATE_ACTION_UNUSED, clienttranslate('${player_name} chooses corporation ${token_name}'));
        $this->effect_untap($card_id);
        $this->clearEventListenerCache(); // clear cache since corp came into play
        $tags = $this->getRulesFor($card_id, 'tags', '');
        $tagsarr = explode(' ', $tags);
        if ($tags) {
            foreach ($tagsarr as $tag) {
                $this->incTrackerValue($color, "tag$tag");
            }
        }
        $rules = $this->getRulesFor($card_id, 'r', '');
        $this->executeImmediately($color, $rules, 1, $card_id);
        $events = $this->getPlayCardEvents($card_id, 'play_');
        $this->triggerEffect($color, $events, $card_id);
        $this->activateColonies($card_id);

        // special case for Tharsis Republic it gains income for 2 placed cities in solo game
        if ($this->isSolo()) {
            if ($card_id == 'card_corp_11') {
                $this->effect_incProduction($color, 'pm', 2);
            }
        }
    }

    function effect_placeTile(string $color, $object, $target) {
        $this->systemAssertTrue("Invalid tile", $object);
        $this->systemAssertTrue("Invalid target", $target);
        $this->systemAssertTrue("Invalid tile, does not exists $object", $this->tokens->getTokenInfo($object));
        $player_id = $this->getPlayerIdByColor($color);
        $otype = $this->getRulesFor($object, 'tt');
        $no = $this->getPlayerNoById($player_id);
        if ($otype == MA_TILE_OCEAN)
            $no = -1;
        $marker_info = $this->tokens->getTokenOnLocation($target);
        $x = getPart($target, 1, true);
        $y = getPart($target, 2, true);
        $this->dbSetTokenLocation(
            $object,
            $target,
            $no,
            clienttranslate('${player_name} places ${token_name} on ${place_name} (${x},${y})'),
            ['x' => $x, 'y' => $y],
            $player_id
        );

        if ($otype != MA_TILE_OCEAN) {
            if ($marker_info) $marker = $marker_info['key'];
            else  $marker = $this->createPlayerMarker($color);
            $this->dbSetTokenLocation($marker, $object, 0, '', [], $player_id);
            $this->incTrackerValue($color, 'land');
        }
        $this->map = null; // clear map cache since tile came into play ! important
        // notif
        $tile = $object;
        $this->triggerEffect($color, 'place_tile', $tile);

        // hex bonus
        $bonus = $this->getRulesFor($target, 'r');
        if ($bonus) {
            //$this->debugLog("-placement bonus $bonus");
            $this->putInEffectPool($color, $bonus, $object);

            if (strpos($bonus, 's') !== false || strpos($bonus, 'u') !== false  ||   strpos($bonus, 'q') !== false) {
                $this->triggerEffect($color, 'place_bonus_su', $tile);
            }
        }
        // ocean bonus
        $oceans = $this->getAdjecentHexesOfType($target, MA_TILE_OCEAN);
        $c = count($oceans);
        if ($c) {
            $c = $c * 2;
            $bonus = "{$c}m"; // 2 MC per ocean
            //$this->putInEffectPool($color, $bonus, $object);
            $this->executeImmediately($color, $bonus); // not much reason to put in the pool
        }
        $this->notifyScoringUpdate();
        return $object;
    }

    function effect_alteratingDraw($numcards, $location) {
        $players = $this->loadPlayersBasicInfos();
        $count = $this->tokens->countTokensInLocation("deck_main") + $this->tokens->countTokensInLocation("discard_main");
        if ($count < count($players) * $numcards) {
            $numcards = (int) ($count / count($players));
            if ($numcards) $this->notifyAllPlayers('message_warning', clienttranslate('Not enought cards to draw, splitting equally'), []);
            else $this->notifyAllPlayers('message_warning', clienttranslate('No cards left'), []);
        }

        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $this->effect_draw($color, "deck_main", "{$location}_$color", $numcards);
        }
        return $numcards;
    }

    function effect_queueMultiDrawSetup($numcards = 10, $corps = 2, $prelude = 0) {
        $players = $this->loadPlayersBasicInfos();

        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $this->tokens->pickTokensForLocation($corps, "deck_corp", "draw_$color");
            $this->tokens->pickTokensForLocation($numcards, "deck_main", "draw_$color");
            if ($prelude > 0) $this->tokens->pickTokensForLocation($prelude, "deck_prelude", "draw_$color");
        }

        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            if ($corps + $numcards + $prelude) $this->multiplayerqueue($color, "setuppick");
        }
    }

    function effect_queueMultiDraw($numcards = 4) {
        $players = $this->loadPlayersBasicInfos();
        if ($this->isDraftVariant()) {
            $this->notifyAllPlayers('message', clienttranslate('Research draft'), []);
            $numcards = $this->effect_alteratingDraw($numcards, "draft");
            for ($i = 0; $i < $numcards; $i++) {
                foreach ($players as $player_id => $player) {
                    $color = $player["player_color"];
                    $this->multiplayerqueue($color, "draft");
                }
                $this->queue(0, "passdraft");
            }
        } else {
            $numcards = $this->effect_alteratingDraw($numcards, "draw");
        }

        // multiplayer buy
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            if ($numcards) $this->multiplayerqueue($color, "{$numcards}?buycard");
        }

        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $this->queue($color, "prediscard");
        }
    }

    function effect_undoBuyCards($owner) {
        $color = $owner;
        $player_id = $this->getPlayerIdByColor($color);
        $this->systemAssertTrue("unexpected non multiplayerstate", $this->isInMultiplayerMasterState());

        $this->notifyMessage(clienttranslate('${player_name} takes back their move'), [], $player_id);
        $operations = $this->getTopOperationsMulti($owner);
        if (count($operations) == 0) {
            $operations = $this->machine->getTopOperations(null, 'main');
        }
        if (count($operations) == 0) throw new BgaUserException(self::_("Nothing to undo"));
        $op = array_shift($operations);
        $optype = $op['type'];
        switch ($optype) {
            case 'passdraft':
            case 'draft':
                $op = $this->getOperationInstanceFromType('draft', $color);
                $op->undo();
                $this->machineMultiplayerDistpatchPrivate($player_id);
                return;
            case 'finsetup':
            case 'confnocards':
            case 'confnoprelude':
                $op = $this->getOperationInstanceFromType('setuppick', $color);
                $op->undo();
                $this->machineMultiplayerDistpatchPrivate($player_id);
                return;
            case 'prediscard':
            case 'buycard':
                $op = $this->getOperationInstanceFromType('buycard', $color);
                $op->undo();
                $this->machineMultiplayerDistpatchPrivate($player_id);
                return;
            case 'setuppick':
                throw new BgaUserException(self::_("Nothing to undo"));
        }
        $this->systemAssertTrue("Cannot undo $optype");
    }

    function  activateColonies($card_id = '') {
        Operation_trade::activateColoniesOnPlayCard($card_id, $this);
    }

    function getPlayCardEvents($card_id, $prefix = ''): array {
        $rules = $this->getRulesFor($card_id, '*');
        $tags = $rules['tags'] ?? "";
        $tagsarr = explode(' ', $tags);
        $events = [];
        $tagMap = [];
        if ($tags)
            foreach ($tagsarr as $tag) {
                $events[] = "{$prefix}tag$tag";
                $tagMap[$tag] = 1;
            }
        if (array_get($tagMap, 'Space') && array_get($tagMap, 'Event'))
            $events[] = "{$prefix}cardSpaceEvent";
        $uniqueTags = array_keys($tagMap);
        sort($uniqueTags);
        foreach ($uniqueTags as $tag) {
            $events[] = "{$prefix}card$tag";
        }
        if (startsWith($card_id, 'card_main'))  $events[] = "{$prefix}card";
        return $events;
    }

    function effect_incCount(string $color, string $type, int $inc = 1, array $options = []) {
        $message = array_get($options, 'message', '*');
        unset($options['message']);
        $token_id = $this->getTrackerId($color, $type);
        $this->createCounterToken($token_id);
        $this->dbResourceInc($token_id, $inc, $message, [], $this->getPlayerIdByColor($color), $options);
    }

    /**
     * sanitize the color if passed via REST calls
     */
    function checkColor(&$owner) {
        if (is_numeric($owner)) $owner = (string) $owner;
        $this->systemAssertTrue("invalid owner", is_string($owner));
        if ($this->getPlayerIdByColor($owner) == 0) {
            if ($owner === 'ffffff') return true;
            $this->systemAssertTrue("invalid owner $owner");
        }
        return true;
    }

    function effect_incProduction(string $color, $type, $inc = 1, $options = []) {
        $token_id = $this->getTrackerId($color, $type);
        $min = $this->getRulesFor($token_id, 'min', 0);
        $current = $this->tokens->getTokenState($token_id);
        $cando = $inc >= 0 ? true : $current + $inc >= $min;
        if (!$cando) {
            throw new feException("Not enough production to decrease");
        }
        if (array_get($options, 'onlyCheck')) {
            return;
        }
        $value = $this->tokens->setTokenState($token_id, $current + $inc);
        $mod = $inc;
        if ($inc > 0)
            $message = clienttranslate('${player_name} increases ${token_name} by ${mod}');
        else {
            $message = clienttranslate('${player_name} reduces ${token_name} by ${mod}');
            $mod = -$inc;
        }
        $this->notifyCounterDirect($token_id, $value, $message, ["mod" => $mod, "token_name" => $token_id] + $options, $this->getPlayerIdByColor($color));
    }

    function effect_increaseParam($color, $type, $steps, $perstep = 1, array $options = []) {
        if (!$color) {
            $color = $this->getActivePlayerColor();
        }
        $token_id = "tracker_$type";
        $inc = $steps * $perstep;
        $max = $this->getRulesFor($token_id, 'max', 30);
        $current = $this->tokens->getTokenState($token_id);
        if ($current + $inc > $max) {
            $inc = $max - $current;
            $steps = $inc / $perstep;
            if ($inc <= 0) {
                $this->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} is at max, can no longer increase'), $token_id);
                return false;
            }
        }
        $value = $this->tokens->setTokenState($token_id, $current + $inc);
        $message = clienttranslate('${player_name} increases ${token_name} by ${steps} step/s to a value of ${counter_value}');
        $this->notifyCounterDirect($token_id, $value, $message, [
            "inc" => $inc,
            "steps" => $steps,
            "token_name" => $token_id,
        ], $this->getPlayerIdByColor($color));
        if ($value >= $max) {
            $this->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} is at max'), $token_id, $color, [
                '_notifType' => 'message_warning'
            ]);
        }
        // check bonus
        for ($i = $perstep; $i <= $inc; $i += $perstep) {
            $v = $current + $i;
            $nvalue = $v >= 0 ? $v : "n" . (-$v);
            $bounus_name = "param_{$type}_{$nvalue}";
            $bonus = $this->getRulesFor($bounus_name, 'r');
            if ($bonus) {
                //$this->debugLog("-param bonus $bonus");
                $this->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} increase triggers a bonus'), $token_id);
                $this->putInEffectPool($color, $bonus);
            }
        }

        $this->effect_incTerraformingRank($color, $steps, ['reason_tr' => $this->getReason("op_$type")]);
        if ($this->getTerraformingProgression() >= 100) {
            $this->notifyWithName('message_warning', clienttranslate("The terraforming is complete!!!"));
        }
        return true;
    }

    function getReason(string $data) {
        if (!$data) return "";
        $split = explode(':', $data);
        $context = array_get($split, 0, '');
        $type = array_get($split, 1, '');
        $game = $this;
        if (!$context && !$type) return '';
        if (!$type) return $game->getTokenName($context);

        switch ($type) {
            case 'e':
                $from = array_get($split, 2, '');
                return [
                    'log' => clienttranslate('triggered effect of ${from_tr}'),
                    'args' => [
                        'from_tr' => $game->getTokenName($from)
                    ]
                ];
            case 'a':

                return [
                    'log' => clienttranslate('activation effect of ${name_tr}'),
                    'args' => [
                        'name_tr' => $game->getTokenName($context)
                    ]
                ];
            case 'r':
                return [
                    'log' => clienttranslate('immediate effect of ${name_tr}'),
                    'args' => [
                        'name_tr' => $game->getTokenName($context)
                    ]
                ];
            default:
                $ttype = $game->getTokenName($type);
                return [
                    'log' => '${name_tr}: ${type_tr}',
                    'args' => [
                        'name_tr' => $game->getTokenName($context),
                        'type_tr' => $ttype,
                    ]
                ];
                break;
        }
    }

    function isLiveScoringDisabled() {
        return $this->getGameStateValue('var_live_scoring') == 2;
    }

    function notifyScoringUpdate() {
        if (!$this->isLiveScoringDisabled())
            $this->notifyAllPlayers('scoringTable', '', ['data' =>   $this->scoreAllTable()]);
    }

    function effect_incTerraformingRank(string $owner, int $inc, array $options = []) {
        $op = 'tr';
        $this->effect_incCount($owner, $op, $inc, $options);
        $player_id = $this->getPlayerIdByColor($owner);
        $count = $this->dbIncScore($player_id, $inc);
        $tracker = $this->getTrackerId($owner, $op);

        if ($this->isLiveScoringDisabled()) {
            $this->notifyWithName("score", '', [
                "player_score" => $count,
                "inc" => $inc,
                "mod" => abs((int) $inc),
                'target' => $tracker
            ], $player_id);
        } else {
            // send scoring table instead
            $this->notifyScoringUpdate();
        }


        // special case corp United, hardcoded rule - when you increase tr this gen - you can play this action
        $card_id = 'card_corp_13';
        if ($this->playerHasCard($owner, $card_id)) {
            $current_state = $this->tokens->getTokenState($card_id);
            if ($current_state != MA_CARD_STATE_ACTION_USED) {
                $this->dbSetTokenState($card_id, MA_CARD_STATE_ACTION_UNUSED);
            }
        }
    }

    function effect_draw($color, $deck, $to, $inc) {
        $was_reshuffled = false;
        $tokens = $this->tokens->pickTokensForLocation($inc, $deck, $to, 0, false, $was_reshuffled);
        $player_id = $this->getPlayerIdByColor($color);
        $this->dbSetTokensLocation($tokens, $to, null, clienttranslate('${player_name} draws ${token_names}'), [
            "_private" => true,
            "place_from" => $deck,
        ], $player_id);
        $this->notifyMessage(clienttranslate('${player_name} draws ${token_count} cards'), [
            "token_count" => count($tokens),
        ], $player_id);
        if ($was_reshuffled) {
            $this->notifyMessage(clienttranslate('${player_name} reshuffles project card deck'), [], $player_id);
            $this->notifyCounterChanged($this->tokens->autoreshuffle_custom[$deck], ["nod" => true]);
        }
        $this->undoSavepointWithLabel("draw", MA_UNDO_BARRIER);
        return $tokens;
    }

    function effect_untap($cardid) {
        $rules = $this->getRulesFor($cardid, '*');
        if (isset($rules['apre'])) {
            $state = MA_CARD_STATE_ACTION_UNUSED_PRE; // activatable cards with precondition
            $this->dbSetTokenState($cardid, $state, '');
        } else if (isset($rules['a'])) {
            $state = MA_CARD_STATE_ACTION_UNUSED; // activatable cards
            $this->dbSetTokenState($cardid, $state, '');
        } else if (isset($rules['e']) && $rules['t'] == MA_CARD_TYPE_EVENT) {
            if ($this->tokens->getTokenState($cardid) == MA_CARD_STATE_ACTION_SINGLEUSE) {
                $state = MA_CARD_STATE_FACEDOWN; // flip single use events
                $this->dbSetTokenState($cardid, $state, '');
            }
        }
    }

    function effect_production() {
        $params = ['m', 's', 'u', 'p', 'e', 'h'];
        $players = $this->loadPlayersBasicInfos();
        $nodargs = ['nod' => 1];
        foreach ($params as $p) {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $prod = $this->tokens->getTokenState("tracker_p{$p}_{$color}");
                if ($p == 'e') {
                    // energy to heat
                    $curr = $this->tokens->getTokenState("tracker_{$p}_{$color}");
                    if ($curr > 0) {
                        $this->effect_incCount($color, 'h', $curr, [
                            'message' => clienttranslate('${player_name} gains ${token_div_count} due to heat transfer'),
                            'nod' => 1
                        ]);
                        $this->effect_incCount($color, 'e', -$curr, $nodargs);
                    }
                } elseif ($p == 'm') {
                    $curr = $this->tokens->getTokenState("tracker_tr_{$color}");
                    $prod += $curr;
                }
                if ($prod)
                    $this->effect_incCount($color, $p, $prod, $nodargs);
            }
        }
    }

    function effect_colonyProduction() {
        if (!$this->isColoniesVariant()) return;
        $tokens = $this->tokens->getTokensOfTypeInLocation("fleet_", "card_%");
        $this->dbSetTokensLocation($tokens, 'colo_fleet', 0, '');

        $tokens = $this->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        foreach ($tokens as $tokenId => $info) {
            $state = $info['state'];
            if ($state < 0) continue;
            if ($state >= 6) continue;
            $this->dbSetTokenState($tokenId, $state + 1, c_lienttranslate('Trade income level of ${card_name} changes to ${new_state}'), [
                'card_name' => $this->getTokenName($tokenId)
            ]);
        }
    }

    function effect_endOfTurn() {
        if ($this->getGameStateValue('gamestage') == MA_STAGE_ENDED) {
            return STATE_END_GAME;
        }
        $this->effect_production();
        // solar phase
        // step 1: end of game check
        if ($this->isEndOfGameAchived()) {
            $this->setGameStateValue('gamestage', MA_STAGE_LASTFOREST);

            $this->machine->queue("lastforest");
            $this->machine->queue("finalscoring");
            if ($this->isStudio()) $this->machine->queue("confirm");
            return null;
        }
        // step 2: world goverment: venus only
        // step 3: colony production
        $this->effect_colonyProduction();
        $current_player_id = $this->getCurrentStartingPlayer();
        $player_id = $this->getPlayerAfter($current_player_id);
        $this->setCurrentStartingPlayer($player_id);
        $this->machine->queue("research", 1, 1, $this->getPlayerColorById($player_id));
        return null;
    }

    function effect_finalScoring(): int {
        //$this->debugConsole("-- final scoring --");
        $gen = $this->tokens->getTokenState("tracker_gen");
        $this->setStat($gen, 'game_gen');
        if ($this->getTerraformingProgression() >= 100) {
            $this->notifyAllPlayers('message', clienttranslate('It is the end of the generation ${gen} and Mars is terraformed!'), ['gen' => $gen]);
        } else {
            $this->notifyAllPlayers('message', clienttranslate('It is the end of the generation ${gen} and Mars is sadly not terraformed'), ['gen' => $gen]);
        }

        $players = $this->loadPlayersBasicInfos();
        $this->scoreAll();
        foreach ($players as $player_id => $player) {
            $score = $this->dbGetScore($player_id);
            $this->setStat($score, 'game_vp_total', $player_id);
            $color = $player["player_color"];
            $corp = $this->tokens->getTokenOfTypeInLocation('card_corp', "tableau_$color");
            if ($corp) {
                $corp_id = (int) getPart($corp['key'], 2, true);
                if ($corp_id) $this->setStat($corp_id, 'game_corp', $player_id);
            }

            $theme = $this->dbUserPrefs->getPrefValue($player_id, 100);
            $this->setStat($theme, 'game_theme', $player_id);
            $mc = $this->getTrackerValue($player["player_color"], 'm');
            $this->notifyMessage(clienttranslate('${player_name} has ${count} M€ left (for tiebreaker purposes)'), ['count' => $mc], $player_id);
            $this->notifyMessage(clienttranslate('${player_name} scores ${count} TOTAL VP'), ['count' => $score], $player_id);
            $this->dbSetAuxScore($player_id, $mc);
        }

        $this->setGameStateValue('gamestage', MA_STAGE_ENDED);
        $this->notifyAllPlayers('scoringTable', '', ['data' =>   $this->scoreAllTable(), 'show' => true]);

        if ($this->isSolo()) {
            $color = $this->getPlayerColorById($player_id);
            $win = false;
            $maxgen = $this->getLastGeneration();
            if ($this->getGameStateValue('var_solo_flavour') == 1) {      // TR63
                $this->notifyMessage(
                    clienttranslate('The goal was to achieve terraforming rating of 63 or more by the end of generation ${maxgen}'),
                    ['maxgen' => $maxgen]
                );
                $tr = $this->getTrackerValue($color, 'tr');
                $this->notifyMessage(clienttranslate('${player_name} terraforming rating is ${count}'), ['count' => $tr]);
                if ($tr >= 63) {
                    $win = true;
                }
            } else {
                $this->notifyMessage(clienttranslate('The goal was to complete the terraforming by the end of generation ${maxgen}'), ['maxgen' => $maxgen]);
                if ($this->getTerraformingProgression() >= 100) {
                    $win = true;
                }
            }
            if ($win) {
                $this->notifyMessage(clienttranslate('${player_name} wins'));
            } else {
                $this->notifyMessage(clienttranslate('${player_name} loses since they did not achieve the goal, score is negated'));
                $this->dbSetScore($player_id, -1);
            }
        }
        return 1;
    }

    function scoreAllTable() {
        $table = [];
        $this->scoreAll($table);
        return $table;
    }

    function getProgressTable() {
        $table = [];
        $players = $this->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            //$color = $player["player_color"];
            $table[$player_id] =  $this->getTokensUpdate($player_id);
        }
        return $table;
    }

    function scoreAll(array &$table = null) {
        $players = $this->loadPlayersBasicInfos();
        if ($table !== null) {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $curr = $this->tokens->getTokenState("tracker_tr_{$color}", 0);
                $this->scoreTableVp($table, $player_id, 'tr', "tracker_tr_{$color}", $curr);

                if (!$this->isSolo()) {
                    $this->scoreTableVp($table, $player_id,  'awards');
                    $this->scoreTableVp($table, $player_id,  'milestones');
                }
            }
        } else {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->dbSetScore($player_id, 0); // reset to 0

                // just to notify reset
                $this->notifyWithName(
                    "score",
                    '',
                    ["player_score" => 0, "inc" => 0, "mod" => 0, "noa" => 1],
                    $player_id
                );

                $curr = $this->tokens->getTokenState("tracker_tr_{$color}");
                $this->dbIncScoreValueAndNotify($player_id, $curr, clienttranslate('${player_name} scores ${inc} point/s for Terraforming Rating'), "", [
                    'target' => "tracker_tr_{$color}"
                ]);
                $this->setStat($curr, "game_vp_tr", $player_id);
            }
        }

        if (!$this->isSolo()) {
            $markers = $this->tokens->getTokensOfTypeInLocation("marker", "award_%");
            if (count($markers) == 0) {
                if ($table == null) $this->notifyMessage(clienttranslate("No sponsored awards"));
            } else {
                // some awards has to be scored first
                foreach ($markers as $id => $rec) {
                    $loc = $rec['location']; // award_x
                    if ($this->getRulesFor($loc, 'rank', 10) == 1)  $this->scoreAward($loc, $table);
                }
                foreach ($markers as $id => $rec) {
                    $loc = $rec['location']; // award_x
                    if ($this->getRulesFor($loc, 'rank', 10) != 1) $this->scoreAward($loc, $table);
                }
            }
            $markers = $this->tokens->getTokensOfTypeInLocation("marker", "milestone_%");
            foreach ($markers as $id => $rec) {
                $loc = $rec['location']; // milestone_x
                $this->scoreMilestone($loc, $id, $table);
            }
        }
        // score map, this is split per type for animation effects
        foreach ($players as $player) {
            $this->scoreMap($player["player_color"], $table);
        }
        foreach ($players as $player) {
            $this->scoreCards($player["player_color"], $table);
        }
    }

    function scoreTableVp(?array &$table, int $player_id, string $category, ?string $token_key = null, int $inc = 0) {
        if ($table === null) return;
        if (!array_key_exists($player_id, $table)) {
            $table[$player_id] = [];
        }
        if (!array_key_exists('total', $table[$player_id])) {
            $table[$player_id]['total'] = 0;
        }
        if (!array_key_exists('total_details', $table[$player_id])) {
            $table[$player_id]['total_details'] = [];
        }
        if (!array_key_exists($category, $table[$player_id]['total_details'])) {
            $table[$player_id]['total_details'][$category] = 0;
        }


        $table[$player_id]['total_details'][$category] += $inc;
        $table[$player_id]['total'] += $inc;


        $this->scoreTableSet($table, $player_id, $category, $token_key, 'vp', $inc);
    }
    function scoreTableSet(?array &$table, int $player_id, string $category, ?string $token_key, string $key, $value) {
        if ($table === null) return;
        if ($token_key)
            $table[$player_id]['details'][$category][$token_key][$key] = $value;
    }

    function scoreMilestone(string $loc, string $id, array &$table = null) {
        $commit = ($table === null);      // only record the data, do not update the score or send notif

        $color = getPart($id, 1, true);
        $player_id = $this->getPlayerIdByColor($color);
        if (!$player_id) {
            $this->warn("no player id found when scoring milestones $color $id");
            return;
        }
        $score_category = 'milestones';
        $points = 5;
        if ($commit) $this->dbIncScoreValueAndNotify($player_id, $points, clienttranslate('${player_name} scores ${inc} point/s for milestone'), "game_vp_ms", [
            'target' => $loc
        ]);
        $this->scoreTableVp($table, $player_id, $score_category, $loc, $points);
    }

    function scoreAward(string $award, array &$table = null) {
        $commit = ($table === null);      // only record the data, do not update the score or send notif

        $expr = $this->getRulesFor($award, 'r');
        $scores = [];
        $score_category =  'awards';
        $players = $this->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $res = $this->evaluateExpression($expr, $color);
            $scores[$color] = $res;

            $this->scoreTableVp($table, $player_id, $score_category, $award, 0);
            $this->scoreTableSet($table, $player_id, $score_category, $award, 'counter', (int) $res); // count of things for award
        }
        arsort($scores);
        $place = 1;
        $lastres = 0;
        $i = 0;
        foreach ($scores as $color => $res) {
            if ($res == 0) break;
            $player_id = $this->getPlayerIdByColor($color);
            $this->scoreTableSet($table, $player_id, $score_category, $award, 'place', $place);
            if ($lastres > 0 && $lastres != $res) {
                $place += 1;
                $this->scoreTableSet($table, $player_id, $score_category, $award, 'place', $place);
                if ($place == 2) {
                    if ($this->getPlayersNumber() == 2) {
                        $note = clienttranslate('second place is not awarded for 2 player game');
                        if ($commit) $this->notifyMessage($note);
                        break;
                    }
                    if ($i >= 2) {
                        $note = clienttranslate('second place is not awarded because 1st place is shared');
                        if ($commit) $this->notifyMessage($note);
                        break;
                    }
                }
                if ($place > 2) break;
            }


            if ($place == 1) $points = 5;
            else if ($place == 2) $points = 2;
            else break;
            $this->scoreTableVp($table, $player_id, $score_category, $award, $points);


            if ($commit) {
                $this->dbIncScoreValueAndNotify($player_id, $points, clienttranslate('${player_name} scores ${inc} point/s for award ${award_name} with max value of ${award_counter}'), "game_vp_award", [
                    'target' => $award, // target of score animation
                    'award_name' => $this->getTokenName($award),
                    'award_counter' => $res
                ]);
            }
            $i++;
            $lastres = $res;
        }
    }

    function getCountOfCitiesOnMars($owner) {
        $map = $this->getPlanetMap();
        $cities = 0;

        foreach ($map as $hex => $info) {
            $inspace = $this->getRulesFor($hex, 'inspace');
            if ($inspace == 1) continue; // not ON MARS
            $hexowner = $info['owner'] ?? '';
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;

            $tile = $info['tile'] ?? null;
            if (!$tile) continue;

            $tt = $this->getRulesFor($tile, 'tt');
            if ($tt == MA_TILE_CITY) {
                $cities++;
            }
        }

        return $cities;
    }
    function getCountOfPolarTiles($owner) {
        $map = $this->getPlanetMap();
        $count = 0;

        foreach ($map as $hex => $info) {
            $y = $this->getRulesFor($hex, 'y');
            if ($y < 8) continue; // not polar
            $hexowner = $info['owner'] ?? '';
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;
            $count++;
        }

        return $count;
    }
    function getCountOfDesertTiles($owner) {
        $map = $this->getPlanetMap();
        $count = 0;

        foreach ($map as $hex => $info) {
            $y = $this->getRulesFor($hex, 'y');
            if ($y < 6) continue; // not south
            $hexowner = $info['owner'] ?? '';
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;
            $count++;
        }

        return $count;
    }
    function getCountOfEstateTiles($owner) {
        $map = $this->getPlanetMap();
        $count = 0;

        foreach ($map as $hex => $info) {
            $hexowner = $info['owner'] ?? '';
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;
            $oceans = $this->getAdjecentHexesOfType($hex, MA_TILE_OCEAN);
            $c = count($oceans);
            if ($c > 0) {
                $count++;
            }
        }

        return $count;
    }

    function getCountOfHighlanderTiles($owner) {
        $map = $this->getPlanetMap();
        $count = 0;

        foreach ($map as $hex => $info) {
            $hexowner = $info['owner'] ?? '';
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;
            $oceans = $this->getAdjecentHexesOfType($hex, MA_TILE_OCEAN);
            $c = count($oceans);
            if ($c == 0) {
                $count++;
            }
        }

        return $count;
    }
    function getCountOfLandscapeTiles(string $owner) {
        //Owning most connected tiles (player's largest group of tiles).
        $map = $this->getPlanetMap();
        $flood_map = [];
        foreach ($map as $hex => $info) {
            $flood_map[$hex] = 0;
        }
        $flood_area = 1;
        foreach ($map as $hex => $info) {
            $hexowner = array_get($info, 'owner', '');
            if ($hexowner !== $owner)
                continue;
            if ($flood_map[$hex] == 0) {
                $this->hexFlood($flood_area, $hex, $flood_map, $map, $owner);
                $flood_area++;
            }
        }
        $area = array_fill(0, $flood_area, 0);
        foreach ($map as $hex => $info) {
            $marker = $flood_map[$hex];
            if ($marker == 0) continue;
            $area[$marker]++;
        }
        $max = max($area);
        return $max;
    }

    function getCountOfUniqueTileTypes(string $owner) {
        $map = $this->getPlanetMap();
        $types = [];
        foreach ($map as $hex => $info) {
            $hexowner = array_get($info, 'owner', '');
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;
            $tile = $info['tile'] ?? null;
            if (!$tile) continue;

            $tt = $this->getRulesFor($tile, 'tt');
            if ($tt == MA_TILE_OCEAN) continue;
            if ($tt == MA_TILE_MINING) $tt = MA_TILE_SPECIAL;
            $types[$tt] = 1;
            if (count($types) >= 3) break;
        }
        return count($types);
    }


    function getCountOfGeologistTiles($owner) {
        //  Requires that you have 3 tiles on, or adjacent to, volcanic areas
        $map = $this->getPlanetMap();
        $count = 0;

        foreach ($map as $hex => $info) {
            $hexowner = $info['owner'] ?? '';
            if (!$hexowner) continue;
            if ($owner && $hexowner !== $owner)
                continue;
            $vol = $this->getRulesFor($hex, 'vol', 0);
            if ($vol) {
                $count++;
                continue;
            }
            $nei = $this->getAdjecentHexes($hex, $map);
            foreach ($nei as $subhex) {
                $vol = $this->getRulesFor($subhex, 'vol', 0);
                if ($vol) {
                    $count++;
                    continue 2;
                }
            }
        }

        return $count;
    }

    function getCountOfCardsWithPre($owner) {
        $cards = $this->tokens->getTokensOfTypeInLocation("card_main", "tableau_$owner");
        $count = 0;
        foreach ($cards as $card => $cardrec) {
            $t = $this->getRulesFor($card, 't');
            if ($t == MA_CARD_TYPE_EVENT) continue;
            $pre = $this->getRulesFor($card, 'pre');
            if ($pre) $count++;
        }
        return $count;
    }

    function getCountOfCardsGreen($owner) {
        return $this->getCountOfCardsType($owner, MA_CARD_TYPE_GREEN);
    }
    function getCountOfCardsBlue($owner) {
        return $this->getCountOfCardsType($owner, MA_CARD_TYPE_BLUE);
    }
    function getCountOfCardsRed($owner) {
        return $this->getCountOfCardsType($owner, MA_CARD_TYPE_EVENT);
    }

    function getCountOfCardTags($owner, $usetags) {
        return array_get($this->getTagsMap($owner), $usetags, 0);
    }

    function getTagsMap($owner) {
        $cards = $this->tokens->getTokensOfTypeInLocation("card_main", "tableau_$owner");
        $count = 0;
        $map = [];
        foreach ($cards as $card => $cardrec) {
            $tags = $this->getRulesFor($card, 'tags');
            $t = $this->getRulesFor($card, 't');
            if ($t == MA_CARD_TYPE_EVENT) continue;
            $tags = explode(" ", $tags);
            foreach ($tags as $tag) {
                $tag = trim($tag);
                $prev = array_get($map, $tag, 0);
                if ($prev == 0) $map[$tag] = 1;
                else $map[$tag] += 1;
            }
        }
        return $map;
    }

    function getCountOfCardsType($owner, $type) {
        $cards = $this->tokens->getTokensOfTypeInLocation("card_main", "tableau_$owner");
        $count = 0;
        foreach ($cards as $card => $cardrec) {
            $pre = $this->getRulesFor($card, 't');
            if ($pre == $type) $count++;
        }
        return $count;
    }


    function getCountOfResOnCards($owner, $type = '') {
        $res = $this->tokens->getTokensOfTypeInLocation("resource_$owner", "card_%", 1);
        if (!$type)
            return count($res);
        $count = 0;
        foreach ($res as $resinfo) {
            $card = $resinfo['location'];
            $holds = $this->getRulesFor($card, 'holds', '');
            if ($holds == $type) $count++;
        }
        return $count;
    }

    function getCountOfResOnCard($context) {
        return $this->tokens->countTokensInLocation("$context");
    }


    function getCountOfUniqueTags($owner) {
        $tags = $this->getTags();
        $trackers = [];
        foreach ($tags as $tag => $rules) {
            if (array_get($rules, 'nc', 0) == 1) continue; // not a real tag
            $trackers[] = "tracker_{$tag}_{$owner}";
        }
        $count = 0;
        $wild = 0;
        foreach ($trackers as $tracker) {
            $num = $this->tokens->getTokenState($tracker);
            if ($num > 0) {
                if (startsWith($tracker, 'tracker_tagWild')) {
                    $wild = $num;
                } else {
                    $count += 1;
                }
            }
        }
        return min($count + $wild, count($trackers) - 1);
    }

    function getMinOfStanardResources($owner) {
        $stanres = ['m', 's', 'u', 'p', 'e', 'h'];
        $map = [];
        foreach ($stanres as $p) {
            $trackerId = $this->getTrackerId($owner, $p);
            $value = (int) $this->tokens->getTokenState($trackerId);
            $map[$p] = $value;
        }

        return min($map);
    }

    function getCountOfUniqueTypesOfResources($owner) {
        $stanres = ['m', 's', 'u', 'p', 'e', 'h'];
        $count = 0;
        foreach ($stanres as $p) {
            $trackerId = $this->getTrackerId($owner, $p);
            $value = (int) $this->tokens->getTokenState($trackerId);
            if ($value > 0) $count++;
        }

        $res = $this->tokens->getTokensOfTypeInLocation("resource_$owner", "card_%", 1);
        $map = [];
        foreach ($res as $resinfo) {
            $card = $resinfo['location'];
            $holds = $this->getRulesFor($card, 'holds', '');
            $map[$holds] = 1;
        }
        return $count + count($map);
    }

    function getGeneralistCount($owner) {
        $production = ['pm', 'ps', 'pu', 'pp', 'pe', 'ph'];
        $count = 0;
        $corpera = $this->isBasicVariant() ? 1 : 0;
        foreach ($production as $p) {
            $trackerId = $this->getTrackerId($owner, $p);
            $value = (int) $this->tokens->getTokenState($trackerId);
            if ($value > $corpera) {
                $count++;
            }
        }
        return $count;
    }
    function getSpecialistCount($owner) {
        $production = ['pm', 'ps', 'pu', 'pp', 'pe', 'ph'];
        $count = 0;
        foreach ($production as $p) {
            $trackerId = $this->getTrackerId($owner, $p);
            $value = (int) $this->tokens->getTokenState($trackerId);
            if ($value > $count) {
                $count = $value;
            }
        }
        return $count;
    }
    function getEcologistCount($owner) {
        $tags = ['tagAnimal', 'tagPlant', 'tagMicrobe', 'tagWild'];
        $count = 0;
        foreach ($tags as $p) {
            $trackerId = $this->getTrackerId($owner, $p);
            $value = (int) $this->tokens->getTokenState($trackerId);
            $count += $value;
        }
        return $count;
    }
    function getTycoonCount($owner) {
        return $this->getCountOfCardsGreen($owner) + $this->getCountOfCardsBlue($owner);
    }

    function getCelebrity($owner) {
        $cards = $this->tokens->getTokensOfTypeInLocation("card_main", "tableau_$owner");
        $count = 0;
        foreach ($cards as $card => $cardrec) {
            $pre = $this->getRulesFor($card, 't');
            $cost = $this->getRulesFor($card, 'cost');
            if ($pre == MA_CARD_TYPE_BLUE || $pre == MA_CARD_TYPE_GREEN) {
                if ($cost >= 20) $count++;
            }
        }
        return $count;
    }

    function scoreMap(string $owner, array &$table = null) {
        $commit = ($table === null);      // only record the data, do not update the score or send notif

        $map = $this->getPlanetMap();
        $player_id = $this->getPlayerIdByColor($owner);
        $greenery = 0;
        $cities = 0;
        $score_category_city = 'cities';
        $score_category_greenery = 'greeneries';
        $this->scoreTableVp($table, $player_id,  $score_category_city);
        $this->scoreTableVp($table, $player_id,  $score_category_greenery);
        foreach ($map as $hex => $info) {
            $hexowner = $info['owner'] ?? '';
            if ($hexowner !== $owner)
                continue;
            $tile = $info['tile'];
            $this->systemAssertTrue("should be tile here", $tile);

            $tt = $this->getRulesFor($tile, 'tt');
            if ($tt == MA_TILE_CITY) {
                $cf = count($this->getAdjecentHexesOfType($hex, MA_TILE_FOREST));
                if ($commit) $this->dbIncScoreValueAndNotify($player_id, $cf, clienttranslate('${player_name} scores ${inc} point/s for city tile at ${place_name}'), "game_vp_cities", [
                    'target' => $hex,
                    'place_name' => $this->getTokenName($hex)
                ]);
                $cities += 1;
                $this->scoreTableVp($table, $player_id,  $score_category_city, $tile, $cf);
            } else  if ($tt == MA_TILE_FOREST) {
                if ($commit) $this->dbIncScoreValueAndNotify($player_id, 1, '', "game_vp_forest", ['target' => $hex]);
                $greenery += 1;
                $this->scoreTableVp($table, $player_id,  $score_category_greenery, $tile, 1);
            }
        }
        if ($commit)
            $this->notifyWithName('message', clienttranslate('${player_name} scores ${inc} points for Greenery tiles'), [
                'inc' => $greenery
            ],  $player_id);
    }

    function scoreCards(string $owner, array &$table = null) {
        $commit = ($table === null);      // only record the data, do not update the score or send notif

        // get all cards, calculate VP field
        $player_id = $this->getPlayerIdByColor($owner);
        $cards = $this->tokens->getTokensOfTypeInLocation("card", "tableau_$owner");
        $vpdirect = 0;
        $score_category = 'cards';
        $this->scoreTableVp($table, $player_id,  $score_category);
        foreach ($cards as $card => $cardrec) {
            $vp = $this->getRulesFor($card, 'vp');
            //$this->debugConsole(" $card -> $vp");
            if (!$vp)
                continue;
            if (is_numeric($vp)) {
                if ($commit)
                    $this->dbIncScoreValueAndNotify($player_id, $vp, '', "game_vp_cards", ['target' => $card]);
                $vpdirect += $vp;
                $this->scoreTableVp($table, $player_id,   $score_category, $card, $vp);
                continue;
            }
            try {
                $value = $this->evaluateExpression($vp, $owner, $card) ?? 0;
                $this->scoreTableVp($table, $player_id,   $score_category, $card, $value);
                if ($commit) {
                    $this->dbIncScoreValueAndNotify($player_id, $value, clienttranslate('${player_name} scores ${inc} point/s for card ${token_name}'), "game_vp_cards", [
                        'target' => $card,
                        'token_name' => $card
                    ]);
                }
            } catch (Exception $e) {
                $this->debugConsole("error during expression eval $card=>'$vp'");
                $this->error("error during expression eval $vp");
                $this->error($e);
            }
        }
        if ($commit)
            $this->notifyMessage(clienttranslate('${player_name} scores total ${inc} points for cards with fixed points'), [
                'inc' => $vpdirect
            ], $player_id);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state arguments
    ////////////
    /*
     * Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
     * These methods function is to return some additional information that is specific to the current
     * game state.
     */
    function arg_playerTurnChoice() {
        $result = [];

        if (!$this->isSolo()) {
            $players = $this->loadPlayersBasicInfos();
            $ops = ['passauto'];
            foreach ($players as $player_id => $player) {
                if ($player_id == $this->getActivePlayerId()) continue; //do not show for current active player
                $color = $player["player_color"];
                $operations = [];
                foreach ($ops as $optype) {
                    $oparr = $this->machine->createOperationSimple($optype, $color);
                    $oparr['flags'] = MACHINE_OP_RESOLVE_DEFAULT;
                    $operations[] = $oparr;
                }
                $result['ooturn']['player_operations'][$player_id] = $this->arg_operations($operations);
            }
        }

        return $result + $this->arg_operations();
    }

    function arg_multiplayerTurnChoice() {
        $result = [];
        return $result + $this->arg_operations();
    }

    function arg_gameDispatch() {
        return [
            //            '_no_notify' => true
        ];
    }

    function createArgInfo(string $color, array $keys, callable $filter) {
        $res = [];
        foreach ($keys as $tokenid) {
            $explanation = $filter($color, $tokenid);
            if (is_numeric($explanation))
                $res[$tokenid] = ["q" => $explanation];
            else
                $res[$tokenid] = $explanation;
        }
        return $res;
    }

    function filterPlayable($color, $keys) {
        return $this->createArgInfo($color, $keys, function ($color, $tokenid) {
            $info = [];
            $info['q'] = $this->playability($color, $tokenid, $info); // as side effect this set extra info there
            return $info;
        });
    }

    function arg_operations($operations = null) {
        $args = parent::arg_operations($operations);
        if (count($args['operations']) > 1 && $args['op'] == '+') {
            // mark some op for postpone
            $canfail = false;
            foreach ($args['operations'] as $opid => $opinfo) {
                if ($opinfo['args']['o'] < MA_ORDER_FAIL) {
                    $canfail = true;
                    break;
                }
            }
            foreach ($args['operations'] as $opid => &$opinfo) {
                if ($opinfo['args']['o']  >= MA_ORDER_NOUNDO && $canfail) {
                    $opinfo['args']['postpone'] = true;
                    $opinfo['args']['args']['bcolor'] = 'purple';
                }
            }
        }
        return $args;
    }

    function arg_operation($op) {
        $opinst = $this->getOperationInstance($op);
        return $opinst->arg();
    }

    function arg_operationMassage($id, $op) {
        $result = $op;
        $result["args"] = $this->arg_operation($op);

        $result["typeexpr"] = null;
        try {
            $result["typeexpr"] = OpExpression::arr($op["type"]);
        } catch (Throwable $e) {
            $this->error($e);
        }

        unset($result['rank']);
        unset($result['flags']);
        unset($result['parent']);
        if ($result['pool'] == 'main') unset($result['pool']);
        if ($result['mcount'] == $result['count']) unset($result['mcount']);
        if (!$result['data']) unset($result['data']);


        return $result;
    }



    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////
    function st_gameDispatch() {
        $this->machineDistpatch();
    }

    function st_gameDispatchMultiplayer() {
        $this->machineMultiplayerDistpatch();
    }

    function st_multiplayerChoice($player_id) {
        // do nothing here for now
    }

    public function canSkipChoice($op) {
        $opinst = $this->getOperationInstance($op);
        return $opinst->canSkipChoice();
    }

    public function isVoidSingle(string $type, string $color, ?int $count = 1, string $data = '') {
        if ($data === null) $data = '';
        $opinst = $this->getOperationInstanceFromType($type, $color, $count, $data);
        return $opinst->isVoid();
    }

    function action_whatever() {
        $ops = $this->machine->getTopOperations();
        foreach ($ops as $op) {
            $opinst = $this->getOperationInstance($op);
            $opinst->checkVoid();
        }
        $this->machine->reflag($ops, MACHINE_FLAG_UNIQUE, MACHINE_FLAG_ORDERED);
        $this->gamestate->nextState("next");
    }

    function action_passauto() {
        // current player can auto-pass out of turn
        if (!$this->isRealPlayer($this->getCurrentPlayerId())) return; // weird
        $color = $this->getCurrentPlayerColor();
        $opinst = $this->getOperationInstanceFromType('passauto', $color);
        $opinst->action_resolve();
        $this->queueremove($color, 'passauto');
        $this->notifyGameStateArgsChange($this->getCurrentPlayerId());
    }

    function saction_resolve($opinfo, $args): int {
        $opinst = $this->getOperationInstance($opinfo);
        return $opinst->action_resolve($args);
    }

    function executeImmediately($color, $type, $count = 1, $data = '') {
        if (!$type)
            return;
        // this does not go on stack - so no stack clean up
        $refcount = $count;
        $opinst = $this->getOperationInstanceFromType($type, $color, $refcount, $data);
        return $opinst->auto($color, $refcount);
    }

    function getStateForOperations($operations) {
        return STATE_PLAYER_TURN_CHOICE;
    }

    function executeAttemptAutoResolve($op) {
        $owner = $op["owner"];
        $opinst = $this->getOperationInstance($op);
        $count = $op["count"]; // XXX mcount?
        $tops = $this->machine->getTopOperations($owner);

        if ($opinst->isVoid())
            return false;

        if ($opinst->auto($owner, $count)) {
            $this->saction_stack($count, $op, $tops);
            return true;
        }
        return false;
    }

    function machineExecuteDefault() {
        if ($this->getGameStateValue('gamestage') == MA_STAGE_ENDED) {
            return STATE_END_GAME;
        }
        // check end of game
        $player_id = $this->getActivePlayerId(); // xxx turn owner?
        $this->effect_endOfActions($player_id);
        $player_id = $this->getNextReadyPlayer($player_id);
        if (!$player_id) {
            // end of turn
            return $this->effect_endOfTurn();
        }
        $this->queuePlayersTurn($player_id);
        $turn = $this->getStat("turns_number", $player_id);
        if ($turn > 10000) {
            // recursion?
            $this->error("detected very high turn number $turn");
            return STATE_PLAYER_CONFIRM;
        }
        return null;
    }

    function effect_endOfActions($player_id) {
        $this->notifyTokensUpdate($player_id);
        $this->notifyScoringUpdate();
    }

    function getTokensUpdate($player_id) {
        $ops = Operation_turn::getStandardActions($this->isSolo(), false, $this->isColoniesVariant());
        $operations = [];
        $curr = $this->getCurrentPlayerId();
        foreach ($ops as $optype) {
            if ($optype == 'card' && $player_id != $curr) continue;
            $oparr = $this->machine->createOperationSimple($optype, $this->getPlayerColorById($player_id));
            $oparr['flags'] = MACHINE_OP_RESOLVE_DEFAULT;
            $operations[] = $oparr;
        }
        return $this->arg_operations($operations);
    }

    function notifyTokensUpdate($player_id) {
        $this->notifyAllPlayers('tokensUpdate', '', $this->getTokensUpdate($player_id) + [
            'player_id' => $player_id
        ]);
    }

    function queuePlayersTurn($player_id, $give_time = true, $inc_turn = true) {
        $this->setNextActivePlayerCustom($player_id, $give_time, $inc_turn);
        $color = $this->getPlayerColorById($player_id);
        //$this->undoSavepoint();
        $this->machine->queue("turn", 1, 1, $color);
    }

    function getRollingVp($player_id = 0, string $category = '') {
        $table =  $this->scoreAllTable();

        foreach ($table as $p => $pinfo) {
            if ($player_id && $p != $player_id) {
                unset($table[$p]);
                continue;
            }
            foreach ($pinfo['details'] as $cat => $catinfo) {
                if ($category && $cat != $category) {
                    unset($table[$p]['details'][$cat]);
                    continue;
                }
            }
        }

        return $table;
    }


    function isXUndo() {
        return $this->getGameStateValue('var_xundo') == 1;
    }

    function argUndo() {
        $move = $this->getNextMoveId();
        $undo_move = $this->dbMultiUndo->getLatestSavedMoveId($move);
        $undo_moves_player = self::getGameStateValue('undo_moves_player');
        return [
            'undo_moves' => $this->dbMultiUndo->getAvailableUndoMoves(),
            'undo_move' => $undo_move,
            'next_move' => $move,
            'undo_player_id' => $undo_moves_player,
            'cancelledIds' => $this->dbMultiUndo->getCanceledNotifIds()
        ];
    }

    function undoSavepointWithLabel($label = '', $barrier = 1) {
        $this->undoSavepointMeta["label"] = $label;
        if ($barrier) $this->undoSavepointMeta['barrier'] = 1;
        $move_id = $this->getNextMoveId();
        $player_id = $this->getActivePlayerId();
        if ($this->isUndoSavepoint()) {
            // already set, move on
            $this->dbMultiUndo->notifyUndoMove(
                $this->undoSavepointMeta + ['move_id' => $move_id, 'player_id' => $player_id]
            );
        } else {


            if ($this->isMultiActive()) {
                $this->dbMultiUndo->notifyUndoMove(
                    ['move_id' => $move_id, 'player_id' => $player_id, 'label' => 'undo skipped']
                );
                return;
            }

            $this->dbMultiUndo->notifyUndoMove(
                $this->undoSavepointMeta + ['move_id' => $move_id, 'player_id' => $player_id]
            );
            $this->setUndoSavepoint(true);
        }
    }

    function undoSavepoint(): void {
        $this->systemAssertTrue("ERR:Game:02");
    }

    function doCustomUndoSavePoint() {
        //$this->statelog("*** doCustomUndoSavePoint X ***");
        if ($this->isMultiActive()) {
            if ($this->isXUndo()) {
                $this->dbMultiUndo->doSaveUndoSnapshot($this->undoSavepointMeta + ['barrier' => 1]);
            }
            return;
        }
        $this->dbMultiUndo->doSaveUndoSnapshot($this->undoSavepointMeta);
    }



    function undoRestorePoint(): void { //UNDOX
        // cannot use this function, we have custom undo system
        $this->systemAssertTrue("ERR:Game:01");
    }

    function customUndoRestorePoint(int $move_id) {
        // special case - we need to memorize value of auto-pass for other players, as it should not be restored by other player Undo
        $act_player_id = $this->getActivePlayerId();
        if ($act_player_id != $this->getCurrentPlayerId()) {
            $this->userAssertTrue(totranslate('Only active player can Undo'));
        }
        $players = $this->loadPlayersBasicInfos();
        $pass_state = [];
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $state = $this->tokens->getTokenState("tracker_passed_$color");
            $pass_state[$player_id] = $state;
        }

        $this->dbMultiUndo->undoRestorePoint($move_id);

        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            if ($act_player_id != $player_id) $this->tokens->setTokenState("tracker_passed_$color", $pass_state[$player_id]);
        }
    }

    function zombieTurn($state, $active_player): void {
        $owner = $this->getPlayerColorById($active_player);
        $tops = $this->machine->getOperations($owner);

        if ($tops && count($tops) > 0) {
            $this->notifyWithName('message', clienttranslate('${player_name} is zombie, action is skipped'), [], $active_player);
            $this->machine->hide($tops);
        }

        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
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
                $result = $this->getCollectionFromDB("SHOW COLUMNS FROM `zz_savepoint_gamelog` LIKE 'cancel'");
                $exists = (count($result) > 0) ? TRUE : FALSE;
                if (!$exists) {
                    $sql = "ALTER TABLE `zz_savepoint_gamelog` ADD `cancel` TINYINT(1) NOT NULL DEFAULT 0";
                    $this->DbQuery($sql);
                }
            } catch (Exception $e) {
            }
            try {
                $result = $this->getCollectionFromDB("SHOW COLUMNS FROM `gamelog` LIKE 'cancel'");
                $exists = (count($result) > 0) ? TRUE : FALSE;
                if (!$exists) {
                    $sql =  "ALTER TABLE `gamelog` ADD `cancel` TINYINT(1) NOT NULL DEFAULT 0";
                    $this->DbQuery($sql);
                }
            } catch (Exception $e) {
            }
        }
    }
}
