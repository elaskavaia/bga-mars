<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_forest extends AbsOperationTile {
    private $ownerAdjMap = null;

    function checkPlacement($color, $location, $info, $map) {
        $reservename = $this->getReservedArea();
        if ($reservename == 'ocean') {
            if (!isset($info['ocean'])) return MA_ERR_NOTRESERVED;
            return 0;
        }
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        $adj = $this->calculateOwnerAdjMap($map);
        if (count($adj) == 0 || array_key_exists($location, $adj)) {
            // no adjecent places or in the map
            return 0;
        }


        return MA_ERR_FORESTPLACEMENT;
    }

    protected function getPrompt() {
        $prompt = parent::getPrompt();
        $reservename = $this->getReservedArea();
        if ($reservename == 'ocean') {
            return clienttranslate('${you} must select a location to place a Greenery tile ON AN AREA RESERVED FOR OCEAN');
        }
        return  $prompt;
    }
    function calculateOwnerAdjMap($map) {
        if ($this->ownerAdjMap) return $this->ownerAdjMap;
        $color = $this->color;
        $this->ownerAdjMap = [];

        foreach ($map as $ohex => $xinfo) {
            $adj = $this->game->getAdjecentHexes($ohex, $map);
            foreach ($adj as $hex) {
                if (array_get($map[$hex], 'owner') == $color) {
                    $this->ownerAdjMap[$ohex] = 1;
                    break;
                }
            }
        }
        return  $this->ownerAdjMap;
    }

    function getTileType(): int {
        return MA_TILE_FOREST;
    }

    function effect(string $owner, int $inc): int {
        $tile = $this->effect_placeTile();
        $this->game->incTrackerValue($owner, 'land');
        $this->game->incTrackerValue($owner, 'forest');
        $this->game->effect_increaseParam($owner, "o", $inc);
        $this->game->notifyEffect($owner, 'place_forest', $tile);
        return 1;
    }
}
