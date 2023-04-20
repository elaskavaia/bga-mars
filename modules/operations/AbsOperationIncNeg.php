<?php

declare(strict_types=1);

class AbsOperationIncNeg extends AbsOperation {
    function auto(string $owner, int $inc, array $args=null): bool {
        $this->game->effect_incCount($owner, substr($this->mnemonic,1), -$inc);
        return true;
    }
}
