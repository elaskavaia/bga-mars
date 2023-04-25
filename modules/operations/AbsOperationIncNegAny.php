<?php

declare(strict_types=1);

class AbsOperationIncNegAny extends AbsOperation {

    function argPrimary() {
        $keys = $this->game->getPlayerColors();
        $keys[] = 'none';
        return $keys;
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function canResolveAutomatically() {
        return false;
    }


    function effect(string $owner, int $inc): int {
        $owner = $this->getCheckedArg('target');
        if ($owner == 'none') return $inc; // skipped, this is ok for resources
        $opwithoutN = substr($this->mnemonic, 1);
        $this->game->effect_incCount($owner, $opwithoutN, -$inc, ['ifpossible' => true]);
        return $inc;
    }
}
