<?php
require_once "PGameMachine.php";
require_once "NotifBuilder.php";
require_once "MathExpression.php";
require_once "operations/AbsOperation.php";


abstract class PGameXBody extends PGameMachine {
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
                //    "my_second_global_variable" => 11,
                //      ...
                //    "my_first_game_variant" => 100,
                //    "my_second_game_variant" => 101,
                //      ...
            ] //    "my_first_global_variable" => 10,
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
        $color = getPart($token, 2);
        $this->tokens->createToken($token, "miniboard_${color}");
        $info = $this->tokens->getTokenInfo($token);
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

    function debug_dumpMachine() {
        $this->debugConsole("", $this->machine->gettableexpr());
    }

    function createPlayerMarker($color) {
        $token = "marker_${color}";
        $key = $this->tokens->createTokenAutoInc($token, "miniboard_${color}");
        return $key;
    }

    function getPlanetMap() {
        $res = [];
        foreach ($this->token_types as $key => $rules) {
            if (startsWith($key, 'hex')) $res[$key] = $rules;
        }
        $tokens = $this->tokens->getTokensInLocation("hex%");
        foreach ($tokens as $key => $rec) {
            $loc = $rec['location'];
            $res[$loc]['tile'] = $key;
            $res[$loc]['owno'] = $rec['state']; // for now XXX
        }
        return $res;
    }

    // public function getPlayerNameById($player_id) {
    //     if (!is_numeric($player_id)) throw new feException("invalid player id $player_id");
    //     $players = self::loadPlayersBasicInfos();
    //     return $players[$player_id]['player_name'];
    // }
    function notif($player_id = null) {
        $builder = new NotifBuilder($this);
        if ($player_id) {
            $builder = $builder->withPlayer($player_id);
        }
        return $builder;
    }

    function canAfford($owner, $tokenid, $cost) {
        // badges and resources XXX
        try {
            $this->effect_incCount($owner, "m", -$cost, ['onlyCheck' => true]);
        } catch (Exception $e) {
            return false;
        }
        return true;
    }

    function playability($owner, $tokenid) {
        if (!$owner) {
            $owner == $this->getActivePlayerColor();
        }
        $cost = $this->getRulesFor($tokenid, "cost");
        if (!$this->canAfford($owner, $tokenid, $cost)) {
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

        // special project sell XXX
        if (startsWith($tokenid, "card_stanproj_1")) {
            if ($this->isVoid(["type" => "sell", "owner" => $owner])) {
                return MA_ERR_MANDATORYEFFECT;
            }
        }
        // TODO check rule affordability

        return 0;
    }

    function evaluateExpression($cond, $owner, $context = null) {
        $expr = MathExpression::parse($cond);
        $mapper = function ($x) use ($owner) {
            if ($x == 'chand') {
                return $this->tokens->countTokensInLocation("hand_$owner");
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
        };
        return $expr->evaluate($mapper);
    }


    function  getOperationInstance($type): AbsOperation {
        $matches = null;
        $params = null;
        if (preg_match("/^(\w+)\((.*)\)$/", $type, $matches)) {
            // function call
            $params = $matches[2];
            $type = $matches[1];
        }
        $rules = $this->getOperationRules($type);
        if (!$rules) {
            $this->systemAssertTrue("Operation is not defined for $type");
            return null;
        }
        $classname = array_get($rules, "class", "Operation_$type");
        try {
            require_once "operations/$classname.php";
            $opinst = new $classname($type, $this);
            if ($params) $opinst->setParams($params);
            return $opinst;
        } catch (Throwable $e) {
            $this->error($e->getTraceAsString());
            $this->systemAssertTrue("Cannot create operation for $type");
            return null;
        }
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
    function getTrackerValue(string $color, string $type) {
        $value = $this->tokens->getTokenState($this->getTrackerId($color, $type));
        return $value;
    }

    function queue($color, $type) {
        $this->machine->queue($type, 1, 1, $color, MACHINE_OP_SEQ);
    }
    function push($color, $type) {
        $this->machine->push($type, 1, 1, $color, MACHINE_OP_SEQ);
    }
    function put($color, $type) {
        $this->machine->put($type, 1, 1, $color, MACHINE_OP_SEQ);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////





    function uaction_playCard($args) {
        $card_id = $args["target"];
        $rules = $this->getRulesFor($card_id);
        $color = $this->getActivePlayerColor();
        $cost = $this->getRulesFor($card_id, "cost");
        $payment = $args["payment"] ?? "auto";
        $this->machine->interrupt();
        if ($payment == "auto") {
            $this->executeImmediately($color, "nm", $cost);
        } else {
            $this->systemAssertTrue("Not supported payment");
        }

        if (startsWith($card_id, "card_stanproj")) {
            $this->put($color, $rules);
            $this->notif()
                ->withToken($card_id)
                ->notifyAll(clienttranslate('${player_name} plays basic project ${token_name}'));
            return true;
        }


        $this->effect_cardInPlay($color, $card_id);
    }



    //////////////////////////////////////////////////////////////////////////////
    //////////// Effects
    ////////////

    function effect_cardInPlay($color, $card_id) {
        $rules = $this->getRulesFor($card_id, '*');
        $ttype = $rules['t']; // type of card
        $faceup = 1;
        if ($ttype == MA_CARD_TYPE_EVENT) {
            $faceup = 0;
        }
        $this->dbSetTokenLocation(
            $card_id,
            "tableau_${color}",
            $faceup,
            clienttranslate('${player_name} plays card ${token_name}'),
            [],
            $this->getPlayerIdByColor($color)
        );
        $tags = $rules['tags'] ?? "";
        $tagsarr = explode(' ', $tags);
        if ($ttype != MA_CARD_TYPE_EVENT) {
            foreach ($tagsarr as $tag) {
                $this->incTrackerValue($color, "tag$tag");
            }
        }
        $playeffect = $rules['r'];
        $this->debugConsole("-come in play effect $playeffect");
        if ($playeffect) $this->machine->put($playeffect, 1, 1, $color, MACHINE_FLAG_UNIQUE);
        foreach ($tagsarr as $tag) {
            $this->notifyEffect($color, "playTag", "tag$tag");
        }
        $this->notifyEffect($color, "playCard", $card_id);
    }

    function notifyEffect($owner, $event, $arg) {
        // load all active effect listeners
        // filter for listener for specific effect
        // TODO
    }

    function effect_incCount(string $color, string $type, int $inc = 1, array $options = []) {
        $message = array_get($options, 'message', '*');
        unset($options['message']);
        $token_id = $this->getTrackerId($color, $type);
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

    function effect_increaseParam($color, $type, $inc) {
        if (!$color) {
            $color = $this->getActivePlayerColor();
        }
        $token_id = "tracker_$type";
        $max = $this->getRulesFor($token_id, 'max', 30);

        $current = $this->tokens->getTokenState($token_id);
        if ($current + $inc > $max) {
            $inc = $max - $current;
            if ($inc == 0) {
                $this->notif($color)
                    ->withToken($token_id)
                    ->notifyAll('Parameter ${token_name} is at max, can no longer increase');
                return false;
            }
        }
        $value = $this->tokens->setTokenState($token_id, $current + $inc);
        $message = clienttranslate('${player_name} increases ${token_name} by ${inc} step/s to a value of ${counter_value}');

        $this->notifyCounterDirect($token_id, $value, $message, [
            "inc" => $inc,
            "token_name" => $token_id,
        ], $this->getPlayerIdByColor($color));

        if ($value == $max) {
            $this->notif($color)
                ->withToken($token_id)
                ->notifyAll('Parameter ${token_name} is at max');
        }

        $this->effect_incTerraformingRank($color, $inc);
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
        $this->effect_production();
        if ($this->isEndOfGameAchived()) {
            $this->machine->queue("lastforest");
            $this->machine->queue("finalscoring");
            return null;
        }
        $player_id = $this->getCurrentStartingPlayer();
        $next = $this->getPlayerAfter($player_id);
        $this->setCurrentStartingPlayer($next);
        $this->machine->queue("research");
        return null;
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
    //////////// Game state arguments
    ////////////
    /*
     * Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
     * These methods function is to return some additional information that is specific to the current
     * game state.
     */
    function arg_playerTurnB() {
        return ["otherplayer" => $this->getActivePlayerName(), "otherplayer_id" => $this->getActivePlayerId()];
    }

    function arg_playerTurnChoice() {
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
        $type = $op["type"];
        $opinst = $this->getOperationInstance($type);
        return $opinst->arg($op);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////

    function st_gameDispatch() {
        $this->machineDistpatch(STATE_GAME_DISPATCH, STATE_PLAYER_CONFIRM);
    }

    public function isVoid($op) {
        $type = $op["type"];
        $opinst = $this->getOperationInstance($type);
        return $opinst->isVoid($op);
    }

    function saction_resolve($type, $args):int {
        $opinst = $this->getOperationInstance($type);
        return $opinst->action_resolve($args);
    }

    function executeImmediately($color, $type, $count) {
        // this does not go on stack - so no stack clean up
        $opinst = $this->getOperationInstance($type);
        return $opinst->auto($color, $count);
    }
    function executeOperationsMultiple($operations) {
        $this->systemAssertTrue("Wrong operation count", count($operations) > 1);
        return STATE_PLAYER_TURN_CHOICE;
    }

    function executeOperationSingleAtomic($op) {
        if (!$this->executeAttemptAutoResolve($op)) {
            return STATE_PLAYER_TURN_CHOICE; // player has to provide input
        }
        return null;
    }

    function executeAttemptAutoResolve($op) {
        $type = $op["type"];
        $this->notifyMessage(clienttranslate('${player_name} executes ${operation_name}'), [
            "operation_name" => $this->getOperationName($type),
        ]);
        $opinst = $this->getOperationInstance($type);
        $opinst->setOpInfo($op);
        $count = $op["count"];
        if ($opinst->auto($op["owner"], $count)) {
            $this->saction_stack($count, $op);
            return true;
        }
        return false;
    }

    function machineExecuteDefault() {
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
