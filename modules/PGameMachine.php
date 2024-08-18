<?php

/**
 * Base class for games that use DbTokens model and DbMachine
 *
 <code>
 
 require_once ('modules/PGameMachine.php');

 class BattleShip extends PGameMachine {
 }
 </code>
 *
 */

require_once "DbMachine.php";
require_once "PGameTokens.php";

define("CONTINUE_DISPATCH", null);
define("ABORT_DISPATCH", 98);
define("PLAYER_INPUT", 97);

abstract class PGameMachine extends PGameTokens {
    public $machine;

    function __construct() {
        parent::__construct();
        $this->machine = new DbMachine($this);
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////
    /*
     * In this space, you can put any utility methods useful for your game logic
     */

    function debug_initTables() {
        $this->DbQuery("DELETE FROM machine");
        parent::debug_initTables();
    }

    public function getMultiMachine() {
        return new DbMachine($this, 'machine', 'multi');
    }
    public function getOperationName($id) {
        return $this->getTokenName($this->getOperationToken($id));
    }

    public function getOperationToken($id) {
        return "op_$id";
    }

    public function getOperationRules($id, $field = "*", $def = null) {
        return $this->getRulesFor("op_$id", $field, $def);
    }

    public function isAtomicOperation($op) {
        $expr = $this->parseOpExpression($op);
        return $expr->isAtomic();
    }
    public function isSimpleOperation($op) {
        $expr = $this->parseOpExpression($op);
        return $expr->op == "!";
    }
    public function parseOpExpression($op) {
        return $this->machine->parseOpExpression($op);
    }

    function debug_dumpMachine() {
        $t = $this->machine->gettableexpr();
        $this->debugLog("all stack", ["t" => $t]);
        return $t;
    }
    function debug_dumpMachineDb() {
        $t = $this->machine->gettablearr();
        $this->debugLog("all stack", ["t" => $t]);
        return $t;
    }


    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////

    function action_confirm() {
        $this->gamestate->nextState("next");
    }

    function action_decline($args) {
        $operation_id = $args["op"];
        $curowner = $this->getCurrentPlayerColor();
        $res = $this->checkOperations([$operation_id], $curowner, $this->machine->getTopOperations($curowner));
        $this->systemAssertTrue("Illegal operation", $res && count($res) == 1);
        $this->machine->drop($res);
        $info = array_shift($res);
        $this->notifyMessage(clienttranslate('${player_name} declines ${operation_name}'), [
            "operation_name" => $this->getOperationName($info["type"]),
        ]);
        $this->gamestate->nextState("next");
    }

    function action_skip($args) {
        $operation_ids = array_get($args,"oparr",null);
        if ($operation_ids===null) $this->userAssertTrue("Old version of client is used. Reload user interface and try again");
        $curowner = $this->getCurrentPlayerColor();
        $res = $this->checkOperations($operation_ids, $curowner, $this->machine->getTopOperations($curowner));
        $this->machine->drop($res);
        $this->notifyMessage(clienttranslate('${player_name} skips rest of actions'));
        $this->gamestate->nextState("next");
    }

    function action_whatever() {
        $ops = $this->machine->getTopOperations();
        $this->machine->reflag($ops, MACHINE_FLAG_UNIQUE, MACHINE_FLAG_ORDERED);
        $this->gamestate->nextState("next");
    }

    function action_choose($args) {
        $operation_id = $args["op"];
        $info = $this->machine->info($operation_id);
        $this->systemAssertTrue("invalid param op passed in action_choose", $info);
        // XXX play with count here
        if ($this->machine->isSharedCounter($info)) {
            $this->machine->drop($this->machine->getTopRank());
        }
        $this->machine->renice($operation_id, 1);
        $this->notifyMessage(clienttranslate('${player_name} chooses ${operation_name}'), [
            "operation_name" => $this->getOperationName($info["type"]),
        ]);
        $this->gamestate->nextState("next");
    }

    function findOp($opId, array $ops) {
        foreach ($ops  as $topop) {
            if ($topop['id'] == $opId) {
                return $topop;
            }
        }
        return null;
    }

    function checkOperations($ops, $curPlayerColor, $tops = null) {
        $this->systemAssertTrue("Acting user must be a player", $curPlayerColor);
        $op_ids = [];
        if ($tops == null) $tops = $this->getTopOperationsState($curPlayerColor);
        foreach ($ops as $args) {
            if (is_numeric($args)) {
                $operation_id = $args;
            } else if (is_array($args)) {
                $operation_id = array_get($args,"op");
            } else {
                $this->userAssertTrue(totranslate("Illegal operation. Try again?"));
            }
          
            $info = $this->findOp($operation_id, $tops);
            $this->userAssertTrue(totranslate("Illegal operation. Try again?"), $info);

            $color = $info["owner"];
            if ($color === null) {
                // ignore
            } else if ($color != $curPlayerColor) {
                $this->userAssertTrue("Illegal operation owner. Try again?", $info); 
            }

            $op_ids[] = $operation_id;
        }
        return $this->machine->infos($ops);
    }

    /**
     * Resolve one or more operation and pass all arguments for its execution
     *
     * @param array $args
     *            $args['op'] the id of operation from db
     */
    function action_resolve($ac_args) {
        $this->checkAction('resolve');
        $operations_resolve = $ac_args["ops"];
        $currentPlayer = $this->getCurrentPlayerId();
        $curowner = $this->getCurrentPlayerColor();
        $this->systemAssertTrue("Acting user must be a player", $curowner);
        $tops = $this->getTopOperationsState($curowner);
        $this->systemAssertTrue('Nothing is on stack', count($tops));
        $client_args = $this->arg_operations($tops);
        //$this->machine->interrupt();
        foreach ($operations_resolve as $args) {
            $operation_id = $args["op"];
            $info = $this->findOp($operation_id, $tops);
            //$this->error("error resolvig op $operation_id ".toJson($tops)." ".toJson($args));
            $this->systemAssertTrue("Illegal operation. Refresh and try again?", $info);
      


            $color = $info["owner"];
            if ($color === null) {
                $color = $curowner;
                $info["owner"] = $color;
            }
            // now we will call method for specific user action
            //$this->debug_dumpMachine();
            $client_op_args = $this->findOp($operation_id, $client_args['operations']);
            if (array_get($client_op_args, 'args.postpone', false)) {
                $this->userAssertTrue(totranslate('Cannot choose this operation before any that can fail'));
            }
            $count = $this->saction_resolve($info, $args);
            // stack operations
            $this->saction_stack($count, $info, $tops);
            //$this->debug_dumpMachine();
            // $this->debugConsole("",           $this->machine->gettablearr());
        }
        $this->machine->normalize();
        // $this->debugLog("- done resolve", ["t" => $this->machine->gettableexpr()]);
        if ($this->isInMultiplayerMasterState()) {
            $this->machineMultiplayerDistpatchPrivate($currentPlayer);
        } else {
            $this->gamestate->nextState("next");
        }
    }

    function saction_resolve($opinfo, $args): int {
        $this->systemAssertTrue("Not implemented resolve");
        return 0;
    }


    function saction_stack(int $count, array $info,  ?array $tops = null) {
        $this->machine->resolve($info, $count, $tops);
        return;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state arguments
    ////////////
    function arg_operations($operations = null) {
        $result = [];
        if (!$operations) {
            $operations = $this->machine->getTopOperations();
        }
        $one = reset($operations);
        $flags = $this->machine->getResolveType($one);
        $xop = $this->machine->toStringFlags($flags);

        $result["op"] = $xop;
        $result["operations"] = [];
        foreach ($operations as $i => $op) {
            $id = $i; // array_get($op,'id', $i);
            $result["operations"][$id] = $this->arg_operationMassage($id, $op);
        }
        return $result;
    }

    function arg_operationMassage($id, $op) {
        $result = $op;
        $result["args"] = $this->arg_operation($op);
        return $result;
    }

    abstract public function arg_operation($op);

    function arg_multiplayerChoice($player_id) {
        $res = [];
        $color = $this->getPlayerColorById($player_id);
        $operations = $this->getTopOperationsMulti($color);
        $res['player_operations'][$player_id] = $this->arg_operations($operations);
        return $res;
    }
    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////

    public function isInMultiplayerMasterState() {
        return $this->gamestate->isMutiactiveState();
    }

    function getTopOperationsState($owner) {
        if ($this->isInMultiplayerMasterState()) {
            return  $this->getTopOperationsMulti($owner);
        } else {
            return  $this->getTopOperations();
        }
    }

    function getTopOperations($owner = null) {
        $operations = $this->machine->getTopOperations($owner);
        return $operations;
    }

    function getTopOperationsMulti($owner = null) {
        $operations = $this->machine->getTopOperations($owner, 'multi');
        if (count($operations) > 0) {
            $barrank  = $this->machine->getBarrierRank();
            if ($barrank > 0) {
                $op = reset($operations);
                if ($op['rank'] > $barrank) return [];
            }
        }
        return $operations;
    }


    function hasMultiPlayerOperations($operations) {
        if (count($operations) > 0) {
            $op = reset($operations);
            return $op['pool'] == 'multi';
        }
        return false;
    }


    function machineDistpatch() {
        $n = MA_GAME_DISPATCH_MAX; // <-- this is just a precasious for inf loop, it this goes over user get a prompt after
        for ($i = 0; $i <  $n; $i++) {
            $operations = $this->getTopOperations();

            $isMulti = $this->hasMultiPlayerOperations($operations);
            //$this->debugLog("-DISPATCH $i: machine top: isMulti=$isMulti " . $this->machine->getlistexpr($operations));

            if ($isMulti) {
                $this->gamestate->nextState("multiplayer");
                return;
            }

            if (count($operations) == 0) {
                $nextState = $this->machineExecuteDefault();
            } else {
                $nextState = $this->machineExecuteOperations($operations);
            }

            if ($nextState !== null) {
                if ($nextState == ABORT_DISPATCH) return; // client did the transition
                $this->gamestate->jumpToState($nextState);
                return;
            }
        }
        $this->gamestate->nextState("confirm");
    }


    function machineMultiplayerDistpatch() {
        $operations = $this->getTopOperationsMulti();
        //$this->debugLog("-MULTI: machine top: isMulti=$isMulti " . $this->machine->getlistexpr($operations));
        if (count($operations) == 0) {
            $this->gamestate->nextState("next");
            return;
        }
        $this->gamestate->setAllPlayersMultiactive();

        $players = $this->loadPlayersBasicInfos();
        foreach ($players as $player_id => $player_info) {
            $this->machineMultiplayerDistpatchPrivate($player_id);
        }
    }

    function machineMultiplayerDistpatchPrivate($player_id) {
        $color = $this->getPlayerColorById($player_id);
        $n = MA_GAME_DISPATCH_MAX;
        for ($i = 0; $i <  $n; $i++) {
            $operations = $this->getTopOperationsMulti($color);
            $isMulti = $this->hasMultiPlayerOperations($operations);
            //$this->debugLog("- SINGLE $i: machine top for $color: " . $this->machine->getlistexpr($operations));
            if (!$isMulti) {
                $this->gamestate->unsetPrivateState($player_id);
                $this->gamestate->setPlayerNonMultiactive($player_id, "next");
                break;
            }
            $this->gamestate->setPlayersMultiactive([$player_id], "next", false);
            $nextState = $this->machineExecuteOperations($operations);

            if ($nextState === null) continue;
            break;
        }
    }

    function machineExecuteDefault() {
        $this->systemAssertTrue("Not implemented machineExecuteDefault");
    }
    function machineExecuteOperations($operations) {
        $this->systemAssertTrue("Cannot find operation to execute", count($operations) > 0);

        $machine = $this->machine;
        $isSingle = count($operations) == 1;
        foreach ($operations as $op) {
            if ($machine->isOrdered($op) || $isSingle) {
                return $this->executeOperationSingle($op);
            }

            if ($machine->isSharedCounter($op) && $this->canSkipChoice($op)) {
                //$type = $op["type"];
                //$this->debugLog("-removed $type as void");
                $machine->hide($op);
                return CONTINUE_DISPATCH;
            }
        }
        // choice has to be made
        return $this->activatePlayerAndSwitchToState($operations);
    }

    function executeOperationSingle($op) {
        if ($this->expandOperation($op, null)) {
            $this->machine->hide($op);
            return CONTINUE_DISPATCH;
        }
        if ($this->executeAttemptAutoResolve($op)) {
            return CONTINUE_DISPATCH;
        }
        return $this->activatePlayerAndSwitchToState([$op]);
    }


    function expandOperation($op, $count) {

        $type = $op["type"];
        if ($count !== null) {
            // user resolved the count
            $this->machine->checkValidCountForOp($op, $count);
            $op['count'] = $count;
            $op['mcount'] = $count;
        }
        if (!$this->isAtomicOperation($type) && $op['count'] == $op['mcount']) {

            $this->machine->interrupt();
            $this->machine->expandOp($op);

            //$this->machine->hide($op);
            // sanity to prevent recursion
            $operations = $this->machine->getTopOperations();
            if (count($operations) == 0) {
                $this->systemAssertTrue("Failed expand for $type. Nothing");
            }

            // restore orignal rank
            //$this->machine->renice($operations, $op['rank']);

            $nop = array_shift($operations);
            if ($nop["type"] == $type && $nop['mcount'] == $op['mcount'] && $nop['count'] == $op['count']) {
                $this->systemAssertTrue("Failed expand for $type. Recursion");
            }
            return true;
        }
        return false;
    }

    function activatePlayerAndSwitchToState($operations) {
        $this->systemAssertTrue("Missing", count($operations) > 0);
        $op = reset($operations);
        $owner = $op["owner"];
        if ($this->isZombiePlayer($owner)) {
            $this->machine->hide($operations);
            return CONTINUE_DISPATCH;
        }

        if ($this->isInMultiplayerMasterState()) {
            $this->switchActivePlayerIfNeeded($owner);
            $player_id = $this->getPlayerIdByColor($owner);
            $this->gamestate->initializePrivateState($player_id);
            return ABORT_DISPATCH;
        }
        $userState = $this->getStateForOperations($operations);
        if (!$userState)  return CONTINUE_DISPATCH;
        $this->switchActivePlayerIfNeeded($owner);
        $this->gamestate->jumpToState($userState);
        return ABORT_DISPATCH;
    }

    function executeAttemptAutoResolve($op) {
        return false;
    }

    function getStateForOperations($operations) {
        return PLAYER_INPUT;
    }

    function switchActivePlayerIfNeeded($player_color) {
        if (!$player_color) return;
        $player_id = $this->getPlayerIdByColor($player_color);
        if (!$player_id) return;
        if ($this->isZombiePlayer($player_id)) return;

        if ($this->isInMultiplayerMasterState()) {
            if (!$this->gamestate->isPlayerActive($player_id)) {
                $this->gamestate->setPlayersMultiactive([$player_id], "notpossible", false);
            }
            $this->giveExtraTime($player_id);
            return;
        }
        $active_player = $this->getActivePlayerId();

        if ($active_player != $player_id || $this->isZombiePlayer($active_player)) {
            $this->setNextActivePlayerCustom($player_id);
            $this->undoSavepoint();
        } else {
            $this->giveExtraTime($active_player);
        }
    }

    /** Can operation be auto-skipped because its void */
    public function canSkipChoice($op) {
        return false;
    }

    public function debug_push($type, $count = 1, $owner = null) {
        $this->machine->push($type, $count, $count, $owner);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
    public function debug_pushopt($type, $count = 1, $owner = null) {
        $this->machine->push($type, 0, $count, $owner);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
}
