<?php
require_once "PGameMachine.php";
require_once "NotifBuilder.php";
require_once "MathExpression.php";
require_once "operations/AbsOperation.php";
require_once "operations/Operation_embedded.php";


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
    public function getPlayerNameById($player_id) {
        if (!is_numeric($player_id)) throw new feException("invalid player id $player_id");
        $players = self::loadPlayersBasicInfos();
        return $players[$player_id]['player_name'];
    }
    function notif($player_id = null) {
        $builder = new NotifBuilder($this);
        if ($player_id) {
            $builder = $builder->withPlayer($player_id);
        }
        return $builder;
    }

    function canAfford($owner, $tokenid) {
        $cost = $this->getRulesFor($tokenid, "cost");

        // badges and resources XXX
        try {
            $this->effect_increaseCount($owner, "m", -$cost, true);
        } catch (Exception $e) {
            return false;
        }
        return true;
    }

    function playability($owner, $tokenid) {
        if (!$owner) {
            $owner == $this->getActivePlayerColor();
        }
        if (!$this->canAfford($owner, $tokenid)) {
            return 1;
        }
        // check precond
        $cond = $this->getRulesFor($tokenid, "pre");
        if ($cond) {
            $valid = $this->evaluateExpression($cond, $owner);
            if (!$valid) {
                return 2; // fail precond check
            }
        }
        // check immediate effect affordability

        // special project XXX
        if (startsWith($tokenid, "card_stanproj_1")) {
            if ($this->arg_operation(["type" => "sell", "owner" => $owner], true)["void"]) {
                return 3;
            }
        }
        // TODO check rule affordability

        return 0;
    }

    function evaluateExpression($cond, $owner) {
        $expr = MathExpression::parse($cond);
        $mapper = function ($x) use ($owner) {
            $create = $this->getRulesFor("tracker_$x", "create", null);
            if ($create === null) {
                throw new feException("Cannot evalute $x");
            }
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
        if (startsWith($type, "'")) {
            // embedded operation
            return new Operation_embedded($type, $this);
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
            return $opinst;
        } catch (Throwable $e) {
            $this->error($e->getTraceAsString());
            $this->systemAssertTrue("Cannot create operation for $type");
            return null;
        }
    }

    function isPassed($color) {
        // XXX also add zombie player
        return $this->tokens->getTokenState("tracker_passed_${color}") > 0;
    }


    function dbIncPlayerTracker(string $color, $type, $inc) {
        if (!$color) {
            $color = $this->getActivePlayerColor();
        }
        $token_id = "tracker_${type}_${color}";
        $value = $this->tokens->incTokenState($token_id, $inc);
        $this->notifyCounterDirect($token_id, $value, '', [], $this->getPlayerIdByColor($color));
    }
    function dbIncGlobalTracker($type, $inc) {
        $token_id = "tracker_${type}";
        $value = $this->tokens->incTokenState($token_id, $inc);
        $this->notifyCounterDirect($token_id, $value, '');
    }

    function queue($color, $type) {
        $this->machine->queue($type, 1, 1, $color);
    }
    function push($color, $type) {
        $this->machine->push($type, 1, 1, $color);
    }
    function put($color, $type) {
        $this->machine->put($type, 1, 1, $color);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////


    function saction_resolve($type, $args) {
        $opinst = $this->getOperationInstance($type);
        return $opinst->action_resolve($args);
    }


    function uaction_playCard($args) {
        $card_id = $args["target"];
        $rules = $this->getRulesFor($card_id);
        $color = $this->getActivePlayerColor();
        $cost = $this->getRulesFor($card_id, "cost");
        $payment = $args["payment"] ?? "auto";
        if ($payment == "auto") {
            $this->machine->push("nm", $cost, $cost, $color, MACHINE_FLAG_UNIQUE);
        } else {
            $this->systemAssertTrue("Not supported payment");
        }
        $this->machine->push($rules, 1, 1, $color);
        if (startsWith($card_id, "card_stanproj")) {
            $this->notif()
                ->withToken($card_id)
                ->notifyAll(clienttranslate('${player_name} plays basic project ${token_name}'));
        } else {
            $this->dbSetTokenLocation(
                $card_id,
                "tableau_${color}",
                0,
                clienttranslate('${player_name} plays card ${token_name}'),
                [],
                $color
            );
        }
    }

    function uaction_discardCard($args) {
        $card_id = $args["token"];
        $op = $args["op_info"];
        $type = $op["type"];
        $owner = $op["owner"];
        $this->dbSetTokenLocation($card_id, "discard_main", 0, clienttranslate('${player_name} discards ${token_name}'), [], $owner);

        if ($type == "sell") {
            $this->effect_increaseCount($owner, "m", 1);
        }
    }



    //////////////////////////////////////////////////////////////////////////////
    //////////// Effects
    ////////////

    function effect_increaseCount($color, $type, $inc, $onlyCheck = false) {
        if (!$color) {
            $color = $this->getActivePlayerColor();
        }
        $counter = "tracker_${type}_${color}";
        if ($onlyCheck) {
            $good = $inc >= 0 ? true : $this->tokens->getTokenState($counter) > -$inc;
            if (!$good) {
                throw new Exception("Not enough resources to pay");
            }
            return;
        }
        $this->dbResourceInc($counter, $inc, '*', [], $this->getPlayerIdByColor($color));
    }
    function effect_increaseProduction(string $color, $type, $inc, $onlyCheck = false) {
        if (!$color) {
            $color = $this->getActivePlayerColor();
        }
        $token_id = "tracker_${type}_${color}";
        $min = $this->getRulesFor($token_id, 'min', 0);
        $current = $this->tokens->getTokenState($token_id);
        $cando = $inc >= 0 ? true : $current + $inc >= $min;
        if (!$cando) {
            throw new Exception("Not enough production to decrease");
        }
        if ($onlyCheck) {
            return true;
        }

        $value = $this->tokens->setTokenState($token_id, $current + $inc);
        if ($inc > 0)
            $message = clienttranslate('${player_name} increases ${token_name} by ${inc}');
        else
            $message = clienttranslate('${player_name} decreases ${token_name} by ${inc}');

        $this->notifyCounterDirect($token_id, $value, $message, [
            "inc" => $inc,
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
        $message = clienttranslate('${player_name} increases ${token_name} by ${inc} step/s');

        $this->notifyCounterDirect($token_id, $value, $message, [
            "inc" => $inc,
            "token_name" => $token_id,
        ], $this->getPlayerIdByColor($color));

        if ($value == $max) {
            $this->notif($color)
                ->withToken($token_id)
                ->notifyAll('Parameter ${token_name} is at max');
        }

        $this->effect_increaseProduction($color, "tr", $inc);
        return true;
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
            ],
            $color
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
                    if ($curr)
                        $this->dbResourceInc(
                            "tracker_h_${color}",
                            $curr,
                            clienttranslate('${player_name} gains ${inc_resource} due to heat transfer'),
                            [],
                            $this->getPlayerIdByColor($color)
                        );
                } elseif ($p == 'm') {
                    $curr = $this->tokens->getTokenState("tracker_tr_${color}");
                    $prod += $curr;
                }
                if ($prod) $this->effect_increaseCount($color, $p, $prod);
            }
        }
    }

    function effect_endOfTurn() {
        $this->effect_production();
        if ($this->isEndOfGameAchived()) {
            $this->machine->queue("lastforest");
            return null;
        }
        $this->machine->queue("research");
        return null;
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
            $res[$tokenid] = ["rejected" => $rejected];
        }
        return $res;
    }

    function filterPlayable($color, $keys) {
        return $this->createArgInfo($color, $keys, function ($color, $tokenid) {
            return  $this->playability($color, $tokenid);
        });
    }

    function arg_operation($op, $only_feasibility = false) {
        $type = $op["type"];
        $opinst = $this->getOperationInstance($type);
        return $opinst->arg($op, $only_feasibility);
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

    function executeOperationsMultiple($operations) {
        $this->systemAssertTrue("Wrong operation count", count($operations) > 1);
        return STATE_PLAYER_TURN_CHOICE;
    }

    function executeOperationSingleAtomic($op) {
        $type = $op["type"];
        $this->notifyMessage(clienttranslate('${player_name} executes ${operation_name}'), [
            "operation_name" => $this->getOperationName($type),
        ]);
        $opinst = $this->getOperationInstance($type);

        if ($opinst->auto($op["owner"], $op["count"])) {
            $this->machine->hide($op);
        } else {
            return STATE_PLAYER_TURN_CHOICE;
        }
        return null;
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
