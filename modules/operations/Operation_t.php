<?php

declare(strict_types=1);


class Operation_t extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc, 2);
        return $inc;
    }
}
