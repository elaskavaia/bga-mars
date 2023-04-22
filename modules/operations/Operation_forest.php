<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

// place forest
class Operation_forest extends AbsOperationTile {
    function checkPlacement($color, $location, $info) {
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        return 0;
    }

    function getTileType(): int {
        return 1;
    }

    function auto(string $owner, int $inc, array $args = null): bool {
        if ($args === null) return false; // cannot auto resolve
        $this->effect_placeTile($args);
        $this->game->incTrackerValue($owner, 'land');
        $this->game->effect_increaseParam($owner, "o", $inc);
        return true;
    }
}
