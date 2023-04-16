<?php

declare(strict_types=1);


class AbsOperationProdNeg extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null) {
        $this->game->effect_increaseProduction($owner, substr($this->mnemonic, 1), -$inc);
        return true;
    }
}
