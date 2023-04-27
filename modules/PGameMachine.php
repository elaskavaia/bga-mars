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
        $expr = OpExpression::parseExpression($op);
        return $expr->isAtomic();
    }
    public function isSimpleOperation($op) {
        $expr = OpExpression::parseExpression($op);
        return $expr->op == "!";
    }

    function debug_dumpMachine() {
        $this->debugConsole("", ["all stack", $this->machine->gettableexpr()]);
    }


    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////

    function action_undo() {
        // unchecked
        $this->undoRestorePoint();
    }

    function action_confirm() {
        $this->gamestate->nextState("next");
    }

    function action_decline($args) {
        $operation_id = $args["op"];
        $info = $this->machine->info($operation_id);
        $this->machine->drop($info);
        $this->notifyMessage(clienttranslate('${player_name} declines ${operation_name}'), [
            "operation_name" => $this->getOperationName($info["type"]),
        ]);
        $this->gamestate->nextState("next");
    }

    function action_skip($args) {
        $this->machine->drop($this->machine->getTopOperations());
        $this->notifyMessage(clienttranslate('${player_name} skips rest of actions'));
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

    /**
     * Resolve one or more operation and pass all arguments for its execution
     *
     * @param array $args
     *            $args['op'] the id of operation from db
     */
    function action_resolve($ac_args) {
        $operations_resolve = $ac_args["ops"];
        $tops = $this->machine->getTopOperations();
        $this->machine->interrupt();
        foreach ($operations_resolve as $args) {
            $operation_id = $args["op"];
            $info = $this->machine->info($operation_id);
            $this->debugConsole("- resolve op " . $info['type'], $args);


            $color = $info["owner"];
            if ($color === null) {
                $color = $this->getActivePlayerColor(); // XXX?
                $info["owner"] = $color;
            }
            // now we will call method for specific user action

            //$this->debug_dumpMachine();
            $count = $this->saction_resolve($info, $args);
            // stack operations
            $this->saction_stack($count, $info, $tops);
            //$this->debug_dumpMachine();
            // $this->debugConsole("",           $this->machine->gettablearr());
        }
        $this->machine->normalize();
        $this->debugConsole("- done resolve", [$this->machine->gettableexpr()]);
        $this->gamestate->nextState("next");
    }

    function saction_resolve($opinfo, $args): int {
        $this->systemAssertTrue("Not implemented resolve");
        return 0;
    }


    function saction_stack(int $count, array $info, array $tops) {
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

        $result["op"]= $xop;
        foreach ($operations as $id => $op) {
            $result["operations"][$id] = $op;
            $result["operations"][$id]["args"] = $this->arg_operation($op);
            $result["operations"][$id]["typeexpr"] = null;
            try {
                $result["operations"][$id]["typeexpr"] = OpExpression::arr($op["type"]);
            } catch (Throwable $e) {
                $result["operations"][$id]["typerr"] = $e;
            }
        }
        return $result;
    }

    abstract public function arg_operation($op);
    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////

    function machineDistpatch($dispatcherState, $bailState) {
        $n = 20;
        while ($n-- > 0) {
            $operations = $this->machine->getTopOperations();
            $this->warn("$n: machine top: " . $this->machine->getlistexpr($operations));

            if (count($operations) == 0) {
                $nextState = $this->machineExecuteDefault();
            } else {
                $nextState = $this->machineExecuteOperations($operations);
            }

            if ($nextState && $nextState != $dispatcherState) {
                $this->gamestate->jumpToState($nextState);
                return;
            }
        }
        $this->gamestate->jumpToState($bailState);
    }

    function machineExecuteDefault() {
        $this->systemAssertTrue("Not implemented machineExecuteDefault");
    }
    function machineExecuteOperations($operations) {
        $this->systemAssertTrue("Cannot find operation to execute", count($operations) > 0);
        if (count($operations) > 1) {
            foreach ($operations as $op) {
                if ($this->machine->isOrdered($op)) {
                    return $this->executeOperationSingle($op);
                }

                if ($this->isVoid($op)) {
                    $type = $op["type"];
                    $this->debugConsole("-removed $type as void");
                    $this->machine->hide($op);
                    return null;
                }
            }
            // choice
            return $this->executeOperationsMultiple($operations);
        }

        $op = array_shift($operations);
        return $this->executeOperationSingle($op);
    }

    function executeOperationSingle($op) {
        if ($this->expandOperation($op, null)) {
            $this->machine->hide($op);
            return null;
        }
        return $this->executeOperationSingleAtomic($op);
    }

    function expandOperation($op, $count) {
        $type = $op["type"];
        if ($count!==null) {
            // user resolved the count
            $this->machine->checkValidCountForOp($op,$count);
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
            $nop = array_shift($operations);
            if ($nop["type"] == $type && $nop['mcount'] == $op['mcount'] && $nop['count'] == $op['count']) {
                $this->systemAssertTrue("Failed expand for $type. Recursion");
            }
            return true;
        }
        return false;
    }

    abstract public function executeOperationsMultiple($operations);

    abstract public function executeOperationSingleAtomic($op);

    abstract public function isVoid($op);

    public function debug_push($type, $count = 1, $owner = null) {
        $this->machine->push($type, $count, $count, $owner);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
    public function debug_pushopt($type, $count = 1, $owner = null) {
        $this->machine->push($type, 0, $count, $owner);
        $this->gamestate->jumpToState(STATE_GAME_DISPATCH);
    }
}
