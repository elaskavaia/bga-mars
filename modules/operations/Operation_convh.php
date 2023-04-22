<?php

declare(strict_types=1);


class Operation_convh extends AbsOperation {
    function auto(string $color, int $inc, array $args = null): bool {
        if ($args === null) return false; // cannot auto-play
        $this->game->effect_incCount($color, 'h', -8);
        $this->game->effect_increaseParam($color, 't', 2);
        return true;
    }


    function argPrimaryDetails(string $color, array $op = null, array &$result = null) {
        $heat = $this->game->getTrackerValue($color, 'h');
        $id = $this->game->getTrackerId($color, 'h');
        $keys = [$id];
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($heat) {
            return $heat >= 8 ? 0 : 1;
        });
    }
}
