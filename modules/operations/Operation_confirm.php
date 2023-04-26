<?php

declare(strict_types=1);

class Operation_confirm extends AbsOperation {
    function isVoid(): bool {
        return false; // cannot auto-resolve this
    }

    function canResolveAutomatically() {
        return false;
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        $this->game->notifyMessage('');
        return 1;
    }
}
