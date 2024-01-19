<?php

declare(strict_types=1);


class AbsOperationInc extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incCount($owner, $this->mnemonic, $inc);
        return $inc;
    }

    function hasNoSideEffects(): bool {
        return true;
    }
}
