<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_city extends AbsOperationTile {
    function checkPlacement($color, $ohex, $info, $map) {
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        $reservename = $this->getReservedArea();
        if (!$reservename) {
            $others = count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY));;
            if ($others > 0) return MA_ERR_CITYPLACEMENT;
        } else {
            $reshexes = $this->findReservedAreas($reservename);
            if (count($reshexes) == 0) {
                if ($this->checkAdjRulesPasses($ohex, $color, $reservename)) {
                    return 0;
                }
                return MA_ERR_ALREADYUSED;
            }
            if (array_search($ohex, $reshexes) === false) {
                return MA_ERR_NOTRESERVED;
            }
        }
        return 0;
    }

    function getTileType(): int {
        return MA_TILE_CITY;
    }

    function effect(string $owner, int $inc): int {
        $tile = $this->effect_placeTile();
        $this->game->incTrackerValue($owner, 'city');
        $this->game->notifyEffect($owner, 'place_city', $tile);
        return 1;
    }
}
