<?php

declare(strict_types=1);

class AbsOperationIncNegAny extends AbsOperation {

    function argPrimaryInfo(string $color, array $op = null) {
        $keys = $this->game->getPlayerColors();
        $keys [] = 'none';
        return $this->game->createArgInfo($color, $keys, function ($color, $key) {
            return 0;
        });
    }

    function auto(string $owner, int $inc, array $args = null): bool {
        if ($args === null) return false;
        $owner = $this->getCheckedArg('player', $args);
        if ($owner == 'none') return true; // skipped, this is ok for resources
        $opwithoutN = substr($this->mnemonic, 1);
        $this->game->effect_incCount($owner, $opwithoutN, -$inc, ['ifpossible' => true]);
        return true;
    }
}
