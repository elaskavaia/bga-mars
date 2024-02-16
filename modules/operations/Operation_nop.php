<?php

declare(strict_types=1);

// This does absolutely nothing, enjoy!
class Operation_nop extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->notifyMessage('');
        return 1;
    }


    function hasNoSideEffects(): bool {
        return true;
    }

    function getPrimaryArgType() {
        return '';
    }
}
