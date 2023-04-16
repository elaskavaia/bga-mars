<?php

declare(strict_types=1);


class AbsOperationProd extends AbsOperation {
    function isVoid($op, $args = null) {
        return false;
    }
    
    function auto(string $owner, int $inc, array $args = null) {
        $this->game->effect_increaseProduction($owner, $this->mnemonic, $inc);
        return true;
    }
}
