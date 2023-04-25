<?php

declare(strict_types=1);

class AbsOperationProd extends AbsOperation {
    function isVoid(): bool {
        return false;
    }
    
    function effect(string $owner, int $inc): int  {
        $this->game->effect_incProduction($owner, $this->mnemonic, $inc);
        return $inc;
    }
}
