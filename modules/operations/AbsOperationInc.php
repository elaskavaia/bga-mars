<?php

declare(strict_types=1);


class AbsOperationInc extends AbsOperation {
    function isVoid($op, $args = null) {
        return false;
    }
    
    function auto(string $owner, int $inc, array $args = null) {
        $this->game->effect_increaseCount($owner, $this->mnemonic, $inc);
        return true;
    }
}
