<?php

declare(strict_types=1);

class Operation_discard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $this->game->effect_moveCard($color, $card_id, "discard_main", 0, clienttranslate('${player_name} discards a card'));
        return 1;
    }

    function canResolveAutomatically() {
        return false;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensInLocation("hand_${color}"));
        return $keys;
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }
}
