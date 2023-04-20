<?php

declare(strict_types=1);


class Operation_discard extends AbsOperation {
    function auto(string $color, int $inc, array $args = null): bool {
        if ($args == null) return false;
        $card_id = $this->getCheckedArg('target', $args);
        $this->game->dbSetTokenLocation($card_id, "discard_main", 0, clienttranslate('${player_name} discards ${token_name}'), [], $color);
        return true;
    }

    function argPrimaryInfo(string $color, array $op = null) {
        $keys = array_keys($this->game->tokens->getTokensInLocation("hand_${color}"));
        return $this->game->createArgInfo($color, $keys, function ($a, $b) {
            return 0;
        });
    }
}
