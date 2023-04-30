<?php

declare(strict_types=1);

class Operation_draw extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->effect_draw($color, "deck_main", "hand_${color}", $inc);
        return $inc;
    }

    function canResolveAutomatically() {
        return false;
    }
}
