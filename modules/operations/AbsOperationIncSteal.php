<?php

declare(strict_types=1);

class AbsOperationIncSteal extends AbsOperation {
    function argPrimaryDetails() {
        $keys = $this->game->getPlayerColors();
        $count = $this->getMinCount();
        $type = $this->getType();
        $protected = [];
        if ($type == 'p') {
            $listeners = $this->game->collectListeners($this->color, ["defensePlant"]);
            foreach ($listeners as $lisinfo) {
                $protected[$lisinfo['owner']] = 1;
            }
        }
        return $this->game->createArgInfo($this->color, $keys, function ($color, $other_player_color) use ($count, $type, $protected) {
            if ($color === $other_player_color) return MA_ERR_RESERVED;
            if (array_get($protected, $other_player_color)) return MA_ERR_RESERVED;
            $value = $this->game->getTrackerValue($other_player_color, $type);
            if ($value < $count) return MA_ERR_PREREQ;
            return 0;
        });
    }

    public function getPrimaryArgType() {
        return 'player';
    }

    function canResolveAutomatically() {
        if ($this->game->isSolo()) return true;
        return false;
    }

    function isVoid(): bool {
        if ($this->game->isSolo()) return false;
        return parent::isVoid();
    }

    function getType(): string {
        return substr($this->mnemonic, strlen($this->mnemonic) - 1, 1);
    }

    function effect(string $owner, int $inc): int {
        $opres = $this->getType();
        if ($this->game->isSolo()) {
            $this->game->notifyMessage(clienttranslate('${player_name} steals from neutral opponent'), [], $this->game->getPlayerIdByColor($owner));
            $this->game->effect_incCount($owner, $opres, $inc);
            return $inc;
        }
        $other = $this->getCheckedArg('target');

        $value = $this->game->getTrackerValue($other, $opres);
        $value = min($inc, $value); // up to

        $this->game->effect_incCount($other, $opres, -$value);
        $this->game->effect_incCount($owner, $opres, $value);
        return $inc;
    }
}
