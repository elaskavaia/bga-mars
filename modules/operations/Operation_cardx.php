<?php

declare(strict_types=1);


class Operation_cardx extends AbsOperation {
    
    function effect(string $color, int $inc): int {
        $this->game->effect_playCard($color, $this->getContext());
        return 1;
    }
    function getPrimaryArgType() {
        return '';
    }
}
