<?php

declare(strict_types=1);

class AbsOperationProdNegAny extends AbsOperation {
    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $count = $this->getMinCount();
        $type = $this->getType();
        $min = $this->game->getRulesFor($this->game->getTrackerId('', $type), 'min');
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($count, $type, $min) {
            $value = $this->game->getTrackerValue($other_player_color, $type);
            if ($value - $count < $min) return MA_ERR_PREREQ;
            return 0;
        });
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    protected function getType() {
        return substr($this->mnemonic, 1, 2);
    }

    function effect(string $owner, int $inc): int {
        $owner = $this->getCheckedArg('target');
        $type = $this->getType();
        $this->game->effect_incProduction($owner, $type, -$inc);
        return $inc;
    }
}
