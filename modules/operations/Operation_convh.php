<?php

declare(strict_types=1);


class Operation_convh extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->effect_incCount($color, 'h', -8);
        $this->game->effect_increaseParam($color, 't', 1, 2);
        return 1;
    }


    function argPrimaryDetails() {
        $color = $this->color;
        $heat = $this->game->getTrackerValue($color, 'h');
        $id = $this->game->getTrackerId($color, 'h');
        $keys = [$id];
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($heat) {
            return $heat >= 8 ? 0 : 1;
        });
    }
}
