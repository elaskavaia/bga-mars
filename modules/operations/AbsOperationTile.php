<?php

declare(strict_types=1);

// place an abstract tile
abstract class AbsOperationTile extends AbsOperation {

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->getPlanetMap();
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $hex) use ($map) {
            $info = $map[$hex];
            if (array_key_exists('tile', $info)) return MA_ERR_OCCUPIED;
            $claimer = array_get($info, 'claimed');
            if ($claimer && $claimer !== $color) {
                return MA_ERR_RESERVED;
            }
            return $this->checkPlacement($color, $hex, $info, $map);
        });
    }
    function arg() {
        $result = parent::arg();
        $result['object'] = $this->getTileId();
        return $result;
    }

    protected function getPlanetMap() {
        return $this->game->getPlanetMap();
    }

    protected function getTileId() {
        $type = $this->getTileType();
        $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_${type}_", null, 0);
        if (!$tile) {
            // XXX can be removed later
            $count = count($this->game->tokens->getTokensOfTypeInLocation("tile_${type}_"));
            $count+=1;
            $this->game->tokens->createToken("tile_${type}_$count");
            $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_${type}_", null, 0);
        }
        if (!$tile) throw new BgaSystemException("Cannot find tile of type $type");
        return $tile['key'];
    }

    protected function getReservedArea(): ?string {
        return $this->params;
    }

    protected function isAdjecentHexesOfType($what, $towhat = 0, $ownwer = null) {
        return count($this->getAdjecentHexesOfType($what, $towhat, $ownwer)) > 0;
    }

    protected function getAdjecentHexesOfType($what, $towhat = 0, $ownwer = null) {
        return $this->game->getAdjecentHexesOfType($what, $towhat, $ownwer);
    }


    protected function checkAdjRulesPasses($ohex, $color, $rule) {
        if (!$rule) return true;
        $count = $this->game->evaluateAdj($color, $ohex, $rule);
        if (!$count) return false;
        return true;
    }


    protected function findReservedAreas($names): array {
        $res = [];
        if (!$names) return $res;
        $map = $this->getPlanetMap();
        $names_arr = explode(',', $names);
        foreach ($names_arr as $name) {
            $nname = trim($name);
            if (!$nname) continue;
            foreach ($map as $hex => $hexinfo) {
                if ($hexinfo['name'] === $nname) {
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
        $target = $this->getCheckedArg('target');
        $object = $this->getStateArg('object');

        $this->game->effect_placeTile($this->color, $object, $target);
        return $object;
    }
}
