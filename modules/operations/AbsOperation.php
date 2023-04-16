<?php

declare(strict_types=1);

abstract class AbsOperation {
    public string $mnemonic;
    public PGameXBody $game;

    public function __construct(string $op, PGameXBody $game) {
        $this->mnemonic = $op;
        $this->game = $game;
    }

    function rules() {
        return $this->game->getOperationRules($this->mnemonic);
    }

    function arg(array $op, bool $only_feasibility = false) {
        $result = [];
        $color = $op["owner"];
        $result["void"] = false;

        $primary = $this->argPrimaryArgName();

        $result["info"] = $this->argPrimaryInfo($color, $op);
        $result[$primary] = [];
        foreach ($result["info"] as $target => $info) {
            if ($info['rejected'] == 0)  $result[$primary][] = $target;
        }

        $result["void"] = $this->isVoid($op, $result);
        return $result;
    }

    function argPrimaryArgName() {
        $params = array_get( $this->rules(),'params','');
        if (!$params) {
            return "target";
        }
        $params_arr = explode(",", $params);
        $primary = $params_arr[0];
        return $primary;
    }

    function argPrimaryInfo(string $owner, array $op = null) {
        return [];
    }


    function isVoid($op, $args = null) {
        if (!$args) $args = $this->arg($op, true);
        $primary = $this->argPrimaryArgName();
        return count($args[$primary]) == 0;
    }

    /**
     * This is user call, validate all parameters
     */
    function action_resolve(array $args) {
        $op = $args["op_info"];
        $type = $op["type"];
        if ($type != $this->mnemonic) throw new BgaSystemException("Mismatched operation $type");
        $owner = $op["owner"];
        $inc = $op["resolve_count"] ?? $op["count"];
        return $this->auto($owner, $inc, $args);
    }

    function auto(string $owner, int $count, array $args = null) {
        return false; // cannot resolve automatically
    }
}
