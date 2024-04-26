<?php

declare(strict_types=1);

class Operation_cardpre extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->noValidTargets()) return 1; // skip this
        $card_id = $this->getCheckedArg('target', false);
        $this->game->put($color, 'cardx', $card_id);
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params('hand');
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_prelude_","${location}_${color}"));
        return $this->game->filterPlayable($color, $keys);
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }

    function canSkipChoice() {
        return false;
    }
}
