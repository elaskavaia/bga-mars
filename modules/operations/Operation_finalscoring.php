<?php

declare(strict_types=1);

class Operation_finalscoring extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_finalScoring();
        return 1;
    }
}
