<?php

declare(strict_types=1);

class Operation_city extends AbsOperation {
    function argPrimaryInfo(string $color, array $op = null) {
        $keys = ['hex_5_3'];
        return $this->game->createArgInfo($color, $keys, function ($a, $b) {
            return 0;
        });
    }

    function arg(array $op, bool $only_feasibility = false) {
        $result = parent::arg($op, $only_feasibility);
        // free tile
        $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_2", null, 0);
        $result['object'] = $tile['key'];
        return $result;
    }

    function auto(string $owner, int $inc, array $args = null): bool {
        if ($args === null) return false; // cannot auto resolve
        $target = $this->getCheckedArg('target', $args);
        $actionArgs = $this->getStateArgsFromUserArgs($args);
        $object = $actionArgs['object'];
        $this->game->dbSetTokenLocation($object, $target, 1);
        $this->game->setTrackerValue('','city');
        return true;
    }
}
