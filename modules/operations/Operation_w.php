<?php

declare(strict_types=1);
require_once "AbsOperationTile.php";

// place ocean
class Operation_w extends AbsOperationTile {
    function checkPlacement($color, $location, $info, $map) {
        $reservename = $this->getReservedArea();
        if ($reservename == 'notocean') {
            if (isset($info['ocean'])) return MA_ERR_RESERVED;
            return 0;
        }
        if (!isset($info['ocean'])) return MA_ERR_NOTRESERVED;
        return 0;
    }

    function getTileType(): int {
        return MA_TILE_OCEAN;
    }

    function effect(string $owner, int $inc): int {
        //if ($inc != 1) throw new feException("Cannot use counter $inc for this operation");
        $tile = $this->effect_placeTile();
        $this->game->effect_increaseParam($owner, "w", 1);
        $this->game->notifyEffect($owner, 'place_ocean', $tile);

        //special handling card_main_188
        if ($this->getContext() == 'card_main_188') {
            $target = $this->getCheckedArg('target');
            $this->game->putInEffectPool($owner, 'acard188', $target);
        }

        return 1;
    }
}
