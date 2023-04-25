<?php

declare(strict_types=1);

class AbsOperationIncNegAny extends AbsOperation {

    function argPrimary() {
        $keys = $this->game->getPlayerColors();
        return $keys;
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function canResolveAutomatically() {
        return false;
    }

    function effect(string $owner, int $inc): int  {
        $owner = $this->getCheckedArg('target');
        $opwithoutN = substr($this->mnemonic, 1);
        $this->game->effect_incProduction($owner, $opwithoutN, -$inc);
        return $inc;
    }
}
