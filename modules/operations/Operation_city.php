<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_city extends AbsOperationTile {
    function checkPlacement($color, $location, $info) {
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        return 0;
    }

    function getTileType(): int {
        return 2;
    }

    function auto(string $owner, int $inc, array $args = null): bool {
        if ($args === null) return false; // cannot auto resolve
        $this->effect_placeTile($args);
        $this->game->incTrackerValue($owner, 'city');
        $this->game->incTrackerValue($owner, 'land');
        return true;
    }
}
