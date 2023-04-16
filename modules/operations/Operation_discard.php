<?php

declare(strict_types=1);


class Operation_discard extends AbsOperation {
    function auto(string $color, int $inc, array $args = null) {
        if ($args==null) return false;
        $this->game->uaction_discardCard($args); // XXX

        return true;
    }

    function argPrimaryInfo(string $color, array $op = null) {
        $keys = array_keys($this->game->tokens->getTokensInLocation("hand_${color}"));
        return $this->game->createArgInfo($color, $keys, function ($a, $b) {
            return 0;
        });
    }
}
