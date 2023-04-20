<?php

declare(strict_types=1);


class Operation_t extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null):bool {
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc * 2);
        return true;
    }
}
