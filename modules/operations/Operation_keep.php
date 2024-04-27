<?php

declare(strict_types=1);

class Operation_keep extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $this->game->effect_moveCard($color, $card_id, "hand_$color", MA_CARD_STATE_SELECTED, clienttranslate('You keep ${token_name}'));
        $this->game->notifyCounterChanged("hand_$color", ["nod" => true]);
        return 1;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main", "draw_${color}"));
        return $keys;
    }

    function getPrimaryArgType() {
        return 'token';
    }


    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }


    function canResolveAutomatically() {
        return false;
    }
}
