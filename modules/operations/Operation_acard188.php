<?php

declare(strict_types=1);

class Operation_acard188 extends AbsOperation {
    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $keys[] = 'none';
        $map = $this->game->getPlanetMap();
        $target = $this->getContext();

        $adj = $this->game->getAdjecentHexes($target, $map);
        $found = [];
        foreach ($adj as $hex) {
            $owner = array_get($map[$hex], 'owner');
            if ($owner) {
                $found[$owner] = 1;
            }
        }

        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($found) {
            if ($other_player_color == 'none') return MA_OK;
            if (!array_get($found, $other_player_color)) return MA_ERR_NOTAPPLICABLE;
            //if (!$this->game->canAfford($other_player_color, null, 4)) return MA_ERR_COST;
            return MA_OK;
        });
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function canResolveAutomatically() {
        return false;
    }

    protected function getType() {
        return 'm';
    }

    protected function getOpName() {
        return clienttranslate('Flooding Damage'); 
    }

    protected function getPrompt() {
        return clienttranslate('Select a player to receive Flooding damage (loose 4 MC)'); 
    }

    function effect(string $owner, int $inc): int {
        $owner = $this->getCheckedArg('target');
        if ($owner == 'none') return $inc; // skipped, this is ok for resources
        $type = $this->getType();
        $this->game->effect_incCount($owner, $type, -4, ['ifpossible' => true]);
        return 1;
    }
}
