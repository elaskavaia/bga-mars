<?php

declare(strict_types=1);

class AbsOperationIncNegAny extends AbsOperation {

    function argPrimary(string $color, array $op = null, array &$result = null) {
        $keys = $this->game->getPlayerColors();
        return $keys;
    }

    function auto(string $owner, int $inc, array $args = null): bool {
        if ($args === null) return false;
        $owner = $this->getCheckedArg('player', $args);
        $opwithoutN = substr($this->mnemonic, 1);
        $this->game->effect_incProduction($owner, $opwithoutN, -$inc);
        return true;
    }
}
