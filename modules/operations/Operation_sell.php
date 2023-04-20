<?php

declare(strict_types=1);

require_once "Operation_discard.php";
class Operation_sell extends Operation_discard {
    function auto(string $color, int $inc, array $args = null): bool {
        if (parent::auto($color, $inc, $args) == true) {
            $this->game->effect_incCount($color, "m", 1);
            return true;
        }
        return false;
    }
}
