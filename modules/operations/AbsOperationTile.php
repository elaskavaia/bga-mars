<?php

declare(strict_types=1);

// place a tile
abstract class AbsOperationTile extends AbsOperation {
    function argPrimaryDetails(string $color, array $op = null, array &$result = null) {
        $map = $this->game->getPlanetMap();
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $hex) use ($map) {
            $info = $map[$hex];
            if (array_key_exists('tile', $info)) return MA_ERR_OCCUPIED;
            return $this->checkPlacement($color, $hex, $info);
        });
    }

    function checkPlacement($color, $location, $info) {
        if (isset($info['ocean'])) return MA_ERR_RESERVED;
        return 0;
    }

    function arg(array $op) {
        $result = parent::arg($op);
        // free tile
        $type = $this->getTileType();
        $tile = $this->game->tokens->getTokenOfTypeInLocation("tile_$type", null, 0);
        $result['object'] = $tile['key'];
        return $result;
    }

    abstract function getTileType(): int;

    function effect_placeTile(array $args = null) {
        $no = $this->getPlayerNo($args);
        $target = $this->getCheckedArg('target', $args);
        $actionArgs = $this->getStateArgsFromUserArgs($args);
        $object = $actionArgs['object'];
        $this->game->dbSetTokenLocation($object, $target, $no);
        $bonus = $this->game->getRulesFor($target, 'r');
        if ($bonus) {
            $this->game->debugConsole("-placement bonus $bonus");
            $this->game->put($this->getOwner($args), $bonus);
        }
    }
}
