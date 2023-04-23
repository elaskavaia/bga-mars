<?php

declare(strict_types=1);

class AbsOperationIncNeg extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incCount($owner, substr($this->mnemonic,1), -$inc);
        return $inc;
    }
}
