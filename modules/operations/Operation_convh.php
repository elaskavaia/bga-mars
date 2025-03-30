<?php

declare(strict_types=1);


class Operation_convh extends AbsOperation {
    function argPrimary() {
        $color = $this->color;
        $keys = ["tracker_h_$color"];
        return $keys;
    }

    function effect(string $color, int $inc): int {
        $cost = $this->getCost();
        $this->game->push($color, "{$cost}nh:t", "op_convh");

        return 1;
    }

    function getCost() {
        return 8;
    }

    function noValidTargets(): bool {
        $color = $this->color;
        $cost = $this->getCost();
        return $this->game->isVoidSingle("{$cost}nh", $color);
    }

    function getPrimaryArgType() {
        return 'token';
    }
}
