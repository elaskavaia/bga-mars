<?php

declare(strict_types=1);

abstract class AbsOperation {
    protected string $mnemonic; // main operation mnemonic (i.e np_Any)
    public PGameXBody $game; // game ref
    public string $params; // extra operation params, static, i.e when res(card_22) in this case card_22 is param (static only)
    // dynamic
    protected ?array $argresult; // hold the result when arg is called (cache)
    protected string $color; // owner of the operation (the target player)
    protected array $op_info; // database structure for operation
    protected ?array $user_args; // data sent by user during action

    public function __construct(string $type, array $opinfo, PGameXBody $game) {
        $this->mnemonic =  stripslashes($type);
        $this->game = $game;
        $this->argresult = null;
        $this->user_args = null;
        $this->op_info =  $opinfo;
        $owner =  $opinfo["owner"];
        $this->color =  is_string($owner) ? $owner  : '0';
        $this->params =  '';
    }

    /**
     * Copy of translation function for conviniene, this can only be user for error message in exceptions
     */
    function _($str) {
        return $this->game->_($str);
    }

    // --------------------- GETTERS AND SETTERS


    function rules() {
        return $this->game->getOperationRules($this->mnemonic);
    }




    public function getMnemonic() {
        return $this->mnemonic;
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

    protected function getPlayerId() {
        $owner = $this->getOwner();
        $playerId = $this->game->getPlayerIdByColor($owner);
        return $playerId;
    }

    protected function getContext($index = 0) {
        $data = $this->op_info['data'] ?? '';
        if (!$data) return $data;
        $split = explode(':', $data);
        return array_get($split, $index, ''); // context of effect
    }

    protected function getMinCount(): int {
        return (int) ($this->op_info['mcount'] ?? $this->getCount());
    }

    protected function getCount(): int {
        $count =  (int) ($this->op_info['count'] ?? 1);
        return $count;
    }

    function isOptional() {
        if ($this->getMinCount() == 0)  return true;
        return false;
    }

    /** extra operation parameters passed statically, i.e. some(arg1) */
    function setParams($params) {
        if ($params && startsWith($params, "'")) {
            $params = MathLexer::unquote($params);
        }
        $this->params = $params;
    }


    // ---------------------- BEHAVIOR MODIFIERS

    function isFullyAutomated() {
        $rules = $this->rules();
        if (isset($rules['ack']))
            return false;

        return true;
    }

    /**
     * When OR choice and action cannot be done it can be skipped, sometime its questionable so operation can opt-out from this
     */
    function canSkipChoice() {
        return $this->isVoid();
    }

    /**
     * Operation has no side affect is it only affect one counter, and cannot have cascading side effects
     */
    function hasNoSideEffects(): bool {
        return false;
    }


    function canResolveAutomatically() {
        if ($this->isFullyAutomated()) return true;
        if ($this->getMinCount() == 0) return false;
        if ($this->getMinCount() != $this->getCount()) return false;
        if ($this->isOneChoice()) return true; // can be perf for prompt
        return false;
    }


    /** Operation is void is it has no valid target, however optional operation is never void because it can be skipped */
    function isVoid(): bool {
        if ($this->isOptional()) return false;
        if ($this->noValidTargets()) return true;
        return false;
    }


    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['info']) > 0 && count($arg['target']) == 0;
    }


    protected function isOneChoice(): bool {
        $result  = $this->arg();
        return count($result['target']) == 1;
    }

    // --------------------- CLIENT VISUALIZATON

    /**
     * Arguments for visual formatting. These are used to format string "prompt" an "button" on client side
     */
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

    protected function getSkipButtonName() {
        return clienttranslate("Done");
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

    // --------------------- PLAYER INPUT


    function arg() {
        if ($this->argresult) {
            return $this->argresult; // cached
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
        if ($this->isOptional()) {
            $result["skipname"] = $this->getSkipButtonName();
        }
        if (!$this->isFullyAutomated()) {
            $result["ack"] = 1; // prompt required
        }
        return $result;
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
            if ($target === $possible_targets) return $possible_targets;
            $index = array_search($target, $possible_targets);
            $this->game->systemAssertTrue("Unauthorized argument $key", $index !== false);
            return $possible_targets[$index];
        } else if ($this->isOneChoice()) {
            if (is_array($possible_targets)) return array_shift($possible_targets);
            return $possible_targets;
        } else {
            $this->game->userAssertTrue("Operation is not allowed by the rules", false, "Missing user args for $type " . toJson($args));
            return null;
        }
    }
    protected function getUncheckedArg($key) {
        $args = $this->user_args;
        return array_get($args, $key, null);
    }

    public function getStateArg($key) {
        $actionArgs = $this->getAllStateArgs();
        $this->game->systemAssertTrue("Missing argument $key", array_key_exists($key, $actionArgs));
        $target = $actionArgs[$key];
        return $target;
    }

    protected function getAllStateArgs() {
        return $this->arg();
    }

    function getUserCount(): ?int {
        if (!$this->user_args) return null;
        return  (int) ($this->user_args["count"] ??  $this->op_info["count"] ?? 1);
    }


    // --------------------- RESOLVING
    /**
     * This is user call, validate all parameters
     */
    function action_resolve(array $args): int {
        $this->user_args =  $args;
        // the actual acting player
        $actor =  $this->game->getPlayerColorById($this->game->getCurrentPlayerId());
        $owner = $this->color;
        if ($owner != $actor) {
            if (!$owner)
                $owner = $actor;
        }
        $this->argresult = null; // XXX not sure
        $this->color =  $owner;

        $this->checkVoid();
        return $this->effect($owner, $this->getUserCount(), $args);
    }

    public function checkIntegrity() {
        // self check of action integrity, some actions may not be costructed freely
        return true;
    }

    protected function checkVoid() {
        if ($this->isVoid()) {
            $op = $this->mnemonic;
            $usertarget = $args['target'] ?? '';
            $this->game->userAssertTrue(totranslate("This move is not allowed by the rules"),  $usertarget, "Operation is void $op");
            $info = $this->arg()['target'];
            $infotarget = array_get($info, $usertarget);
            $err = $infotarget['q'];
            $this->game->userAssertTrue("Operation cannot be executed, err code $err"); /// XXX proper strings
        }
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
