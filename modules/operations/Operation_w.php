<?php

declare(strict_types=1);

class Operation_w extends AbsOperation {

    function argPrimaryInfo(string $color, array $op = null) {
        $keys = ['fake'];
        return $this->game->createArgInfo($color, $keys, function ($a, $b) {
            return 0;
        });
    }

    function auto(string $owner, int $inc, array $args = null) {
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc);
        return true;
    }
}
