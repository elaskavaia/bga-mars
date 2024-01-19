<?php

declare(strict_types=1);

class Operation_tr extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incTerraformingRank($owner, $inc);
        return $inc;
    }

    function hasNoSideEffects(): bool {
        return true;
    }
}
