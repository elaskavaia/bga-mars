<?php
require_once "PGameMachine.php";
require_once "MathExpression.php";
require_once "operations/AbsOperation.php";
require_once "operations/ComplexOperation.php";
require_once "operations/DelegatedOperation.php";


abstract class PGameXBody extends PGameMachine {
    protected $eventListners; // cache
    protected $map; // cache

    function __construct() {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        self::initGameStateLabels(
            [
                "gameended" => 11,
                //      ...
                //    "my_first_game_variant" => 100,
                //    "my_second_game_variant" => 101,
                //      ...
            ]
        );
    }

    /**
     * override to setup all custom tables
     */
    protected function initTables() {
        try {
            $this->createTokens();
            $this->tokens->shuffle("deck_main");
            $players = $this->loadPlayersBasicInfos();

            foreach ($players as $player_id => $player) {
                $color = $player["player_color"];
                $this->tokens->pickTokensForLocation(4, "deck_main", "hand_${color}");
                $this->dbSetScore($player_id, 20, '');
            }
        } catch (Exception $e) {
            $this->error($e);
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
        $oxigen = $this->tokens->getTokenState("tracker_o");
        $oceans = $this->tokens->getTokenState("tracker_w");
        $temp = $this->tokens->getTokenState("tracker_t");
        return (100 * ($oxigen / 14 + $oceans / 9 + ($temp + 30) / 38)) / 3;
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
        $this->gamestate->nextState("next");
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

    function debug_oparg($type, $data = '') {
        $color = $this->getCurrentPlayerColor();
        $inst = $this->getOperationInstanceFromType($type, $color, 1, $data);
        return $inst->arg();
    }

    // HEX MATH

    function getAdjecentHexes($coords, $valid_coords = null) {
        if ($valid_coords == null)
            $valid_coords = $this->getPlanetMap(false);
        $axis = explode("_", $coords);
        $neighbours = array();
        $x = $axis[1];
        $y = $axis[2];
        if ($x == 0) return []; // space areas
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
            if ($newax[0] == 0) continue; // space areas
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
                    if ($tileowner != $ownwer) continue;
                }
                $res[] = $hex;
            }
        }
        return $res;
    }

    function evaluateAdj($color, $ohex, $rule) {
        if (!$rule) return 0;
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
                $bonus=$this->getRulesFor($ohex,'r','');
                return strpos($bonus,'s')!==false || strpos($bonus,'u')!==false;
            default:
                throw new BgaSystemException("Unknown adj rule $rule");
        }
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

    function getPlanetMap($load = true) {
        if ($this->map) return $this->map;
        $res = [];
        foreach ($this->token_types as $key => $rules) {
            if (startsWith($key, 'hex')) $res[$key] = $rules;
        }
        if (!$load) return $res;
        $tokens = $this->tokens->getTokensInLocation("hex%");
        foreach ($tokens as $key => $rec) {
            $loc = $rec['location'];
            $res[$loc]['tile'] = $key;
            $res[$loc]['owno'] = $rec['state']; // for now XXX
            $res[$loc]['owner'] = $this->getPlayerColorByNo($res[$loc]['owno']);
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

    function canAfford($color, $tokenid, $cost = null) {
        if ($cost !== null) {
            $mc = $this->getTrackerValue($color, 'm');
            return $mc >= $cost;
        }
        $payment_op = $this->getPayment($color, $tokenid);
        $payment_inst = $this->getOperationInstanceFromType($payment_op, $color);
        if ($payment_inst->isVoid()) return false;
        return true;
    }

    function playability($owner, $tokenid) {
        if (!$owner) {
            $owner == $this->getActivePlayerColor();
        }

        if (!$this->canAfford($owner, $tokenid)) {
            return MA_ERR_COST;
        }
        // check precond
        $cond = $this->getRulesFor($tokenid, "pre");
        if ($cond) {
            $valid = $this->evaluateExpression($cond, $owner);
            if (!$valid) {
                return MA_ERR_PREREQ; // fail prereq check
            }
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
            if ($this->isVoid(["type" => "sell", "owner" => $owner])) {
                return MA_ERR_MANDATORYEFFECT;
            }
        }


        return 0;
    }

    function evaluateExpression($cond, $owner = 0, $context = null) {
        if (!$owner) $owner = $this->getActivePlayerColor();
        $expr = MathExpression::parse($cond);
        $mapper = function ($x) use ($owner, $context) {
            return $this->evaluateTerm($x, $owner, $context);
        };
        return $expr->evaluate($mapper);
    }

    function evaluateTerm($x, $owner, $context = null) {
        if ($x == 'chand') {
            return $this->tokens->countTokensInLocation("hand_$owner");
        }

        if ($x == 'resCard') {
            return $this->tokens->countTokensInLocation("$context"); // number of resources on the card
        }
        if ($x == 'tagEvent') {
            // tagEvent is not counted as tag since its not face up
            return $this->tokens->countTokensInLocation("tableau_$owner", 0);
        }
        $opp = startsWith($x, 'opp_');
        if (startsWith($x, 'all_') || $opp) {
            $x = substr($x, 4);
            $colors = $this->getPlayerColors();
            $value = 0;
            foreach ($colors as $color) {
                if ($opp && $color === $owner) continue;
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
            $expr = OpExpression::parseExpression($type);
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
                throw new BgaSystemException("Operation is not defined for $type");
            }
            $classname = array_get($rules, "class", "Operation_$type");

            require_once "operations/$classname.php";
            $opinst = new $classname($type, $opinfo, $this);
            if ($params) $opinst->setParams($params);
            return $opinst;
        } catch (Throwable $e) {
            $this->error($e);
            throw new BgaSystemException("Cannot instantate $classname for $type");
        }
    }
    function getOperationInstanceFromType(string $type, string $color, ?int $count = 1, string $data = '') {
        $opinfo = [
            'type' => $type,
            'owner' => $color,
            'mcount' => $count,
            'count' => $count,
            'data' => $data,
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
        $value =   $this->tokens->getTokenState($token_id);
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

    function  getCardsWithResource($par, $cardlike = "card_%") {
        $tokens = $this->tokens->getTokensOfTypeInLocation("resource", $cardlike);
        $keys = [];
        foreach ($tokens as $info) {
            $card = $info['location'];
            $holds = $this->getRulesFor($card, 'holds', '');
            if (!$holds) continue;
            if ($par && $holds != $par) continue;
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
    function push($color, $type, $data = '') {
        $this->machine->push($type, 1, 1, $color, MACHINE_OP_SEQ, $data);
    }
    function put($color, $type, $data = '') {
        $this->machine->put($type, 1, 1, $color, MACHINE_OP_SEQ, $data);
    }
    function putInEffectPool($owner, $type, $data = '') {
        $this->machine->put($type, 1, 1, $owner, MACHINE_FLAG_UNIQUE,  $data);
    }

    function getActiveEventListeners() {
        if (!$this->eventListners) {
            $cards = $this->tokens->getTokensOfTypeInLocation("card", "tableau_%");
            $this->eventListners = [];
            foreach ($cards as $key => $info) {
                $e = $this->getRulesFor($key, 'e');
                if (!$e) continue;
                $info['e'] = $e;
                $info['owner'] = substr($info['location'], strlen('tableau_'));
                $this->eventListners[$key] = $info;
            }
        }
        return $this->eventListners;
    }

    function notifyEffect($owner, $events, $card_context) {
        $listeners = $this->collectListeners($owner, $events, $card_context);

        foreach ($listeners as $lisinfo) {
            $outcome = $lisinfo['outcome'];
            $card = $lisinfo['card'];
            $this->notifyMessageWithTokenName(clienttranslate('${player_name} triggered effect of ${token_name}'), $card, $owner);
            // these goes in the pull where player can pick the sequence
            $this->machine->put($outcome, 1, 1, $owner, MACHINE_FLAG_UNIQUE,  $lisinfo['target']);
        }
    }

    function collectDiscounts($owner, $card_id) {
        // event will be onPay_card or similar
        // load all active effect listeners
        $events = $this->getPlayCardEvents($card_id, 'onPay_');
        $discount = 0;
        $listeners = $this->collectListeners($owner, $events);

        foreach ($listeners as $lisinfo) {
            $outcome = $lisinfo['outcome'];
            // at this point only discounts are MC
            $opexpr = OpExpression::parseExpression($outcome);
            $this->systemAssertTrue("Not expecting other payment options", $opexpr->args[0] == 'm');
            $discount += $opexpr->to;
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
                $ret = [];
                // filter for listener for specific effect
                if ($this->mtMatchEvent($e, $lisowner, $event, $owner, $ret)) {
                    $context = $ret['context'];
                    $ret['card'] = $card;
                    $ret['owner'] = $lisowner;
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
     * <list> ::=   <trigger_rule>  || <trigger_rule> ';' <list>
     * <trigger_rule> ::= <trigger> ':' <outcome> | <trigger> ':' <outcome> ':' 'that'
     * 
     * <event> ::= <trigger>
     *
     * @param string $declared
     * Effect: When you play a plant, microbe, or an animal tag, including this, gain 1 plant or add 1 resource TO THAT CARD.
     *                  - play_tagPlant: (p/res): that; play_tagMicrobe: (p/res): that
     * 
     * @param string $event-
     *            what actually happen, play_tagMicrobe
     * @param array $splits
     * @return boolean
     */
    function mtMatchEvent($trigger_rule, $trigger_owner, $event, $event_owner, &$splits = []) {
        if (!$trigger_rule) return false;
        $expr = OpExpression::parseExpression($trigger_rule);
        if ($expr->op != ';') $args = [$expr];
        else $args = $expr->args;
        foreach ($args as $arg) {
            if ($arg->op != ':') throw new BgaSystemException("Cannot parse $trigger_rule missing : " . OpExpression::str($arg));
            $all = OpExpression::str(array_get($arg->args, 3, ''));
            if (($trigger_owner === $event_owner || $all === 'any')) { // for now only listen to own events
                $declareevent = OpExpression::str($arg->args[0]);
                $regex = MathLexer::toregex($declareevent);

                if (preg_match($regex, $event) == 1) {
                    $splits['outcome'] = $arg->args[1]->__toString();
                    $splits['context'] = OpExpression::str(array_get($arg->args, 2, '')); // can be 'that' - meaning context of card that triggered the event vs event handler
                    return true;
                }
            }
        }
        return false;
    }

    function getPayment($color, $card_id): string {
        $costm = $this->getRulesFor($card_id, "cost", 0);
        $tags = $this->getRulesFor($card_id, "tags", '');
        $discount = $this->collectDiscounts($color, $card_id);
        $costm = max(0, $costm - $discount);
        if (strstr($tags, "Building")) return "${costm}nms";
        if (strstr($tags, "Space")) return "${costm}nmu";
        return "${costm}nm";
    }

    function getCurrentStartingPlayer() {
        $loc = $this->tokens->getTokenLocation('starting_player');
        if (!$loc) return $this->getFirstPlayer();
        $color = getPart($loc, 1);
        return $this->getPlayerIdByColor($color);
    }

    function setCurrentStartingPlayer(int $playerId) {
        $color = $this->getPlayerColorById($playerId);
        $this->gamestate->changeActivePlayer($playerId);
        $this->dbSetTokenLocation('starting_player', "tableau_$color", 0, clienttranslate('${player_name} is starting player for this generation'), [], $playerId);
    }

    function isEndOfGameAchived() {
        return $this->getGameProgression() >= 100;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////




    //////////////////////////////////////////////////////////////////////////////
    //////////// Effects
    ////////////

    function effect_cardInPlay($color, $card_id) {
        $rules = $this->getRulesFor($card_id, '*');
        $ttype = $rules['t']; // type of card
        $state = MA_CARD_STATE_TAGUP;
        if ($ttype == MA_CARD_TYPE_EVENT) {
            $state = MA_CARD_STATE_FACEDOWN;
        }
        if (isset($rules['a'])) {
            $state = MA_CARD_STATE_ACTION_UNUSED; // activatable cars
        }
        $this->dbSetTokenLocation(
            $card_id,
            "tableau_${color}",
            $state,
            clienttranslate('${player_name} plays card ${token_name}'),
            [],
            $this->getPlayerIdByColor($color)
        );
        $this->eventListners = null; // clear cache since card came into play

        $tags = $rules['tags'] ?? "";
        $tagsarr = explode(' ', $tags);
        if ($ttype != MA_CARD_TYPE_EVENT && $tags) {
            foreach ($tagsarr as $tag) {
                $this->incTrackerValue($color, "tag$tag");
            }
        }
        $playeffect =  array_get($rules, 'r', '');

        if ($playeffect) {
            $this->debugLog("-come in play effect $playeffect");
            $this->machine->put($playeffect, 1, 1, $color, MACHINE_FLAG_UNIQUE, $card_id);
        }
        $events = $this->getPlayCardEvents($card_id, 'play_');
        $this->notifyEffect($color, $events, $card_id);
    }

    function effect_placeTile($color, $object, $target) {
        $player_id = $this->getPlayerIdByColor($color);
        $otype =  $this->getRulesFor($object, 'tt');
        $no = $this->getPlayerNoById($player_id);
        if ($otype == MA_TILE_OCEAN) $no = -1;
        $this->dbSetTokenLocation(
            $object,
            $target,
            $no,
            clienttranslate('${player_name} places tile ${token_name} into ${place_name}'), // XXX
            [],
            $this->getPlayerIdByColor($color)
        );

        $this->map = null; // clear map cache since tile came into play ! important
        // hex bonus
        $bonus = $this->getRulesFor($target, 'r');
        if ($bonus) {
            $this->debugLog("-placement bonus $bonus");
            $this->putInEffectPool($color, $bonus, $object);
        }
        // ocean bonus
        $oceans = $this->getAdjecentHexesOfType($target, MA_TILE_OCEAN);
        $c = count($oceans);
        if ($c) {
            $c = $c * 2;
            $bonus = "${c}m"; // 2 MC per ocean
            $this->putInEffectPool($color, $bonus, $object);
        }
        return $object;
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

        if (array_get($tagMap, 'Space') && array_get($tagMap, 'Event')) $events[] = "${prefix}cardSpaceEvent";
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

        $this->dbResourceInc(
            $token_id,
            $inc,
            $message,
            [],
            $this->getPlayerIdByColor($color),
            $options
        );
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
            $message = clienttranslate('${player_name} decreases ${token_name} by ${mod}');
            $mod = -$inc;
        }
        $this->notifyCounterDirect($token_id, $value, $message, [
            "mod" => $mod,
            "token_name" => $token_id,
        ], $this->getPlayerIdByColor($color));
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
            if ($inc == 0) {
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

        if ($value == $max) {
            $this->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} is at max'), $token_id);
        }

        // check bonus
        $nvalue = $value >= 0 ? $value : "n" . (-$value);

        $bounus_name = "param_${type}_${nvalue}";
        $bonus = $this->getRulesFor($bounus_name, 'r');
        if ($bonus) {
            $this->debugLog("-param bonus $bonus");
            $this->putInEffectPool($color, $bonus);
        }

        $this->effect_incTerraformingRank($color, $steps);
        if ($this->isEndOfGameAchived()) {
            $this->notifyWithName('message_warning', clienttranslate("You have done it!!!"));
        }
        return true;
    }

    function effect_incTerraformingRank(string $owner, int $inc) {
        $op = 'tr';
        $this->effect_incCount($owner, $op, $inc);
        $this->dbIncScoreValueAndNotify($this->getPlayerIdByColor($owner), $inc, '', "game_vp_tr", ['place' => $this->getTrackerId($owner, $op)]);
    }

    function effect_draw($color, $deck, $to, $inc) {
        $tokens = $this->tokens->pickTokensForLocation($inc, $deck, $to, $inc);
        $this->dbSetTokensLocation(
            $tokens,
            $to,
            null,
            clienttranslate('${player_name} draws ${token_count} cards'),
            [
                "place_name" => $deck,
                "token_count" => count($tokens),
                "player_id" => $this->getPlayerIdByColor($color)
            ]
        );
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
                    if ($curr) {
                        $this->effect_incCount($color, 'h', $curr, ['message' => clienttranslate('${player_name} gains ${inc_resource} due to heat transfer')]);
                    }
                } elseif ($p == 'm') {
                    $curr = $this->tokens->getTokenState("tracker_tr_${color}");
                    $prod += $curr;
                }
                if ($prod) $this->effect_incCount($color, $p, $prod);
            }
        }
    }

    function effect_endOfTurn() {
        if ($this->getGameStateValue('gameended') == 1) {
            return STATE_END_GAME;
        }
        $this->effect_production();
        if ($this->isEndOfGameAchived()) {
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

        $markers = $this->tokens->getTokensOfTypeInLocation("marker", "award%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // milestone_x
            $color = explode('_', $id)[1];
            $player_id = $this->getPlayerIdByColor($color);
            // XXX determine the winner
            $this->dbIncScoreValueAndNotify($player_id, 5, clienttranslate('${player_name} scores ${inc} point/s for award'), "game_vp_award", ['place' => $loc]);
        }
        $markers = $this->tokens->getTokensOfTypeInLocation("marker", "milestone%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // milestone_x
            $color = explode('_', $id)[1];
            $player_id = $this->getPlayerIdByColor($color);
            $this->dbIncScoreValueAndNotify($player_id, 5, clienttranslate('${player_name} scores ${inc} point/s for milestone'), "game_vp_ms", ['place' => $loc]);
        }
        // score map, this is split per type for animation effects
        foreach ($players as $player) {
            $this->scoreMap($player["player_color"]);
        }

        foreach ($players as $player) {
            $this->scoreCards($player["player_color"]);
        }
        $this->setGameStateValue('gameended', 1);
        return 1;
    }

    function scoreMap(string $owner) {
        $map = $this->getPlanetMap();
        $player_id = $this->getPlayerIdByColor($owner);
        $greenery = 0;
        $cities = 0;
        foreach ($map as $hex => $info) {
            $hexowner = $info['owner'] ?? '';
            if ($hexowner !== $owner) continue;
            $tile = $info['tile'];
            $this->systemAssertTrue("should be tile here", $tile);
            $tt = $this->getRulesFor($tile, 'tt');
            if ($tt == MA_TILE_CITY) {
                $cf = count($this->getAdjecentHexesOfType($hex, MA_TILE_FOREST));
                $this->dbIncScoreValueAndNotify(
                    $player_id,
                    $cf,
                    clienttranslate('${player_name} scores ${inc} point/s for city tile at ${place_name}'),
                    "game_vp_cities",
                    ['place' => $hex, 'place_name' => $this->getTokenName($hex)]
                );
                $cities += 1;
            }
            if ($tt == MA_TILE_FOREST) {
                $this->dbIncScoreValueAndNotify($player_id, 1, '', "game_vp_forest", ['place' => $hex]);
                $greenery += 1;
            }
        }
        $this->notifyWithName('message', clienttranslate('${player_name} scores ${inc} points for Greenery tiles'), ['inc' => $greenery]);
    }

    function scoreCards(string $owner) {
        // get all cards, calculate VP field
        $player_id = $this->getPlayerIdByColor($owner);
        $cards = $this->tokens->getTokensOfTypeInLocation("card", "tableau_$owner");
        $vpdirect = 0;
        foreach ($cards as $card => $cardrec) {
            $vp  = $this->getRulesFor($card, 'vp');
            //$this->debugConsole(" $card -> $vp");
            if (!$vp) continue;
            if (is_numeric($vp)) {
                $this->dbIncScoreValueAndNotify(
                    $player_id,
                    $vp,
                    '',
                    "game_vp_cards",
                    ['place' => $card]
                );
                $vpdirect += $vp;
                continue;
            }
            try {
                $value = $this->evaluateExpression($vp, $owner, $card);
                if ($value) {
                    $this->dbIncScoreValueAndNotify(
                        $player_id,
                        $value,
                        clienttranslate('${player_name} scores ${inc} point/s for card ${token_name}'),
                        "game_vp_cards",
                        ['place' => $card, 'token_name' => $card]
                    );
                    continue;
                }
            } catch (Exception $e) {
                $this->debugConsole("error during expression eval $card=>'$vp'");
                $this->error("error during expression eval $vp");
                $this->error($e);
            }
        }
        $this->notifyMessage(clienttranslate('${player_name} scores total ${inc} points for cards with implicit points'), ['inc' => $vpdirect]);
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
            $rejected = $filter($color, $tokenid);
            $res[$tokenid] = ["q" => $rejected];
        }
        return $res;
    }

    function filterPlayable($color, $keys) {
        return $this->createArgInfo($color, $keys, function ($color, $tokenid) {
            return  $this->playability($color, $tokenid);
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
        $this->machineDistpatch(STATE_GAME_DISPATCH, STATE_PLAYER_CONFIRM);
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

    function executeImmediately($color, $type, $count) {
        // this does not go on stack - so no stack clean up
        $opinst = $this->getOperationInstanceFromType($type, $color, $count);
        return $opinst->auto($color, $count);
    }

    function executeOperationsMultiple($operations) {
        $this->systemAssertTrue("Wrong operation count", count($operations) > 1);
        $op = reset($operations);
        $this->switchActivePlayerIfNeeded($op["owner"]);
        return STATE_PLAYER_TURN_CHOICE;
    }

    function executeOperationSingleAtomic($op) {
        if (!$this->executeAttemptAutoResolve($op)) {
            $this->switchActivePlayerIfNeeded($op["owner"]);
            return STATE_PLAYER_TURN_CHOICE; // player has to provide input
        }
        return null;
    }

    function executeAttemptAutoResolve($op) {
        $opinst = $this->getOperationInstance($op);
        $count = $op["count"]; // XXX mcount?
        $tops = $this->machine->getTopOperations();
        if ($opinst->auto($op["owner"], $count)) {
            $this->saction_stack($count, $op, $tops);
            return true;
        }
        return false;
    }

    function switchActivePlayerIfNeeded($player_color) {
        if (!$player_color) return;
        $player_id = $this->getPlayerIdByColor($player_color);
        if (!$player_id) return;
        if ($this->getActivePlayerId() != $player_id) {
            $this->setNextActivePlayerCustom($player_id);
            $this->undoSavepoint();
        }
    }

    function machineExecuteDefault() {
        if ($this->getGameStateValue('gameended') == 1) {
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
