<?php

declare(strict_types=1);

// place an abstract tile
abstract class AbsOperationTile extends AbsOperation {
    protected $map = null;
    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->getPlanetMap();
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $hex) use ($map) {
            $info = $map[$hex];
            if (array_key_exists('tile', $info)) return MA_ERR_OCCUPIED;
            return $this->checkPlacement($color, $hex, $info, $map);
        });
    }
    function arg() {
        $result = parent::arg();
        $result['object'] = $this->getTileId();
        return $result;
    }

    protected function getPlanetMap() {
        if ($this->map != null) return $this->map;
        $this->map = $this->game->getPlanetMap();
        return $this->map;
    }

    protected function getTileId() {
        $type = $this->getTileType();
        $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_$type", null, 0);
        return $tile['key'];
    }

    protected function getReservedArea(): ?string {
        return $this->params;
    }

    protected function isAdjecentHexesOfType($what, $towhat = 0, $ownwer = null) {
        return count($this->getAdjecentHexesOfType($what, $towhat, $ownwer)) > 0;
    }

    protected function getAdjecentHexesOfType($what, $towhat = 0, $ownwer = null) {
        $map = $this->getPlanetMap();
        return $this->game->getAdjecentHexesOfType($map, $what, $towhat, $ownwer);
    }

    protected function findReservedAreas($names): array {
        $res = [];
        $map = $this->getPlanetMap();
        $names_arr = explode(',', $names);
        foreach ($names_arr as $name) {
            foreach ($map as $hex => $hexinfo) {
                if ($hexinfo['name'] == trim($name)) {
                    $res[] = $hex;
                    break;
                }
            }
        }
        return $res;
    }

    function checkPlacement($color, $location, $info, $map) {
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        return 0;
    }

    abstract function getTileType(): int;

    function effect_placeTile() {
        $no = $this->getPlayerNo();
        $target = $this->getCheckedArg('target');
        $object = $this->getStateArg('object');
        $otype = getPart($object, 1);
        if ($otype == MA_TILE_OCEAN) $no = -1;
        $this->game->dbSetTokenLocation($object, $target, $no);
        $bonus = $this->game->getRulesFor($target, 'r');
        if ($bonus) {
            $this->game->debugLog("-placement bonus $bonus");
            $this->game->put($this->getOwner(), $bonus);
        }

        $map = $this->getPlanetMap();
        $adj = $this->game->getAdjecentHexes($target, $map);

        foreach ($adj as $hex) {
            if (array_get($map[$hex], 'owno') == -1) {
                // ocean bonus
                $this->game->put($this->getOwner(), "2m");
            }
        }
        return $object;
    }
}
