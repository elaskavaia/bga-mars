<?php

declare(strict_types=1);

class Operation_predraw extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->effect_draw($color, "deck_main", "draw_${color}", $inc);
        return $inc;
    }
}
