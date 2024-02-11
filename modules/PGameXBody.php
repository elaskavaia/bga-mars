<?php

use PhpParser\Node\Stmt\Continue_;

require_once "PGameMachine.php";
require_once "MathExpression.php";
require_once "DbUserPrefs.php";
require_once "operations/AbsOperation.php";
require_once "operations/ComplexOperation.php";
require_once "operations/DelegatedOperation.php";
require_once "operations/Operation_turn.php";

define("MA_STAGE_SETUP", 1);
define("MA_STAGE_GAME", 3);
define("MA_STAGE_LASTFOREST", 5);
define("MA_STAGE_ENDED", 9);

abstract class PGameXBody extends PGameMachine {
    protected $eventListners = null; // cache
    protected $map = null;
    protected $token_types_adjusted2 = false;
    public $dbUserPrefs;


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
        ]);
        $this->dbUserPrefs = new DbUserPrefs();
        $this->tokens->autoreshuffle = true;
        $this->tokens->autoreshuffle_custom['deck_main'] = 'discard_main';
    }

    /**
     * override to setup all custom tables
     */
    protected function initTables() {
        try {
            $players = $this->loadPlayersBasicInfos();
            $this->dbUserPrefs->setup($players, $this->player_preferences);
            $this->setGameStateValue('gamestage', MA_STAGE_SETUP);
            $this->token_types_adjusted2 = false; // clear cache
            if ($this->isSolo()) {
                $this->setGameStateValue("var_corporate_era", 1); // solo can only be corp era
            }

            $this->adjustedMaterial();
            $this->createTokens();
            $this->tokens->shuffle("deck_main");
            $this->tokens->shuffle("deck_corp");
            $production = ['pm', 'ps', 'pu', 'pp', 'pe', 'ph'];

            $initial_draw = 10;
            $tr_value = 20;
            if ($this->isSolo()) {
                $tr_value = 14;
            }
            $corps = 2; //(int)(11 / $this->getPlayersNumber())
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                if ($this->getGameStateValue('var_begginers_corp') == 1) {
                    $corp = $this->tokens->getTokenOfTypeInLocation("card_corp_1_", null, 0);
                    $this->effect_playCorporation($color, $corp['key'], false);
                    $this->tokens->pickTokensForLocation($initial_draw, "deck_main", "hand_${color}");
                }

                if (!$this->isCorporateEraVariant()) {
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

            if ($this->getGameStateValue('var_begginers_corp') != 1) {
                $this->effect_queueMultiDraw($initial_draw, $corps);
            }


            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->queue($color, "finsetup");
            }

            if ($this->isSolo()) {
                $this->setupSoloMap();
            }

            $player_id = $this->getFirstPlayer();
            $this->setCurrentStartingPlayer($player_id);
            $this->queuePlayersTurn($player_id, false);
        } catch (Exception $e) {
            $this->error($e);
        }
    }

    function setupSoloMap() {
        // place 2 random cities with forest
        $nonreserved = [];
        foreach ($this->token_types as $key => $info) {
            if (startsWith($key, "hex_")) {
                if (array_get($info, 'reserved')) continue;
                $nonreserved[] = $key;
            }
        }
        shuffle($nonreserved);
        $type = MA_TILE_CITY;
        $num = $this->getPlayersNumber() + 1;
        $botcolor = 'ffffff';
        for ($i = 1; $i <= 2; $i++) {
            $hex = array_shift($nonreserved);

            $tile = $this->tokens->getTokenOfTypeInLocation("tile_${type}_", null, 0);
            $this->systemAssertTrue("city tile not found", $tile);
            $this->dbSetTokenLocation($tile['key'], $hex, $num);
            $marker = $this->createPlayerMarker($botcolor);
            $this->tokens->moveToken($marker, $tile['key'], 0);
            $this->incTrackerValue($botcolor, 'city');
            $this->incTrackerValue($botcolor, 'cityonmars');
            $this->incTrackerValue($botcolor, 'land');

            $adj = $this->getAdjecentHexes($hex);
            shuffle($adj);

            $forestfound = null;
            while (true) {
                $forhex = array_shift($adj);
                if (!$forhex) break;
                if (array_search($forhex, $nonreserved) === false) {
                    continue;
                }
                $forestfound = $forhex;
                unset($nonreserved[$forhex]); // remove adjecent to city so 2nd city cannot be there
            }
            if ($forestfound) {
                $tile = $this->tokens->getTokenOfTypeInLocation("tile_1_", null, 0); //forest
                $this->dbSetTokenLocation($tile['key'], $forestfound, $num);
                $marker = $this->createPlayerMarker($botcolor);
                $this->tokens->moveToken($marker, $tile['key'], 0);
                $this->incTrackerValue($botcolor, 'forest');
                $this->incTrackerValue($botcolor, 'land');
            }
        }
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
            return 100 / 15 * $gen;
        }
        return $this->getTerraformingProgression();
    }

    function getTerraformingProgression() {
        $oxigen = $this->tokens->getTokenState("tracker_o");
        $oceans = $this->tokens->getTokenState("tracker_w");
        $temp = $this->tokens->getTokenState("tracker_t");
        return (100 * ($oxigen / 14 + $oceans / 9 + ($temp + 30) / 38)) / 3;
    }

    function isCorporateEraVariant() {
        return $this->getGameStateValue('var_corporate_era') == 1 || $this->isSolo();
    }

    function isDraftVariant() {
        return $this->getGameStateValue('var_draft') == 1 && !$this->isSolo();
    }

    protected function getAllDatas() {
        $result = parent::getAllDatas();
        $result['CON'] = $this->getPhpConstants("MA_");
        $current = $this->getCurrentPlayerId();
        if ($this->isRealPlayer($current)) {
            $result['server_prefs'] = $this->dbUserPrefs->getAllPrefs($current);
            $result['card_info'] = $this->getCardInfoInHand($current);
        } else
            $result['server_prefs'] = [];

        return $result;
    }
    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////
    /*
     * In this space, you can put any utility methods useful for your game logic
     */
    function debug_createCounterToken($token) {
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
        $player_id = $this->getCurrentPlayerId();
        //$this->machine->interrupt();
        //$this->machine->push("draw/nop", 1, 1, $this->getCurrentPlayerColor());
        $cards = $this->tokens->pickTokensForLocation(170, 'deck_main', 'temp');
        $cards = $this->tokens->pickTokensForLocation(13, 'discard_main', 'temp');
        //$this->dbSetTokensLocation($cards, 'temp');
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
        //$card = "card_stanproj_1";
        //return $this->debug_oparg("counter(all_city),m", $card);
        //$this->gamestate->nextState("next");

        // $player_id = $this->getFirstPlayer();
        // $this->setCurrentStartingPlayer($player_id);
        // $this->machine->queue("turn", 1, 1, $this->getPlayerColorById($player_id));


        // $this->dbIncScoreValueAndNotify($player_id, 5, clienttranslate('${player_name} scores ${inc} point/s'), null, [
        //     'target' => 'tile_3_1', // target of score animation
        // ]);
    }

    function debug_drawCard($num, $loc = null) {
        if (is_numeric($num)) {
            $token = "card_main_$num";
            if (!array_get($this->token_types, $token)) {
                return "card not found $token";
            }
        } else if (is_string($num)) {
            $token = $num;
            if (!array_get($this->token_types, $token)) {
                $token = $this->mtFind('name', $num);
                if (!$token)
                    return "card not found $num";
            }
        }
        $color = $this->getCurrentPlayerColor();
        if (!$loc) $loc = "hand_$color";
        if ($loc == 'draw') $loc = "draw_$color";
        $this->dbSetTokenLocation($token, $loc);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }

    function debug_op($type) {
        $color = $this->getCurrentPlayerColor();
        $this->push($color, $type);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }

    function debug_money($x = 40) {
        $color = $this->getCurrentPlayerColor();
        $this->effect_incCount($color, 'm', $x);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }

    function debug_inc($res = 'm', $count = 1) {
        $color = $this->getCurrentPlayerColor();
        $this->effect_incCount($color, $res, $count);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
    function debug_incparam($res = 'o', $count = 1) {
        $color = $this->getCurrentPlayerColor();
        $this->effect_increaseParam($color, $res, $count, $res == 't' ? 2 : 1);
    }

    function debug_res($card) {
        $color = $this->getCurrentPlayerColor();
        $this->putInEffectPool($color, "res", $card);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }


    function debug_opcard($card_id) {
        $color = $this->getCurrentPlayerColor();
        $payment = $this->getPayment($color, $card_id);
        return [
            "r" => $this->debug_oparg($this->getRulesFor($card_id), $card_id),
            "canAfford" => $this->canAfford($color, $card_id),
            "payment" => $payment,
            "paymentop" => $this->debug_oparg($payment, $card_id),
        ];
    }

    function debug_oparg($type, $data = '') {
        if (!$type) return [];
        $color = $this->getCurrentPlayerColor();
        $inst = $this->getOperationInstanceFromType($type, $color, 1, $data);
        return [
            "type" => $type,
            "args" => $inst->arg(),
            "canresolve" => $inst->canResolveAutomatically(),
            "auto" => $inst->isFullyAutomated()
        ];
    }

    // HEX MATH
    function getAdjecentHexes($coords, $valid_coords = null) {
        if (!$coords) {
            $this->error("empty coords in getAdjecentHexes");
            return [];
        }
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
            [$x + $dx, $y - 1], [$x + $dx + 1, $y - 1], [$x - 1, $y], [$x + 1, $y], [$x + $dx, $y + 1],
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

    function evaluateAdj($color, $ohex, $rule) {
        if (!$rule)
            return 0;
        switch ($rule) {
            case 'adj_city':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY));
            case 'adj_city_2':
                return count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY)) >= 2;
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
            default:
                throw new BgaSystemException("Unknown adj rule $rule");
        }
    }

    function getProductionPlacementBonus($ohex) {
        $bonus = $this->getRulesFor($ohex, 'r', '');
        if (strpos($bonus, 's') !== false) {
            return 'ps';
        }
        if (strpos($bonus, 'u') !== false) {
            return 'pu';
        }
        return '';
    }

    function createPlayerMarker($color) {
        $token = "marker_${color}";
        $key = $this->tokens->createTokenAutoInc($token, "miniboard_${color}");
        return $key;
    }

    function createPlayerResource($color) {
        $token = "resource_${color}";
        $key = $this->tokens->createTokenAutoInc($token, "miniboard_${color}");
        return $key;
    }

    function getCardInfoInHand($player_id = null) {
        if (!$player_id)
            $player_id  = $this->getCurrentPlayerId();
        $color = $this->getPlayerColorById($player_id);
        $keys = array_keys($this->tokens->getTokensInLocation("hand_${color}"));
        return $this->filterPlayable($color, $keys);
    }

    function isSolo() {
        return $this->getPlayersNumber() == 1;
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
        foreach ($this->token_types as $id => $info) {
            if (!$corp_era) {
                if (startsWith($id, "card_")) {
                    $deck = array_get($info, 'deck');
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
            $this->createTokenFromInfo($id, $info);
        }
    }

    function adjustedMaterial() {
        if ($this->token_types_adjusted2) {
            return $this->token_types;
        }
        parent::adjustedMaterial();

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
        }
        $this->token_types_adjusted2 = true;
        return $this->token_types;
    }

    /**
     * Checks if can afford payment, if 4th arg is passed sets field $info['payop'] to payment operation  
     */
    function canAfford($color, $tokenid, $cost = null, &$info = null) {
        if ($info == null) $info = [];
        if ($cost !== null) {
            $payment_op = "${cost}nm";
        } else
            $payment_op = $this->getPayment($color, $tokenid);

        $info['payop'] = $payment_op;
        if ($this->isVoidSingle($payment_op, $color, 1, $tokenid)) {
            return false;
        }

        return true;
    }

    function evaluatePrecondition($cond, $owner, $tokenid) {
        if ($cond) {
            $valid = $this->evaluateExpression($cond, $owner, $tokenid);
            if (!$valid) {
                $delta = $this->tokens->getTokenState("tracker_pdelta_${owner}") ?? 0;
                // there is one more stupid event card that has temp delta effect
                $listeners = $this->collectListeners($owner, ['onPre_delta']);
                foreach ($listeners as $lisinfo) {
                    $outcome = $lisinfo['outcome'];
                    $delta += $outcome;
                }
                if ($delta) {
                    $valid = $this->evaluateExpression($cond, $owner, $tokenid, $delta)
                        || $this->evaluateExpression($cond, $owner, $tokenid, -$delta);
                }
                if (!$valid) return false; // fail prereq check
            }
        }
        return true;
    }

    function precondition($owner, $tokenid) {
        // check precondition
        $cond = $this->getRulesFor($tokenid, "pre");
        if ($cond) {
            $valid = $this->evaluatePrecondition($cond, $owner, $tokenid);
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

    function playability($owner, $tokenid, &$info = null) {
        if ($info == null) $info = [];

        if (!$owner) {
            $owner == $this->getActivePlayerColor();
        }


        // check precondition
        $info['pre'] = $this->precondition($owner, $tokenid);

        // check immediate effect affordability
        $info['m'] = $this->postcondition($owner, $tokenid);

        // check cost
        $info['c'] = $this->canAfford($owner, $tokenid, null, $info) ? MA_OK : MA_ERR_COST;


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

    function evaluateExpression($cond, $owner = 0, $context = null, $mods = null): int {
        try {
            if (!$owner)
                $owner = $this->getActivePlayerColor();
            $expr = MathExpression::parse($cond);
            $mapper = function ($x) use ($owner, $context, $mods) {
                return $this->evaluateTerm($x, $owner, $context, $mods);
            };
            return $expr->evaluate($mapper);
        } catch (Exception $e) {
            $this->error($e);
            throw new BgaSystemException("Cannot parse math expression '$cond'");
        }
    }

    function evaluateTerm($x, $owner, $context = null, $mods = null) {
        if ($x == 'chand') {
            return $this->tokens->countTokensInLocation("hand_$owner");
        }

        if ($x == 'cityonmars') {
            return $this->getCountOfCitiesOnMars("$owner");
        }
        if ($x == 'all_cityonmars') {
            return $this->getCountOfCitiesOnMars(null);
        }

        if ($x == 'resCard') {
            return $this->tokens->countTokensInLocation("$context"); // number of resources on the card
        }
        if ($x == 'cost') {
            return $this->getRulesFor($context, 'cost');
        }

        $type = $this->getRulesFor("tracker_$x", 'type', '');
        if ($type == 'param') {
            $value = $this->tokens->getTokenState("tracker_${x}");
            if (!$mods) return $value;
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
            $value = $this->tokens->getTokenState("tracker_${x}_${owner}");
        } else {
            $value = $this->tokens->getTokenState("tracker_${x}");
        }
        return $value;
    }

    function getOperationInstance(array $opinfo): AbsOperation {
        $type = stripslashes($opinfo['type']);
        $classname = 'xxx';
        try {
            $expr = $this->parseOpExpression($type);
            $issimple = $expr->isSimple();
            if ($issimple && !$expr->isAtomic()) {
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

    function getOperationInstanceFromType(string $type, string $color, ?int $count = 1, string $data = '') {
        $opinfo = [
            'type' => $type, 'owner' => $color, 'mcount' => $count, 'count' => $count, 'data' => $data,
            'flags' => 0
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
            $token_id = "tracker_${type}";
        } else {
            if (!$color) {
                $color = $this->getActivePlayerColor();
            }
            $token_id = "tracker_${type}_${color}";
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
        $op = $this->findop($color, $type, $pool);
        if ($op) $this->machine->hide($op);
        return $op;
    }
    function findop($color, $type, $pool = null) {
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
                $e = $this->getRulesFor($key, 'e');
                if (!$e)
                    continue;
                if ($info['state'] == MA_CARD_STATE_FACEDOWN)
                    continue;
                $info['e'] = $e;
                $info['owner'] = substr($info['location'], strlen('tableau_'));
                $info['key'] = $key;
                $this->eventListners[$key] = $info;
            }
        }
        return $this->eventListners;
    }
    function effect_moveCard($owner, $card_id, $place_id, $state = null, $notif = "", $args = []) {
        $this->dbSetTokenLocation($card_id,  $place_id, $state, $notif, $args, $this->getPlayerIdByColor($owner));
    }
    function effect_moveResource($owner, $res_id, $place_id, $state = null, $notif = "", $card_id) {
        $holds = $this->getRulesFor($card_id, 'holds', '');

        $this->dbSetTokenLocation($res_id,  $place_id, $state, $notif, [
            'card_name' => $this->getTokenName($card_id),
            'restype_name' => $this->getTokenName("tag$holds")
        ], $this->getPlayerIdByColor($owner));
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


    function notifyEffect($owner, $events, $card_context) {
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

    function collectDiscounts($owner, $card_id) {
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

            $listeners = $this->collectListeners($owner, $events);
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

    function collectListeners($owner, $events, $card_context = null) {
        // load all active effect listeners
        $cards = $this->getActiveEventListeners();
        if (!is_array($events)) {
            $events = [$events];
        }
        $res = [];
        foreach ($cards as $info) {
            $e = $info['e'];
            $card = $info['key'];
            $lisowner = $info['owner'];
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

    function getPayment($color, $card_id): string {
        $costm = $this->getRulesFor($card_id, "cost", 0);

        $discount = $this->collectDiscounts($color, $card_id);
        $costm = max(0, $costm - $discount);
        if ($costm == 0)
            return "nop"; // no-op

        return "${costm}nm";
    }

    function getPaymentTypes(string $color, string $card_id) {
        $tags = $this->getRulesFor($card_id, "tags", '');
        $types = [];
        if (strstr($tags, "Building"))
            $types[] = 's';
        if (strstr($tags, "Space"))
            $types[] = 'u';

        $types[] = 'm';
        // heat is last choice
        if ($this->playerHasCard($color, 'card_corp_4')) {
            // Helion
            $types[] = 'h';
        }
        return $types;
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
            $maxgen = $this->getRulesFor('solo', 'gen');
            if ($gen >= $maxgen) {
                return true;
            } else {
                return false; // game ends after gen 14 even terraforming is complete before
            }
        }
        return $this->getTerraformingProgression() >= 100;
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
            return;
        }

        $active_player = $this->getActivePlayerId();

        // in this game we never switch active player during the single active state turns
        // except for lastforest
        if ($this->getGameStateValue('gamestage') == MA_STAGE_LASTFOREST || $this->isZombiePlayer($active_player)) {
            if ($active_player != $player_id) {
                $this->setNextActivePlayerCustom($player_id);
                $this->undoSavepoint();
            }
        }
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////


    function action_undo() {
        // unchecked action

        $state = $this->gamestate->state();
        if ($state['type'] == 'multipleactiveplayer') {
            // special undo 
            $player_id = $this->getCurrentPlayerId();
            //for now there is only one case so not need to check oprations
            //$operations = $this->getTopOperations();
            $color = $this->getPlayerColorById($player_id);
            if (!$color) return; // not a player
            $this->effect_undoBuyCards($color);
            return;
        }
        $this->undoRestorePoint();
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
            if (isset($rules['e'])) {
                // single use effect
                $state = MA_CARD_STATE_ACTION_SINGLEUSE;
            }
        }
        if (isset($rules['a'])) {
            $state = MA_CARD_STATE_ACTION_UNUSED; // activatable cars
        }
        $this->dbSetTokenLocation($card_id, "tableau_${color}", $state, clienttranslate('${player_name} plays card ${token_name}'), [], $this->getPlayerIdByColor($color));
        $this->eventListners = null; // clear cache since card came into play
        $tags = $rules['tags'] ?? "";
        $tagsarr = explode(' ', $tags);
        if ($ttype != MA_CARD_TYPE_EVENT && $tags) {
            foreach ($tagsarr as $tag) {
                $this->incTrackerValue($color, "tag$tag");
            }
        }
        if ($ttype == MA_CARD_TYPE_EVENT) {
            $this->incTrackerValue($color, "tagEvent");
        }
        $playeffect = array_get($rules, 'r', '');
        if ($playeffect) {
            //$this->debugLog("-come in play effect $playeffect");
            $this->putInEffectPool($color, $playeffect, $card_id);
        }
        $events = $this->getPlayCardEvents($card_id, 'play_');
        $this->notifyEffect($color, $events, $card_id);
    }

    function effect_playCorporation(string $color, string $card_id, bool $setup) {
        $player_id = $this->getPlayerIdByColor($color);
        if ($setup) {
            $cost = -$this->getRulesFor($card_id, 'cost');
            $this->dbSetTokenLocation($card_id, "tableau_$color", MA_CARD_STATE_ACTION_UNUSED, clienttranslate('private: ${player_name} chooses corporation ${token_name} and received ${cost} ME. The rest of the perks you will receive after setup is finished'), [
                "_private" => true,
                "cost" => $cost
            ], $player_id);

            $this->effect_incCount($color, 'm', $cost, ['message' => '']);
            return;
        }
        $this->dbSetTokenLocation($card_id, "tableau_$color", MA_CARD_STATE_ACTION_UNUSED, clienttranslate('${player_name} chooses corporation ${token_name}'), [], $player_id);
        $this->effect_untap($card_id);
        $this->eventListners = null; // clear cache since corp came into play
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
        $this->notifyEffect($color, $events, $card_id);

        // special case for Tharsis Republic it gains income for 2 placed cities in solo game
        if ($this->isSolo()) {
            if ($card_id == 'card_corp_11') {
                $this->effect_incProduction($color, 'pm', 2);
            }
        }
    }

    function effect_placeTile($color, $object, $target) {
        $this->systemAssertTrue("Invalid tile", $object);
        $this->systemAssertTrue("Invalid target", $target);
        $this->systemAssertTrue("Invalid tile, does not exists $object", $this->tokens->getTokenInfo($object));
        $player_id = $this->getPlayerIdByColor($color);
        $otype = $this->getRulesFor($object, 'tt');
        $no = $this->getPlayerNoById($player_id);
        if ($otype == MA_TILE_OCEAN)
            $no = -1;
        $marker_info = $this->tokens->getTokenOnLocation($target);
        $this->dbSetTokenLocation(
            $object,
            $target,
            $no,
            clienttranslate('${player_name} places tile ${token_name} into ${place_name}'), // XXX
            [],
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
        $this->notifyEffect($color, 'place_tile', $tile);

        // hex bonus
        $bonus = $this->getRulesFor($target, 'r');
        if ($bonus) {
            //$this->debugLog("-placement bonus $bonus");
            $this->putInEffectPool($color, $bonus, $object);

            if (strpos($bonus, 's') !== false) {
                $this->notifyEffect($color, 'place_bonus_s', $tile);
            }
            if (strpos($bonus, 'u') !== false) {
                $this->notifyEffect($color, 'place_bonus_u', $tile);
            }
        }
        // ocean bonus
        $oceans = $this->getAdjecentHexesOfType($target, MA_TILE_OCEAN);
        $c = count($oceans);
        if ($c) {
            $c = $c * 2;
            $bonus = "${c}m"; // 2 MC per ocean
            //$this->putInEffectPool($color, $bonus, $object);
            $this->executeImmediately($color, $bonus); // not much reason to put in the pool
        }

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
            $this->effect_draw($color, "deck_main", "${location}_$color", $numcards);
        }
        return $numcards;
    }

    function effect_queueMultiDraw($numcards = 4, $corps = 0) {
        $players = $this->loadPlayersBasicInfos();
        $setup = $corps > 0;
        if ($this->isDraftVariant() && !$setup) {
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
        if ($setup) {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->tokens->pickTokensForLocation($corps, "deck_corp", "draw_${color}");
            }
        }
        // multiplayer buy
        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            if ($corps) $this->multiplayerqueue($color, "keepcorp");
            if ($numcards) $this->multiplayerqueue($color, "${numcards}?buycard");
        }
        if (!$setup) { // only do this when not setup, setup has special command
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->queue($color, "prediscard");
            }
        }
    }

    function effect_undoBuyCards($owner) {
        $color = $owner;
        $player_id = $this->getPlayerIdByColor($color);
        $this->systemAssertTrue("unexpected non multistate", $this->isInMultiplayerMasterState());

        $this->notifyMessage(clienttranslate('${player_name} takes back their move'), [], $player_id);


        // TODO incomplete DRAFT
        $selected = $this->tokens->getTokensInLocation("hand_$color", MA_CARD_STATE_SELECTED);
        $count = count($selected);
        $rest = $this->tokens->getTokensInLocation("draw_$color");
        $left_corp = 0;
        foreach ($rest as $card_id => $card) {
            if (startsWith($card_id, 'card_corp')) {
                $left_corp += 1;
            }
        }
        $has_corp = $left_corp == 1 ? 1 : 0;

        if ($count == 0 && $has_corp == 0) throw new BgaUserException(self::_("Nothing to undo"));
        $ops = $this->getTopOperations($color);
        $this->userAssertTrue("Cannot undo", count($ops) == 1);
        $op = array_shift($ops);
        $optype = $op['type'];
        // can be nothing in initial setup
        if ($optype == 'prediscard') {
            // nothing is left
        } else if ($optype == 'buycard') {
            // partial undo
            $this->machine->hide($op);
        } else if ($optype == 'finsetup') {
            // setup 
        } else {
            $this->userAssertTrue("Cannot undo $optype");
        }
        $total = $count + count($rest) - $has_corp;
        $this->multiplayerpush($color, $total . '?buycard');

        foreach ($selected as $card_id => $card) {
            if (!startsWith($card_id, 'card_main')) {
                continue;
            }
            $this->dbSetTokenLocation($card_id, "draw_$color", 0, '');
            $this->effect_incCount($color, 'm', 3, ['message' => '']);
        }

        if ($has_corp) {
            // can undo corp selection also
            $corp = $this->tokens->getTokenOfTypeInLocation('card_corp', "tableau_$color");
            if ($corp) {
                $corp_id = $corp['key'];
                $this->dbSetTokenLocation($corp_id, "draw_$color", 0, '');
                // undo crop effects
                $this->effect_incCount($color, 'm', $this->getRulesFor($corp_id, 'cost'), ['message' => '']);
                $this->multiplayerpush($color, 'keepcorp');
            }
        }

        $this->machine->normalize();
        //$this->debugLog("- done resolve", ["t" => $this->machine->gettableexpr()]);
        $this->machineMultiplayerDistpatchPrivate($player_id);
    }

    function getPlayCardEvents($card_id, $prefix = ''): array {
        $rules = $this->getRulesFor($card_id, '*');
        $tags = $rules['tags'] ?? "";
        $tagsarr = explode(' ', $tags);
        $events = [];
        $tagMap = [];
        if ($tags)
            foreach ($tagsarr as $tag) {
                $events[] = "${prefix}tag$tag";
                $tagMap[$tag] = 1;
            }
        if (array_get($tagMap, 'Space') && array_get($tagMap, 'Event'))
            $events[] = "${prefix}cardSpaceEvent";
        $uniqueTags = array_keys($tagMap);
        sort($uniqueTags);
        foreach ($uniqueTags as $tag) {
            $events[] = "${prefix}card$tag";
        }
        $events[] = "${prefix}card";
        return $events;
    }

    function effect_incCount(string $color, string $type, int $inc = 1, array $options = []) {
        $message = array_get($options, 'message', '*');
        unset($options['message']);
        $token_id = $this->getTrackerId($color, $type);
        $this->debug_createCounterToken($token_id);
        $this->dbResourceInc($token_id, $inc, $message, [], $this->getPlayerIdByColor($color), $options);
    }

    /**
     * sanitize the color if passed via REST calls
     */
    function checkColor(&$owner) {
        if (is_numeric($owner)) $owner = (string) $owner;
        $this->systemAssertTrue("invalid owner", is_string($owner));
        if ($this->getPlayerIdByColor($owner) == 0) {
            if ($owner == 'ffffff') return true;
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
        $this->notifyCounterDirect($token_id, $value, $message, ["mod" => $mod, "token_name" => $token_id,], $this->getPlayerIdByColor($color));
    }

    function effect_increaseParam($color, $type, $steps, $perstep = 1) {
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
            "inc" => $inc, "steps" => $steps,
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
            $bounus_name = "param_${type}_${nvalue}";
            $bonus = $this->getRulesFor($bounus_name, 'r');
            if ($bonus) {
                //$this->debugLog("-param bonus $bonus");
                $this->putInEffectPool($color, $bonus);
            }
        }

        $this->effect_incTerraformingRank($color, $steps);
        if ($this->getTerraformingProgression() >= 100) {
            $this->notifyWithName('message_warning', clienttranslate("The terraforming is complete!!!"));
        }
        return true;
    }

    function effect_incTerraformingRank(string $owner, int $inc) {
        $op = 'tr';
        $this->effect_incCount($owner, $op, $inc);
        $this->dbIncScoreValueAndNotify($this->getPlayerIdByColor($owner), $inc, '', "game_vp_tr", [
            'target' => $this->getTrackerId($owner, $op)
        ]);
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
        $this->dbSetTokensLocation($tokens, $to, null, clienttranslate('private: ${player_name} draws ${token_names}'), [
            "_private" => true, "place_from" => $deck,
        ], $player_id);
        $this->notifyMessage(clienttranslate('${player_name} draws ${token_count} cards'), [
            "token_count" => count($tokens),
        ], $player_id);
        if ($was_reshuffled) {
            $this->notifyMessage(clienttranslate('${player_name} reshuffles project card deck'), [], $player_id);
            $this->notifyCounterChanged($this->tokens->autoreshuffle_custom[$deck], ["nod" => true]);
        }
        $this->undoSavepoint();
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
        }
    }

    function effect_production() {
        $params = ['m', 's', 'u', 'p', 'e', 'h'];
        $players = $this->loadPlayersBasicInfos();
        foreach ($params as $p) {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $prod = $this->tokens->getTokenState("tracker_p${p}_${color}");
                if ($p == 'e') {
                    // energy to heat
                    $curr = $this->tokens->getTokenState("tracker_${p}_${color}");
                    if ($curr > 0) {
                        $this->effect_incCount($color, 'h', $curr, [
                            'message' => clienttranslate('${player_name} gains ${token_div_count} due to heat transfer')
                        ]);
                        $this->effect_incCount($color, 'e', -$curr);
                    }
                } elseif ($p == 'm') {
                    $curr = $this->tokens->getTokenState("tracker_tr_${color}");
                    $prod += $curr;
                }
                if ($prod)
                    $this->effect_incCount($color, $p, $prod);
            }
        }
    }

    function effect_endOfTurn() {
        if ($this->getGameStateValue('gamestage') == MA_STAGE_ENDED) {
            return STATE_END_GAME;
        }
        $this->effect_production();
        if ($this->isEndOfGameAchived()) {
            $this->setGameStateValue('gamestage', MA_STAGE_LASTFOREST);

            $this->machine->queue("lastforest");
            $this->machine->queue("finalscoring");
            if ($this->isStudio()) $this->machine->queue("confirm");
            return null;
        }
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
            $corp_id = (int) getPart($corp['key'], 2);
            $this->setStat($corp_id, 'game_corp', $player_id);

            $theme = $this->dbUserPrefs->getPrefValue($player_id, 100);
            $this->setStat($theme, 'game_theme', $player_id);
            $mc = $this->getTrackerValue($player["player_color"], 'm');
            $this->notifyMessage(clienttranslate('${player_name} has ${count} M€ left (for tiebreaker purposes)'), ['count' => $mc], $player_id);
            $this->notifyMessage(clienttranslate('${player_name} scores ${count} TOTAL VP'), ['count' => $score], $player_id);
            $this->dbSetAuxScore($player_id, $mc);
        }

        $this->setGameStateValue('gamestage', MA_STAGE_ENDED);

        if ($this->isSolo()) {
            $color = $this->getPlayerColorById($player_id);
            $win = false;
            $maxgen = $this->getRulesFor('solo', 'gen');
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
                $this->notifyMessage(clienttranslate('The goal was to completing the terraforming by the end of generation ${maxgen}'), ['maxgen' => $maxgen]);
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

    function scoreAll(array &$table = null) {
        $players = $this->loadPlayersBasicInfos();
        if ($table !== null) {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $curr = $this->tokens->getTokenState("tracker_tr_${color}");
                $this->scoreTableVp($table, $player_id, 'tr', "tracker_tr_${color}", $curr);

                $this->scoreTableVp($table, $player_id,  'awards');
                $this->scoreTableVp($table, $player_id,  'milestones');
            }
        } else {
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->dbSetScore($player_id, 0); // reset to 0
                $this->dbIncScoreValueAndNotify($player_id, 0, ''); // just to notify reset
                $curr = $this->tokens->getTokenState("tracker_tr_${color}");
                $this->dbIncScoreValueAndNotify($player_id, $curr, clienttranslate('${player_name} scores ${inc} point/s for Terraforming Rating'), "", [
                    'target' => "tracker_tr_${color}"
                ]);
            }
        }

        $markers = $this->tokens->getTokensOfTypeInLocation("marker", "award_%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // award_x
            $this->scoreAward($loc, $table);
        }
        $markers = $this->tokens->getTokensOfTypeInLocation("marker", "milestone_%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // milestone_x
            $this->scoreMilestone($loc, $id, $table);
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

        $color = getPart($id, 1);
        $player_id = $this->getPlayerIdByColor($color);
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
                    'target' => $hex, 'place_name' => $this->getTokenName($hex)
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
                $value = $this->evaluateExpression($vp, $owner, $card);
                $this->scoreTableVp($table, $player_id,   $score_category, $card, $value);
                if ($value && $commit) {
                    $this->dbIncScoreValueAndNotify($player_id, $value, clienttranslate('${player_name} scores ${inc} point/s for card ${token_name}'), "game_vp_cards", [
                        'target' => $card, 'token_name' => $card
                    ]);
                    continue;
                }
            } catch (Exception $e) {
                $this->debugConsole("error during expression eval $card=>'$vp'");
                $this->error("error during expression eval $vp");
                $this->error($e);
            }
        }
        if ($commit)
            $this->notifyMessage(clienttranslate('${player_name} scores total ${inc} points for cards with implicit points'), [
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
        return $result + $this->arg_operations();
    }

    function arg_multiplayerTurnChoice() {
        $result = [];
        return $result + $this->arg_operations();
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

    function arg_operation($op) {
        $opinst = $this->getOperationInstance($op);
        return $opinst->arg();
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
        $ops = Operation_turn::getStandardActions($this->isSolo());
        $operations = [];
        foreach ($ops as $optype) {
            $oparr = $this->machine->createOperationSimple($optype, $this->getPlayerColorById($player_id));
            $oparr['flags'] = MACHINE_OP_RESOLVE_DEFAULT;
            $operations[] = $oparr;
        }
        $this->notifyAllPlayers('tokensUpdate', '', $this->arg_operations($operations));
    }

    function queuePlayersTurn($player_id, $give_time = true, $inc_turn = true) {
        $this->setNextActivePlayerCustom($player_id, $give_time, $inc_turn);
        $color = $this->getPlayerColorById($player_id);
        //$this->undoSavepoint();
        $this->machine->queue("turn", 1, 1, $color);
    }

    function getRollingVp($player_id = 0, string $category = '') {
        $table = [];
        $this->scoreAll($table);

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

    function zombieTurn($state, $active_player) {
        $owner = $this->getPlayerColorById($active_player);
        $tops = $this->machine->getOperations($owner);

        if ($tops && count($tops) > 0) {
            $this->notifyWithName('message', clienttranslate('${player_name} is zombie, action is skipped'), [], $active_player);
            $this->machine->hide($tops);
        }

        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
}
