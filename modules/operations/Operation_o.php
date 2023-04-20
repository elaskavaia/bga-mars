<?php

declare(strict_types=1);

class Operation_o extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null):bool {
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc);
        return true;
    }
}
