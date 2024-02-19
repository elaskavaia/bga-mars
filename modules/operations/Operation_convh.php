<?php

declare(strict_types=1);


class Operation_convh extends AbsOperation {
    function argPrimary() {
        $color = $this->color;
        $keys = ["tracker_h_$color"];
        return $keys;
    }

    function effect(string $color, int $inc): int {
        $this->game->effect_incCount($color, 'h', -8);
        $this->game->effect_increaseParam($color, 't', 1, 2);
        return 1;
    }

    function isVoid(): bool {
        $heat = $this->game->getTrackerValue($this->color, 'h');
        if ($heat < 8) return true; // not enough
        return false;
    }
    function getPrimaryArgType() {
        return 'token';
    }

    function isMax() {
        $temp = $this->game->getTrackerValue('', 't');
        if ($temp >= $this->getMax()) return true;
        return false;
    }

    function requireConfirmation() {
        if ($this->isMax()) return true;
        return false;
    }

    function getPrompt() {
        if ($this->isMax()) {
            return clienttranslate('${you} must confirm, operation ${name} will not have effect as parameter is at max');
        }

        return parent::getPrompt();
    }

    function getMax() {
        $max = $this->game->getRulesFor($this->game->getTrackerId('', 't'), 'max', 0);
        return $max;
    }
}
