<?php

declare(strict_types=1);

class Operation_o extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc);
        return $inc;
    }
}
