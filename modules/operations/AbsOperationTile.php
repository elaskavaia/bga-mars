<?php

declare(strict_types=1);

// place an abstract tile
abstract class AbsOperationTile extends AbsOperation {
    protected $tile_id = null;

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->getPlanetMap();
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $hex) use ($map) {
            $info = $map[$hex];
            $rc = $this->checkOccupied($info);
            if ($rc) return $rc;
            return $this->checkPlacement($color, $hex, $info, $map);
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }
    
    function arg() {
        $result = parent::arg();
        $result['object'] = $this->getTileId();
        return $result;
    }

    function checkOccupied($info) {
        $color = $this->color;
        if (array_key_exists('tile', $info)) return MA_ERR_OCCUPIED;
        $claimer = array_get($info, 'claimed');
        if ($claimer && $claimer !== $color) {
            return MA_ERR_RESERVED;
        }
        return MA_OK;  
    }

    protected function getPlanetMap() {
        return $this->game->getPlanetMap();
    }

    protected function getTileId() {
        if ($this->tile_id != null) {
            return $this->tile_id;
        }
        //$this->game->prof_point("tileid","start");
        $type = $this->getTileType();
        $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_{$type}_", null, 0);
        if (!$tile) {
            // XXX can be removed later
            $count = count($this->game->tokens->getTokensOfTypeInLocation("tile_{$type}_"));
            $count += 1;
            $this->game->tokens->createToken("tile_{$type}_$count");
            $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_{$type}_", null, 0);
        }
        if (!$tile) throw new BgaSystemException("Cannot find tile of type $type");
        $this->tile_id = $tile['key'];
        //$this->game->prof_point("tileid","end");
        return $this->tile_id;
    }

    protected function getReservedArea(): ?string {
        return $this->params();
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
                if (array_get($hexinfo,'name') === $nname) {
                    $res[] = $hex;
                    break;
                }
            }
        }
        return $res;
    }

    function checkPlacement($color, $location, $info, $planetmap) {
        $tile = $this->getStateArg('object');
        $tt = $this->game->getRulesFor($tile,'tt');

        if ($tt == MA_TILE_CITY) { 
            // have to do it here because city operation is not only one who can do city
            return $this->checkCityPlacement($color, $location, $info, $planetmap);
        }

        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        return 0;
    }

    function checkCityPlacement($color, $ohex, $info, $map) {
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        $reservename = $this->getReservedArea();
        if ($reservename == 'vol') {
            if (!isset($info['vol'])) return MA_ERR_NOTRESERVED;
            $reservename = '';
        }
        if (!$reservename) {
            if (isset($info['reserved'])) return MA_ERR_RESERVED;
            $others = count($this->getAdjecentHexesOfType($ohex, MA_TILE_CITY));;
            if ($others > 0) return MA_ERR_CITYPLACEMENT;
        } else {
            $reshexes = $this->findReservedAreas($reservename);
            if (count($reshexes) == 0) {
                // if reserved area not on the map - generic rules apply
                if (isset($info['reserved'])) return MA_ERR_RESERVED;
                if ($this->checkAdjRulesPasses($ohex, $color, $reservename)) {
                    return MA_OK;
                }
                return MA_ERR_CITYPLACEMENT;
            }
            if (array_search($ohex, $reshexes) === false) {
                return MA_ERR_NOTRESERVED;
            }
        }
        return 0;
    }

    abstract function getTileType(): int;

    function effect_placeTile() {
        $hex = $this->getCheckedArg('target');
        $object = $this->getStateArg('object');
        $owner = $this->color;

        $tile = $this->game->effect_placeTile($owner, $object, $hex);
        $tt = $this->game->getRulesFor($tile,'tt');

        if ($tt == MA_TILE_CITY) { 
            // the effect triggered here because its not only "city" operation that can place cities
            $this->game->incTrackerValue($owner, 'city');
            $this->game->notifyEffect($owner, 'place_city', $tile);
        
            if (!$this->game->getRulesFor($hex, 'inspace')) {
                $this->game->incTrackerValue($owner, 'cityonmars');
                $this->game->notifyEffect($owner, 'place_cityonmars', $tile);
            }
        }

        return $object;
    }

    function canFail(){
        return true;
    }
}
