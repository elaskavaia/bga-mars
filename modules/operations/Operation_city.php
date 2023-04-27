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

    function effect(string $owner, int $inc): int  {
        $tile = $this->effect_placeTile();
        $this->game->incTrackerValue($owner, 'city');
        $this->game->incTrackerValue($owner, 'land');
        $this->game->notifyEffect($owner,'place_city',$tile);
        return 1;
    }
}
