<?php

declare(strict_types=1);

class Operation_q extends AbsOperation {

    function getPrimaryArgType() {
        return '';
    }

    function effect(string $owner, int $inc): int {
        $this->game->queue($owner, implode("/", ['m', 's', 'u', 'p', 'e', 'h'] ));
        return 1;
    }
}
