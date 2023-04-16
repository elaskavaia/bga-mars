<?php

declare(strict_types=1);

class AbsOperationIncNeg extends AbsOperation {
    function auto(string $owner, int $inc, array $args=null) {
        $this->game->effect_increaseCount($owner, substr($this->mnemonic,1), -$inc);
        return true;
    }
}
