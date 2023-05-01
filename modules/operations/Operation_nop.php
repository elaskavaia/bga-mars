<?php

declare(strict_types=1);

// This does absolutely nothing, enjoy!
class Operation_nop extends AbsOperation {
    function canResolveAutomatically() {
        return false;
    }

    function effect(string $color, int $inc): int {
        $this->game->notifyMessage('');
        return 1;
    }
}
