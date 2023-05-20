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

        if ($reservename) {
            $reshexes = $this->findReservedAreas($reservename);
            if (count($reshexes) == 0) {
                if (!$this->checkAdjRulesPasses($ohex, $color, $reservename)) {
                    return MA_ERR_PLACEMENT;
                }
            } else if (array_search($ohex, $reshexes) === false) {
                return MA_ERR_NOTRESERVED;
            }
        }
        if ($this->getTileType() == MA_TILE_MINING) {
            if (!$this->checkAdjRulesPasses($ohex, $color, "has_su")) {
                return MA_ERR_PLACEMENT;
            }
        }
        return 0;
    }

    protected function getTileId() {
        $card = $this->getContext();
        if ($card) {
            $num = getPart($card, 2);
            return "tile_$num";
        } else {
            return null;
        }
    }

    protected function debugtilecretae() {
        $tileid = $this->getTileId();
        if (!$tileid) throw new BgaSystemException("Cannot get context for tile placement operation");
        $tile = $this->game->tokens->getTokenInfo($tileid);
        if ($tile == null) {
            $this->game->tokens->createToken($tileid);
        }
    }

    function getTileType(): int {
        return (int)$this->game->getRulesFor($this->getTileId(), 'tt', MA_TILE_SPECIAL);
    }

    function effect(string $owner, int $inc): int {
        // DEBUG create tile on the fly
        $this->debugtilecretae();
        $tile = $this->effect_placeTile();

        // special handling for mining tiles
        if ($this->getTileType() == MA_TILE_MINING) {
            $ohex = $this->game->tokens->getTokenLocation($tile);
            $pp = $this->game->getProductionPlacementBonus($ohex);
            if ($pp) $this->game->putInEffectPool($owner, $pp, $tile);
            else throw new BgaVisibleSystemException("Location does not have resource bonus");
        }

        return 1;
    }
}
