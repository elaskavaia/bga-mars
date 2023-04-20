<?php

declare(strict_types=1);

class AbsOperationProdNeg extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null): bool {
        $this->game->effect_incProduction($owner, substr($this->mnemonic, 1), -$inc);
        return true;
    }
}
