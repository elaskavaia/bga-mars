<?php

declare(strict_types=1);

require_once "Operation_discard.php";
class Operation_sell extends Operation_discard {
    function effect(string $color, int $inc): int {
        $actual = parent::effect($color, $inc);
        $this->game->effect_incCount($color, "m", $actual);
        return $actual;
    }

}
