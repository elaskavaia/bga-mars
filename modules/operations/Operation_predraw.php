<?php

declare(strict_types=1);

class Operation_predraw extends AbsOperation {
    function effect(string $color, int $inc): int {
        $deck = $this->params('main');
        $this->game->effect_draw($color, "deck_$deck", "draw_$color", $inc);
        return $inc;
    }

    function getPrimaryArgType() {
        return '';
    }
}
