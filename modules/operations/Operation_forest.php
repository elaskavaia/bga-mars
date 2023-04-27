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

    function effect(string $owner, int $inc): int  {
        $tile = $this->effect_placeTile();
        $this->game->incTrackerValue($owner, 'land');
        $this->game->effect_increaseParam($owner, "o", $inc);
        $this->game->notifyEffect($owner,'place_forest',$tile);
        return 1;
    }
}
