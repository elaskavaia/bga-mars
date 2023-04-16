<?php

declare(strict_types=1);

require_once "Operation_discard.php";
class Operation_sell extends Operation_discard {
    function auto(string $color, int $inc, array $args = null) {
        if ($args==null) return false;
        $this->game->uaction_discardCard($args); // XXX
        
        return true;
    }
}
