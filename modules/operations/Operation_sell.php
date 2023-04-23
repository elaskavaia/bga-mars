<?php

declare(strict_types=1);

require_once "Operation_discard.php";
class Operation_sell extends Operation_discard {
    function effect(string $color, int $inc): int {
        if (parent::effect($color, $inc) == 1) {
            $this->game->effect_incCount($color, "m", 1);
            return 1;
        }
        return 0;
    }
}
