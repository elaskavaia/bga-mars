<?php

declare(strict_types=1);

abstract class AbsOperation {
    public string $mnemonic;
    public PGameXBody $game;
    public string $params;
    // dynamic
    protected ?array $argresult; // hold the result when arg is called
    protected string $color;
    protected array $op_info;
    protected ?array $user_args;

    public function __construct(string $type, array $opinfo, PGameXBody $game) {
        $this->mnemonic =  stripslashes($type);
        $this->game = $game;
        $this->argresult = null;
        $this->user_args = null;
        $this->op_info =  $opinfo;
        $this->color =  $opinfo["owner"];
        $this->params =  '';
    }

    function _($str) {
        return $this->game->_($str);
    }

    function rules() {
        return $this->game->getOperationRules($this->mnemonic);
    }

    /** extra operation parameters passed statically, i.e. some(arg1) */
    function setParams($params) {
        if ($params && startsWith($params, "'")) {
            $params = MathLexer::unquote($params);
        }
        $this->params = $params;
    }

    function isFullyAutomated() {
        $rules = $this->rules();
        if (isset($rules['params'])) return false;
        return true;
    }

    function canResolveAutomatically() {
        if ($this->isFullyAutomated()) return true;
        if ($this->isOneChoice()) return true; // can be perf for prompt
        return false;
    }

    function arg() {
        if ($this->argresult) {
            //if ($this->op_info['id'] != $op['id']) throw new Exception("op instances reused for anothger operaion");
            return $this->argresult;
        }
        $result = [];
        $this->argresult = &$result;
        $result["ttype"] = $this->getPrimaryArgType(); // type of parameter to collect, default is token, can be player or someting else i.e. number
        $result["info"] = $this->argPrimaryDetails(); // detals map of primary param with explanation why it cannot be done, and extra stuff
        $result['target'] = $this->argPrimary(); // primary list of parameter to choose from in case of emum param (such as token)
        $result["void"] = $this->isVoid(); // if action requires params but cannot be perform operation is void, depends on engine it either deail breaker or skip
        $result["prompt"] = $this->getPrompt();
        $result["button"] = $this->getButtonName();
        $result["args"] = $this->getVisargs();
        return $result;
    }

    protected function isOneChoice(): bool {
        $result  = $this->arg();
        return count($result['target']) == 1;
    }

    protected function getVisargs() {

        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
        ];
    }



    protected function getPrimaryArgType() {
        return 'token';
    }
    protected function getButtonName() {
        if ($this->getCount() == 1) return '${name}';
        return clienttranslate('${name} x ${count}');
    }

    protected function getOpName() {
        $rules = $this->rules();
        if ($rules) return $rules['name'];
        return $this->mnemonic;
    }

    protected function getPrompt() {
        $rules = $this->rules();
        return  $rules['prompt'] ?? clienttranslate('${you} must confirm');
    }

    protected function argPrimaryDetails() {
        return [];
    }

    protected function argPrimary() {
        $res = [];
        foreach ($this->argresult["info"] as $target => $info) {
            if ($info['q'] == 0)  $res[] = $target;
        }
        return $res;
    }

    protected function getCheckedArg($key) {
        $args = $this->user_args;
        $type = $this->mnemonic;

        $possible_targets = $this->getStateArg($key);
        if ($args && array_key_exists($key, $args)) {
            $target = $args[$key];
            $this->game->systemAssertTrue("Unathorized argument $key", $target === $possible_targets || array_search($target, $possible_targets) !== false);
        } else if ($this->isOneChoice()) {
            if (is_array($possible_targets)) return array_shift($possible_targets);
            return $possible_targets;
        } else {
            $this->game->systemAssertTrue("Missing user args for $type", $args);
        }
        return $target;
    }

    protected function getStateArg($key) {
        $actionArgs = $this->getAllStateArgs();
        $this->game->systemAssertTrue("Missing argument $key", array_key_exists($key, $actionArgs));
        $target = $actionArgs[$key];
        return $target;
    }

    protected function getAllStateArgs() {
        return $this->arg($this->op_info);
    }

    protected function getOwner() {
        return  $this->color;
    }

    protected function getPlayerNo() {
        $owner = $this->getOwner();
        $playerId = $this->game->getPlayerIdByColor($owner);
        $no = $this->game->getPlayerNoById($playerId);
        return $no;
    }


    protected function getContext() {
        return $this->op_info['data'] ?? ''; // context of effect
    }

    protected function getMinCount(): int {
        return (int) ($this->op_info['mcount'] ?? $this->getCount());
    }

    protected function getCount(): int {
        $count =  (int) ($this->op_info['count'] ?? 1);
        return $count;
    }

    function isVoid(): bool {
        //if ($this->isFullyAutomated()) return false;
        if ($this->getMinCount() == 0) return false;
        if ($this->noValidTargets()) return true;
        return false;
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['info']) > 0 && count($arg['target']) == 0;
    }

    /**
     * This is user call, validate all parameters
     */
    function action_resolve(array $args): int {
        $this->user_args =  $args;

        // the actual acting player
        $owner =  $this->game->getPlayerColorById($this->game->getCurrentPlayerId());
        if ($this->color && $this->color !== $owner) {
            $this->game->systemAssertTrue("Not autorized for this operation");
        }
        $this->argresult = null; // XXX not sure
        $this->color =  $owner;

        $this->checkVoid();
        return $this->effect($owner, $this->getUserCount(), $args);
    }

    protected function checkVoid() {
        if ($this->isVoid()) {
            $op = $this->mnemonic;
            $usertarget = $args['target'] ?? '';
            $this->game->systemAssertTrue("Operation cannot be executed '$op'",  $usertarget);
            $info = $this->arg()['target'];
            $infotarget = array_get($info, $usertarget);
            $err = $infotarget['q'];
            $this->game->userAssertTrue("Operation cannot be executed, err code $err"); /// XXX proper strings
        }
    }

    function getUserCount(): ?int {
        if (!$this->user_args) return null;
        return  (int) ($this->user_args["count"] ??  $this->op_info["count"] ?? 1);
    }

    function auto(string $owner, int &$count): bool {
        $this->user_args = null;
        if (!$this->canResolveAutomatically()) return false; // cannot resolve automatically
        $this->checkVoid();
        $count = $this->effect($owner, $count, null);
        return true;
    }

    protected function effect(string $owner, int $count): int {
        return 0; // cannot resolve automatically
    }
}
