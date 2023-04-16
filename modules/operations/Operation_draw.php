<?php

declare(strict_types=1);

class Operation_draw extends AbsOperation {
    function auto(string $color, int $inc, array $args = null) {
        $this->game->effect_draw($color, "deck_main", "hand_${color}", $inc);
        return true;
    }
}
