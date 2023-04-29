<?php

declare(strict_types=1);


class Operation_cardx extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->effect_cardInPlay($color, $this->getContext());
        return 1;
    }
}
