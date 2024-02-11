<?php

declare(strict_types=1);

class Operation_pR extends AbsOperation {
    
    function effect(string $owner, int $inc): int  {
        $this->game->effect_incProduction($owner, $this->mnemonic, $inc);
        return $inc;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    protected function getPrimaryArgType() {
        return '';
    }
}
