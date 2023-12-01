<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_city extends AbsOperationTile {
    function getTileType(): int {
        return MA_TILE_CITY;
    }

    function effect(string $owner, int $inc): int {
        $this->effect_placeTile();
        return 1;
    }
}
