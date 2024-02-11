<?php

declare(strict_types=1);


class Operation_convp extends AbsOperation {
    function argPrimary() {
        $color = $this->color;
        $keys = ["tracker_p_$color"];
        return $keys;
    }

    function effect(string $color, int $inc): int {
        $cost = $this->getCost();
        $this->game->push($color, "${cost}np:forest");
        return 1;
    }

    function getCost() {
        if ($this->game->playerHasCard($this->color, 'card_corp_3')) return 7;
        return 8;
    }

    function isVoid(): bool {
        $color = $this->color;
        $cost = $this->getCost();
        return $this->game->isVoidSingle("${cost}np", $color) || $this->game->isVoidSingle("forest", $color);
    }
    protected function getPrimaryArgType() {
        return 'token';
    }
}
