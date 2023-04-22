<?php

declare(strict_types=1);


class Operation_stan extends AbsOperation {
    function auto(string $color, int $inc, array $args = null): bool {
        if ($args==null) return false;
        $this->game->uaction_playCard($args); // XXX
        
        return true;
    }

    function argPrimaryDetails(string $color, array $op = null, array &$result = null) {
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_stanproj", "display_main"));
        return $this->game->filterPlayable($color, $keys);
    }
}
