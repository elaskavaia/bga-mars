<?php

declare(strict_types=1);


class Operation_convp extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->effect_incCount($color, 'p', -8);
        $this->game->push($color, 'forest');
        return 1;
    }


    function argPrimaryDetails() {
        $color = $this->color;
        $heat = $this->game->getTrackerValue($color, 'p');
        $id = $this->game->getTrackerId($color, 'p');
        $keys = [$id];
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($heat) {
            return $heat >= 8 ? 0 : 1;
        });
    }
}
