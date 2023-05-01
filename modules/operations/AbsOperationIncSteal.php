<?php

declare(strict_types=1);

class AbsOperationIncSteal extends AbsOperation {
    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $count = $this->getMinCount();
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($count) {
            if ($color === $other_player_color) return MA_ERR_RESERVED;
            $type = $this->getType();
            $value = $this->game->getTrackerValue($other_player_color, $type);
            if ($value < $count) return MA_ERR_PREREQ;
            return 0;
        });
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function canResolveAutomatically() {
        return false;
    }

    function getType(): string {
        return substr($this->mnemonic, strlen($this->mnemonic) - 1, 1);
    }

    function effect(string $owner, int $inc): int {
        $other = $this->getCheckedArg('target');
        $opres = $this->getType();
        $value = $this->game->getTrackerValue($other, $opres);
        $value = min($inc, $value); // up to

        $this->game->effect_incCount($other, $opres, -$value);
        $this->game->effect_incCount($owner, $opres, $value);
        return $inc;
    }
}
