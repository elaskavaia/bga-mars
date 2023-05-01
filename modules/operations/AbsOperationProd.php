<?php

declare(strict_types=1);

class AbsOperationProd extends AbsOperation {
    
    function effect(string $owner, int $inc): int  {
        $this->game->effect_incProduction($owner, $this->mnemonic, $inc);
        return $inc;
    }
}
