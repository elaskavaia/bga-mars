<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_tile extends AbsOperationTile {
    function checkPlacement($color, $ohex, $info, $map) {
        $reservename = $this->getReservedArea();
        if ($reservename == 'ocean') {
            if (!isset($info['ocean'])) return MA_ERR_NOTRESERVED;
            return 0;
        }
        if (isset($info['ocean'])) return MA_ERR_RESERVED;

        if (!$reservename) {
            return 0;
        } else {
            if ($this->checkAdjRulesPasses($ohex, $color, $reservename)) {
                return 0;
            }
            return MA_ERR_PLACEMENT;
        }
        return 0;
    }

    protected function checkAdjRulesPasses($ohex, $color, $rule) {
        if (!$rule) return true;
        switch ($rule) {
            case 'adj_city':
                return $this->isAdjecentHexesOfType($ohex, MA_TILE_CITY);
            case 'adj_forest':
                return $this->isAdjecentHexesOfType($ohex, MA_TILE_FOREST);
            case 'adj_ocean':
                return $this->isAdjecentHexesOfType($ohex, MA_TILE_OCEAN);
            case 'adj_own':
                return $this->isAdjecentHexesOfType($ohex, 0, $color);
            default:
                throw new BgaSystemException("Unknown rule $rule");
        }
    }

    protected function getTileId() {
        $card = $this->getContext();
        if ($card) {
            $num = getPart($card, 2);
            $tile = $this->game->tokens->getTokenInfo("tile_$num");
        } else {
            return null;
        }

        if ($tile == null) {
            $this->game->tokens->createToken("tile_$num");
            return "tile_$num";
        }
        return $tile['key'];
    }

    function getTileType(): int {
        return MA_TILE_SPECIAL;
    }

    function effect(string $owner, int $inc): int {
        $tile = $this->effect_placeTile();
        $this->game->incTrackerValue($owner, 'land');
        $this->game->notifyEffect($owner, 'place_tile', $tile);
        return 1;
    }
}
