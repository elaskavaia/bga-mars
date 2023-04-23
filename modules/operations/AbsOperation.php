<?php

declare(strict_types=1);

abstract class AbsOperation {
    public string $mnemonic;
    public PGameXBody $game;
    public ?string $params;
    // dynamic
    protected ?array $argresult; // hold the result when arg is called
    protected ?string $color;
    protected ?array $op_info;
    protected ?array $user_args;

    public function __construct(string $op, PGameXBody $game) {
        $this->mnemonic = $op;
        $this->game = $game;
        $this->argresult = null;
        $this->user_args = null;
    }

    function rules() {
        return $this->game->getOperationRules($this->mnemonic);
    }

    /** extra operation parameters passed statically, i.e. some(arg1) */
    function setParams($params) {
        $this->params = $params;
    }

    function isAutomatic() {
        $rules = $this->rules();
        if (isset($rules['params'])) return false;
        return true;
    }

    function canResolveAutomatically() {
        if ($this->isAutomatic()) return true;
        if ($this->user_args === null) return false;
        return true;
    }

    function setOpInfo($opInfo) {
        $this->op_info =  $opInfo;
    }

    function arg(array $op) {
        if ($this->argresult) {
            //if ($this->op_info['id'] != $op['id']) throw new Exception("op instances reused for anothger operaion");
            return $this->argresult;
        }
        $result = [];
        $this->argresult = &$result;
        $this->op_info =  $op;
        $this->color =  $op["owner"];

        $result["void"] = false;
        $result["ttype"] = $this->getPrimaryArgType(); // type of parameter to collect, default is token, can be player or someting else i.e. number
        $result["info"] = $this->argPrimaryDetails(); // detals map of primary param with explanation why it cannot be done, and extra stuff
        $result['target'] = $this->argPrimary(); // primary list of parameter to choose from in case of emum param (such as token)
        $result["void"] = $this->isVoid($op); // if action requires params but cannot be perform operation is void, depends on engine it either deail breaker or skip
        return $result;
    }

    public function getPrimaryArgType() {
        return 'token';
    }

    function argPrimaryDetails() {
        return [];
    }

    function argPrimary() {
        $res = [];
        foreach ($this->argresult["info"] as $target => $info) {
            if ($info['q'] == 0)  $res[] = $target;
        }
        return $res;
    }

    function getCheckedArg($key) {
        $args = $this->user_args;
        $this->game->systemAssertTrue("Missing user args", $args);
        $this->game->systemAssertTrue("Missing argument $key", array_key_exists($key, $args));
        $target = $args[$key];
        $possible_targets = $this->getStateArg($key, $args);
        $this->game->systemAssertTrue("Unathorized argument $key", $target === $possible_targets || array_search($target, $possible_targets) !== false);
        return $target;
    }

    function getStateArg($key) {
        $actionArgs = $this->getAllStateArgs();
        $this->game->systemAssertTrue("Missing argument $key", array_key_exists($key, $actionArgs));
        $target = $actionArgs[$key];
        return $target;
    }

    function getAllStateArgs() {
        return $this->arg($this->op_info);
    }

    function getOwner() {
        return  $this->color;
    }

    function getPlayerNo() {
        $owner = $this->getOwner();
        $playerId = $this->game->getPlayerIdByColor($owner);
        $no = $this->game->getPlayerNoById($playerId);
        return $no;
    }


    function isVoid($op): bool {
        $this->arg($op);
        return count($this->argresult['target']) == 0;
    }

    /**
     * This is user call, validate all parameters
     */
    function action_resolve(array $args): int {
        $op = $args["op_info"];
        $type = $op["type"];
        if ($type != $this->mnemonic) throw new BgaSystemException("Mismatched operation $type");
        // the actual acting player
        $owner =  $this->game->getPlayerColorById($this->game->getCurrentPlayerId());
        $inc = (int) ($op["resolve_count"] ?? $op["count"] ?? 1);
        $this->argresult = null;
        $this->op_info =  $op;
        $this->color =  $owner;
        $this->user_args =  $args;

        return $this->effect($owner, $inc, $args);
    }

    function auto(string $owner, int &$count): bool {
        $this->user_args = null;
        if (!$this->canResolveAutomatically()) return false; // cannot resolve automatically
        $count = $this->effect($owner, $count, null);
        return true;
    }

    protected function effect(string $owner, int $count): int {
        return 0; // cannot resolve automatically
    }
}
