<?php

declare(strict_types=1);

require_once "AbsOperationTile.php";

class Operation_forest extends AbsOperationTile {
    private $ownerAdjMap = null;

    function checkPlacement($color, $location, $info, $planetmap) {
        $rc = $this->checkPlacementNonAdj($info);
        if ($rc) {
            return $rc;
        }

        if ($this->checkMandatoryEffect($color, $location)) {
            return MA_ERR_MANDATORYEFFECT;
        }

        if ($this->getReservedArea() == "ocean") {
            return MA_OK; // no other adj rules in this case
        }
        $adj = $this->calculateOwnerAdjMap($planetmap);
        if (count($adj) == 0 || array_key_exists($location, $adj)) {
            // no adjecent places or in the map
            return MA_OK;
        }
        return MA_ERR_FORESTPLACEMENT;
    }

    function checkPlacementNonAdj($info) {
        $reservename = $this->getReservedArea();
        if ($reservename == "ocean") {
            if (!isset($info["ocean"])) {
                return MA_ERR_NOTRESERVED;
            }
            return MA_OK;
        }
        if (isset($info["ocean"])) {
            return MA_ERR_RESERVED;
        }
        if (isset($info["reserved"])) {
            return MA_ERR_RESERVED;
        }

        return MA_OK;
    }

    protected function getPrompt() {
        $prompt = parent::getPrompt();
        $reservename = $this->getReservedArea();
        if ($reservename == "ocean") {
            return clienttranslate('${you} must select a location to place a Greenery tile ON AN AREA RESERVED FOR OCEAN');
        }
        return $prompt;
    }
    function calculateOwnerAdjMap($map) {
        if ($this->ownerAdjMap) {
            return $this->ownerAdjMap;
        }
        $color = $this->color;
        $this->ownerAdjMap = [];

        foreach ($map as $ohex => $xinfo) {
            if (array_get($xinfo, "owner") == $color) {
                $adj = $this->game->getAdjecentHexes($ohex, $map);
                foreach ($adj as $hex) {
                    $info = $map[$hex];
                    if ($this->checkPlacementNonAdj($info) == MA_OK && $this->checkOccupied($info) == MA_OK) {
                        $this->ownerAdjMap[$hex] = 1;
                    }
                }
            }
        }

        return $this->ownerAdjMap;
    }

    function getTileType(): int {
        return MA_TILE_FOREST;
    }

    function effect(string $owner, int $inc): int {
        $tile = $this->effect_placeTile();
        $this->game->incTrackerValue($owner, "forest");

        if ($this->game->getGameStateValue("gamestage") < MA_STAGE_LASTFOREST) {
            $this->game->effect_increaseParam($owner, "o", $inc);
        }

        $this->game->triggerEffect($owner, "place_forest", $tile);
        return 1;
    }
}
