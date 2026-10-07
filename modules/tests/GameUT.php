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
    // override/stub methods here that access db and stuff
}
