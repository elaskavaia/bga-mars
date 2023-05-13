<?php

declare(strict_types=1);


class Operation_keep extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $this->game->dbSetTokenLocation($card_id, "hand_$color", 0, clienttranslate('${player_name} keeps a card'), [],  $this->game->getPlayerIdByColor($color));
        return 1;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensInLocation("draw_${color}"));
        return $keys;
    }


    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }


    function canResolveAutomatically() {
        return false;
    }
}
