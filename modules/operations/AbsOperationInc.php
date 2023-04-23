<?php

declare(strict_types=1);


class AbsOperationInc extends AbsOperation {
    function isVoid($op, $args = null): bool {
        return false;
    }

    function effect(string $owner, int $inc): int {
        $this->game->effect_incCount($owner, $this->mnemonic, $inc);
        return $inc;
    }
}
