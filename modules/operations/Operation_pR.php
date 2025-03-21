<?php

declare(strict_types=1);

class Operation_pR extends AbsOperation {
    
    function effect(string $owner, int $inc): int  {
        $this->game->effect_incProduction($owner, $this->mnemonic, $inc, ['reason_tr' => $this->getReason()]);
        return $inc;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    function getPrimaryArgType() {
        return '';
    }
}
