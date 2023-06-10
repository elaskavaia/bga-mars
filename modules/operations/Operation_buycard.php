<?php

declare(strict_types=1);


class Operation_buycard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $this->game->executeImmediately($color, 'nm', 3);
        $this->game->dbSetTokenLocation($card_id, "hand_$color", MA_CARD_STATE_SELECTED, clienttranslate('${player_name} buys a card'), [],  $this->game->getPlayerIdByColor($color));
        return 1;
    }

    function isVoid(): bool {
        if ($this->getMinCount() == 0) return false;
        if ($this->noValidTargets()) return true;
        return $this->game->isVoidSingle("3nm", $this->color);
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensInLocation("draw_${color}"));
        $hasmoney = !$this->game->isVoidSingle("3nm", $color);

        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($hasmoney) {
            if ($hasmoney) return 0;
            return MA_ERR_COST;
        });
    }


    function canResolveAutomatically() {
        return false;
    }
}
