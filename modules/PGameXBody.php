<?php
require_once "PGameMachine.php";
require_once "MathExpression.php";
require_once "operations/AbsOperation.php";
require_once "operations/ComplexOperation.php";
require_once "operations/DelegatedOperation.php";

define("MA_STAGE_SETUP", 1);
define("MA_STAGE_GAME", 3);
define("MA_STAGE_LASTFOREST", 5);
define("MA_STAGE_ENDED", 9);

abstract class PGameXBody extends PGameMachine {
    protected $eventListners = null; // cache
    protected $map = null;
    protected $token_types_adjusted2 = false;

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
        ]);
    }

    /**
     * override to setup all custom tables
     */
    protected function initTables() {
        try {
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
            $players = $this->loadPlayersBasicInfos();
            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                if ($this->getGameStateValue('var_begginers_corp') == 1) {
                    $corp = $this->tokens->getTokenOfTypeInLocation("card_corp_1_", null, 0);
                    $this->effect_playCorporation($color, $corp['key'], false);
                    $this->tokens->pickTokensForLocation(10, "deck_main", "hand_${color}");
                } else {
                    $this->tokens->pickTokensForLocation(10, "deck_main", "draw_${color}");
                    $corps = 2; //(int)(11 / $this->getPlayersNumber())
                    $this->tokens->pickTokensForLocation($corps, "deck_corp", "draw_${color}");
                    $this->multiplayerqueue($color, "keepcorp,10?buycard");
                }

                if (!$this->isCorporateEraVariant()) {
                    foreach ($production as $prodtype) {
                        $this->effect_incProduction($color, $prodtype, 1);
                    }
                }

                // set proper TR and matching score
                $tr_value = 20;
                if ($this->isSolo()) {
                    $tr_value = 14;
                }

                $tr_traker = $this->getTrackerId($color, 'tr');
                $this->tokens->setTokenState($tr_traker, $tr_value);
                $this->dbSetScore($player_id, $tr_value, '');
            }

            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->queue($color, "finsetup");
            }

            if ($this->isSolo()) {
                $this->setupSoloMap();
            }
            $this->setCurrentStartingPlayer($this->getFirstPlayer());
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
        $num = $this->getPlayersNumber();
        $botcolor = 'ffffff';
        for ($i = 1; $i <= 2; $i++) {
            $hex = array_shift($nonreserved);

            $tile = $this->tokens->getTokenOfTypeInLocation("tile_${type}_", null, 0);
            $this->systemAssertTrue("city tile not found", $tile);
            $this->dbSetTokenLocation($tile['key'], $hex, $num);
            $marker = $this->createPlayerMarker($botcolor);
            $this->tokens->moveToken($marker, $tile['key'], 0);
            $this->incTrackerValue($botcolor, 'city');
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
        //$this->machine->push("a",1,$player_id);
        //$this->machine->interrupt();
        //$this->machine->normalize();
        $card = "card_stanproj_1";
        return $this->debug_oparg("counter(all_city),m", $card);
        //$this->gamestate->nextState("next");
    }

    function debug_drawCard($num) {
        $token = "card_main_$num";
        $color = $this->getCurrentPlayerColor();
        $this->dbSetTokenLocation($token, "hand_$color");
    }

    function debug_op($type) {
        $color = $this->getCurrentPlayerColor();
        $this->push($color, $type);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }

    function debug_money() {
        $color = $this->getCurrentPlayerColor();
        $this->effect_incCount($color, 'm', 40);
    }
    function debug_res($m = 0, $s = 0, $u = 0, $p = 0, $e = 0, $h = 0, $color = 0) {
        if (!$color) $color = $this->getCurrentPlayerColor();
        $res = ['m' => $m, 's' => $s, 'u' => $u, 'p' => $p, 'e' => $e, 'h' => $h];
        foreach ($res as $type => $count) {
            $id = $this->getTrackerId($color, $type);
            $this->dbSetTokenState($id, $count, '', [], $this->getPlayerIdByColor($color));
        }
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
        if ($valid_coords == null)
            $valid_coords = $this->getPlanetMap(false);
        $axis = explode("_", $coords);
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
            if (startsWith($key, "card_")) {
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

    function canAfford($color, $tokenid, $cost = null) {
        if ($cost !== null) {
            $payment_op = "${cost}nm";
        } else
            $payment_op = $this->getPayment($color, $tokenid);
        if ($this->isVoidSingle($payment_op, $color, 1, $tokenid))
            return false;
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

    function playability($owner, $tokenid) {
        if (!$owner) {
            $owner == $this->getActivePlayerColor();
        }
        if (!$this->canAfford($owner, $tokenid)) {
            return MA_ERR_COST;
        }
        // check precondition
        $cond = $this->getRulesFor($tokenid, "pre");
        if ($cond) {
            $valid = $this->evaluatePrecondition($cond, $owner, $tokenid);
            if (!$valid) return MA_ERR_PREREQ; // fail prereq check
        }

        // check immediate effect affordability
        $r = $this->getRulesFor($tokenid, "r");
        if ($r) {
            if ($this->isVoidSingle($r, $owner, 1, $tokenid)) {
                return MA_ERR_MANDATORYEFFECT;
            }
        }
        // special project sell XXX
        if (startsWith($tokenid, "card_stanproj_1")) {
            if ($this->isVoidSingle("sell", $owner)) {
                return MA_ERR_MANDATORYEFFECT;
            }
        }
        return 0;
    }

    function evaluateExpression($cond, $owner = 0, $context = null, $mods = null) {
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
        $type = $this->getRulesFor("tracker_$x", 'type', '');
        if ($type == 'param') {
            $value = $this->tokens->getTokenState("tracker_${x}");
            if (!$mods) return $value;
            return $value + $mods;
        }
        if ($x == 'chand') {
            return $this->tokens->countTokensInLocation("hand_$owner");
        }
        if ($x == 'resCard') {
            return $this->tokens->countTokensInLocation("$context"); // number of resources on the card
        }
        if ($x == 'cost') {
            return $this->getRulesFor($context, 'cost');
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
            throw new BgaSystemException("Cannot instantate $classname for $type");
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
        return $this->isZombiePlayer($playerId) || $this->getTrackerValue($color, 'passed') > 0;
    }

    function incTrackerValue(string $color, $type, $inc = 1) {
        $token_id = $this->getTrackerId($color, $type);
        $this->tokens->incTokenState($token_id, $inc);
        $value = $this->tokens->getTokenState($token_id);
        $this->notifyCounterDirect($token_id, $value, '');
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
        $color = getPart($loc, 1);
        return $this->getPlayerIdByColor($color);
    }

    function setCurrentStartingPlayer(int $playerId) {
        $color = $this->getPlayerColorById($playerId);
        $this->gamestate->changeActivePlayer($playerId);
        $this->dbSetTokenLocation('starting_player', "tableau_$color", 0, clienttranslate('${player_name} is starting player for this generation'), [], $playerId);
    }

    function isEndOfGameAchived() {
        if ($this->isSolo()) {
            $gen = $this->tokens->getTokenState("tracker_gen");
            $maxgen = $this->getRulesFor('solo', 'gen');
            if ($gen == $maxgen) {
                return true;
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
            $this->dbSetTokenLocation($card_id, "tableau_$color", MA_CARD_STATE_ACTION_UNUSED, clienttranslate('You picked corporation ${token_name} and received ${cost} ME. The rest of the perks you will receive after setup is finished'), [
                "_private" => true,
                "cost" => $cost
            ], $player_id);

            $this->effect_incCount($color, 'm', $cost, ['message' => '']);
            return;
        }
        $this->dbSetTokenLocation($card_id, "tableau_$color", MA_CARD_STATE_ACTION_UNUSED, clienttranslate('${player_name} chooses corporation ${token_name}'), [], $player_id);
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

    function effect_undoBuyCards($owner) {
        $color = $owner;
        $player_id = $this->getPlayerIdByColor($color);
        $this->systemAssertTrue("unexpected non multistate", $this->isInMultiplayerMasterState());

        $this->notifyMessage(clienttranslate('${player_name} takes back their move'), [], $player_id);


        $selected = $this->tokens->getTokensInLocation("hand_$color", MA_CARD_STATE_SELECTED);
        $count = count($selected);
        $rest = $this->tokens->getTokensInLocation("draw_$color");
        $has_corp = 0;
        foreach ($rest as $card_id => $card) {
            if (startsWith($card_id, 'card_corp')) {
                $has_corp += 1;
            }
        }

        if ($count == 0 && $has_corp == false) throw new BgaUserException(self::_("Nothing to undo"));
        $ops = $this->getTopOperations($color);
        $this->userAssertTrue("Cannot undo", count($ops) == 1);
        $op = array_shift($ops);



        if ($op['type'] == 'prediscard') {
            // nothing is left
        } else if ($op['type'] == 'buycard') {
            // partial undo
            $this->machine->hide($op);
        } else {
            $this->userAssertTrue("Cannot undo");
        }
        $total = $count + count($rest) - $has_corp;
        $this->multiplayerpush($color, $total . '?buycard');

        foreach ($selected as $card_id => $card) {
            $this->dbSetTokenLocation($card_id, "draw_$color", 0, '');
            $this->effect_incCount($color, 'm', -3, ['message' => '']);
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
            $this->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} is at max'), $token_id);
        }
        // check bonus
        $nvalue = $value >= 0 ? $value : "n" . (-$value);
        $bounus_name = "param_${type}_${nvalue}";
        $bonus = $this->getRulesFor($bounus_name, 'r');
        if ($bonus) {
            //$this->debugLog("-param bonus $bonus");
            $this->putInEffectPool($color, $bonus);
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
            'place' => $this->getTrackerId($owner, $op)
        ]);
    }

    function effect_draw($color, $deck, $to, $inc) {
        $tokens = $this->tokens->pickTokensForLocation($inc, $deck, $to, 0);
        $player_id = $this->getPlayerIdByColor($color);
        $this->dbSetTokensLocation($tokens, $to, null, clienttranslate('private: ${player_name} draws ${token_names}'), [
            "_private" => true, "place_from" => $deck,
        ], $player_id);
        $this->notifyMessage(clienttranslate('${player_name} draws ${token_count} cards'), [
            "token_count" => count($tokens),
        ], $player_id);
        return $tokens;
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
            $this->machine->queue("confirm");
            return null;
        }
        $player_id = $this->getCurrentStartingPlayer();
        $next = $this->getPlayerAfter($player_id);
        $this->setCurrentStartingPlayer($next);
        $this->machine->queue("research");
        return null;
    }

    function effect_finalScoring(): int {
        $this->debugConsole("-- final scoring --");
        $players = $this->loadPlayersBasicInfos();
        $markers = $this->tokens->getTokensOfTypeInLocation("marker", "award_%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // award_x
            $this->scoreAward($loc);
        }
        $markers = $this->tokens->getTokensOfTypeInLocation("marker", "milestone_%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // milestone_x
            $color = explode('_', $id)[1];
            $player_id = $this->getPlayerIdByColor($color);
            $this->dbIncScoreValueAndNotify($player_id, 5, clienttranslate('${player_name} scores ${inc} point/s for milestone'), "game_vp_ms", [
                'place' => $loc
            ]);
        }
        // score map, this is split per type for animation effects
        foreach ($players as $player) {
            $this->scoreMap($player["player_color"]);
        }
        foreach ($players as $player) {
            $this->scoreCards($player["player_color"]);
        }
        foreach ($players as $player_id => $player) {
            $score = $this->dbGetScore($player_id);
            $this->setStat($score, 'game_vp_total', $player_id);
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
                $this->notifyMessage(clienttranslate('${player_name} looses since they did not achieve the goal, score is negated'));
                $this->dbSetScore($player_id, -1);
            }
        }
        return 1;
    }

    function scoreAward(string $award) {
        $expr = $this->getRulesFor($award, 'r');
        $scores = [];
        $players = $this->loadPlayersBasicInfos();
        foreach ($players as $player) {
            $color = $player["player_color"];
            $res = $this->evaluateExpression($expr, $color);
            $scores[$color] = $res;
        }
        arsort($scores);
        $place = 1;
        $lastres = 0;
        $i = 0;
        foreach ($scores as $color => $res) {
            if ($res == 0) break;
            if ($lastres > 0 && $lastres != $res) {
                $place += 1;
                if ($place == 2) {
                    if ($this->getPlayersNumber() == 2) {
                        $this->notifyMessage(clienttranslate('second place is not awarded for 2 player game'));
                        break;
                    }
                    if ($i >= 2) {
                        $this->notifyMessage(clienttranslate('second place is not awarded because 1st place is shared'));
                        break;
                    }
                }
                if ($place > 2) break;
            }

            $player_id = $this->getPlayerIdByColor($color);
            if ($place == 1) $points = 5;
            else if ($place == 2) $points = 2;
            else break;
            $this->dbIncScoreValueAndNotify($player_id, $points, clienttranslate('${player_name} scores ${inc} point/s for award ${award_name} with max value of ${award_counter}'), "game_vp_award", [
                'place' => $award, // XXX?
                'award_name' => $this->getTokenName($award),
                'award_counter' => $res
            ]);
            $i++;
            $lastres = $res;
        }
    }

    function scoreMap(string $owner) {
        $map = $this->getPlanetMap();
        $player_id = $this->getPlayerIdByColor($owner);
        $greenery = 0;
        $cities = 0;
        foreach ($map as $hex => $info) {
            $hexowner = $info['owner'] ?? '';
            if ($hexowner !== $owner)
                continue;
            $tile = $info['tile'];
            $this->systemAssertTrue("should be tile here", $tile);
            $tt = $this->getRulesFor($tile, 'tt');
            if ($tt == MA_TILE_CITY) {
                $cf = count($this->getAdjecentHexesOfType($hex, MA_TILE_FOREST));
                $this->dbIncScoreValueAndNotify($player_id, $cf, clienttranslate('${player_name} scores ${inc} point/s for city tile at ${place_name}'), "game_vp_cities", [
                    'place' => $hex, 'place_name' => $this->getTokenName($hex)
                ]);
                $cities += 1;
            }
            if ($tt == MA_TILE_FOREST) {
                $this->dbIncScoreValueAndNotify($player_id, 1, '', "game_vp_forest", ['place' => $hex]);
                $greenery += 1;
            }
        }
        $this->notifyWithName('message', clienttranslate('${player_name} scores ${inc} points for Greenery tiles'), [
            'inc' => $greenery
        ],  $player_id );
    }

    function scoreCards(string $owner) {
        // get all cards, calculate VP field
        $player_id = $this->getPlayerIdByColor($owner);
        $cards = $this->tokens->getTokensOfTypeInLocation("card", "tableau_$owner");
        $vpdirect = 0;
        foreach ($cards as $card => $cardrec) {
            $vp = $this->getRulesFor($card, 'vp');
            //$this->debugConsole(" $card -> $vp");
            if (!$vp)
                continue;
            if (is_numeric($vp)) {
                $this->dbIncScoreValueAndNotify($player_id, $vp, '', "game_vp_cards", ['place' => $card]);
                $vpdirect += $vp;
                continue;
            }
            try {
                $value = $this->evaluateExpression($vp, $owner, $card);
                if ($value) {
                    $this->dbIncScoreValueAndNotify($player_id, $value, clienttranslate('${player_name} scores ${inc} point/s for card ${token_name}'), "game_vp_cards", [
                        'place' => $card, 'token_name' => $card
                    ]);
                    continue;
                }
            } catch (Exception $e) {
                $this->debugConsole("error during expression eval $card=>'$vp'");
                $this->error("error during expression eval $vp");
                $this->error($e);
            }
        }
        $this->notifyMessage(clienttranslate('${player_name} scores total ${inc} points for cards with implicit points'), [
            'inc' => $vpdirect
        ], $player_id );
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
            return [
                'payop' => $this->getPayment($color, $tokenid),
                'q' => $this->playability($color, $tokenid)
            ];
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

    public function isVoid($op) {
        $opinst = $this->getOperationInstance($op);
        return $opinst->isVoid();
    }

    public function isVoidSingle(string $type, string $color, ?int $count = 1, string $data = '') {
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
        $n = $this->getPlayersNumber();
        $passed = 0;
        while ($passed < $n) {
            $player_id = $this->getPlayerAfter($player_id);
            if (!$this->isPassed($this->getPlayerColorById($player_id))) {
                break;
            }
            $passed++;
        }
        if ($passed == $n) {
            // end of turn
            return $this->effect_endOfTurn();
        }
        $this->setNextActivePlayerCustom($player_id);
        $this->undoSavepoint();
        $turn = $this->getStat("turns_number", $player_id);
        $color = $this->getActivePlayerColor();
        $this->machine->push("turn", 1, 1, $color);
        if ($turn > 10000) {
            // recursion?
            $this->error("detected very high turn number $turn");
            return STATE_PLAYER_CONFIRM;
        }
        return null;
    }
}
