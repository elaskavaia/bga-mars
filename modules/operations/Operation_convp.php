<?php

declare(strict_types=1);


class Operation_convp extends AbsOperation {
    function auto(string $color, int $inc, array $args = null): bool {
        if ($args === null) return false; // cannot auto-play
        $this->game->effect_incCount($color, 'p', -8);
        $this->game->push($color, 'forest');
        return true;
    }


    function argPrimaryInfo(string $color, array $op = null) {
        $heat = $this->game->getTrackerValue($color, 'p');
        $id = $this->game->getTrackerId($color, 'p');
        $keys = [$id];
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($heat) {
            return $heat >= 8 ? 0 : 1;
        });
    }
}
