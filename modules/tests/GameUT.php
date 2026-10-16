<?php

declare(strict_types=1);

require_once "terraformingmars.game.php";
require_once "TokensInMem.php";

define("PCOLOR", "008000");
define("BCOLOR", "0000ff");

class GameUT extends terraformingmars {
    var $multimachine;
    var $xtable;
    var $map_number = 0;
    var $var_colonies = 0;
    function __construct() {
        include "./material.inc.php";
        include "./states.inc.php";
        parent::__construct();
        $this->_setPlayerBasicInfoFromColors([PCOLOR, BCOLOR]);
        $this->gamestate->_setStates($machinestates);

        $this->tokens = new TokensInMem();
        $this->xtable = [];
        $this->machine = new MachineInMem($this, "machine", "main", $this->xtable);
        $this->multimachine = new MachineInMem($this, "machine", "multi", $this->xtable);
        $this->_setCurrentPlayerId(array_key_first($this->loadPlayersBasicInfos()));
    }

    function init(int $map = 0, int $colonies = 0) {
        $this->map_number = $map;
        $this->var_colonies = $colonies;
        $this->adjustedMaterial(true);
        $this->createTokens();
        $this->gamestate->changeActivePlayer((int)$this->getCurrentPlayerId());
        $this->gamestate->jumpToState(STATE_PLAYER_TURN_CHOICE);
        return $this;
    }

    function clean_cache() {
        $this->map = null;
    }

    function getMapNumber() {
        return $this->map_number;
    }

    function isColoniesVariant() {
        return $this->var_colonies;
    }

    function setListeners(array $l) {
        $this->eventListners = $l;
    }

    function getMultiMachine() {
        return $this->multimachine;
    }

    function fakeUserAction($op, $target = null, bool $no_stack = false) {
        $args = ["op_info" => $op];
        if ($target !== null) {
            $args["target"] = $target;
        }
        $count = $this->saction_resolve($op, $args);
        if ($no_stack) {
            return $count;
        }
        $this->saction_stack($count, $op);
        return $count;
    }

    function getAllDatasForTest() {
        return $this->getAllDatas();
    }

    var $barriers = [];
    function undoSavepointWithLabel($label = "", $barrier = 1) {
        if ($barrier) {
            $this->barriers[] = $label;
        }
        parent::undoSavepointWithLabel($label, $barrier);
    }

    /** every top op is postponed or mandatory and void, i.e. resolve, skip and decline all fail */
    function isStuck(): bool {
        $tops = $this->machine->getTopOperations();
        if (!$tops) {
            return false;
        }
        $args = $this->arg_operations($tops)["operations"];
        foreach ($tops as $i => $op) {
            if (array_get($args[$i], "args.postpone")) {
                continue;
            }
            $inst = $this->getOperationInstance($op);
            if ($inst->isOptional() || !$inst->isVoid()) {
                return false;
            }
        }
        return true;
    }

    /** top op of this type carries the postpone mark, fails the test when it is not on top */
    function isPostponed(string $type): bool {
        $tops = $this->machine->getTopOperations();
        $args = $this->arg_operations($tops)["operations"];
        foreach ($tops as $i => $op) {
            if ($op["type"] == $type) {
                return (bool) array_get($args[$i], "args.postpone");
            }
        }
        throw new BgaSystemException("no top op $type");
    }

    /** stuck, but no undo barrier crossed, so undo gets out of it */
    function isSoftBlocked(): bool {
        return count($this->barriers) == 0 && $this->isStuck();
    }

    /** stuck after an undo barrier, so undo cannot get out of it */
    function isHardBlocked(): bool {
        return count($this->barriers) > 0 && $this->isStuck();
    }
    // override/stub methods here that access db and stuff
}
