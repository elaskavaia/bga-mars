<?php

declare(strict_types=1);


class Operation_convh extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->effect_incCount($color, 'h', -8);
        $this->game->effect_increaseParam($color, 't', 1, 2);
        return 1;
    }

    function isVoid(): bool {
        $temp = $this->game->getTrackerValue('', 't');
        if ($temp >= 8) return true; // void
        $heat = $this->game->getTrackerValue($this->color, 'h');
        if ($heat < 8) return true; // not enough
        return false;
    }
}
