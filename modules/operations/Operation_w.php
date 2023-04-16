<?php

declare(strict_types=1);

// place ocean
class Operation_w extends AbsOperation {
    function argPrimaryInfo(string $color, array $op = null) {
        $keys = ['map_1_2','map_2_2'];
        return $this->game->createArgInfo($color, $keys, function ($a, $b) {
            return 0;
        });
    }

    function arg(array $op, bool $only_feasibility = false) {

        $result = parent::arg($op, $only_feasibility);
        $result['object'] = 'tile_3_11'; // ocean to place
        return $result;
    }

    function auto(string $owner, int $inc, array $args = null) {
        if ($args===null) return false;// cannot auto resolve
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc);
        return true;
    }
}
