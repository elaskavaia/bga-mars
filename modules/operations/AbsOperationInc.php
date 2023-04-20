<?php

declare(strict_types=1);


class AbsOperationInc extends AbsOperation {
    function isVoid($op, $args = null): bool {
        return false;
    }
    
    function auto(string $owner, int $inc, array $args = null): bool {
        $this->game->effect_incCount($owner, $this->mnemonic, $inc);
        return true;
    }
}
