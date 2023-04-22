<?php

declare(strict_types=1);

class Operation_tr extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null): bool {
        $this->game->effect_incTerraformingRank($owner, $inc);
        return true;
    }
}
