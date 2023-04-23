<?php

declare(strict_types=1);

class AbsOperationProdNeg extends AbsOperation {
    function effect(string $owner, int $inc): int  {
        $this->game->effect_incProduction($owner, substr($this->mnemonic, 1), -$inc);
        return $inc;
    }
}
