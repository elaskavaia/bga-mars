<?php

declare(strict_types=1);
require_once "AbsOperationTile.php";

// place ocean
class Operation_w extends AbsOperationTile {
    function checkPlacement($color, $location, $info) {
        if (!isset($info['ocean'])) return MA_ERR_NOTRESERVED;
        return 0;
    }

    function getTileType(): int {
        return 3;
    }

    function auto(string $owner, int $inc, array $args = null): bool {
        if ($args === null) return false; // cannot auto resolve
        $this->effect_placeTile($args);
        $this->game->effect_increaseParam($owner, "w", $inc);
        return true;
    }
}
