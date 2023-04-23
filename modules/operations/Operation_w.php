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

    function effect(string $owner, int $inc): int  {
        if ($inc != 1) throw new feException("Cannot use counter $inc for this operation");
        $this->effect_placeTile();
        $this->game->effect_increaseParam($owner, "w", 1);
        return 1;
    }
}
