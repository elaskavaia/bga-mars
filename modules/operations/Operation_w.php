<?php

declare(strict_types=1);
require_once "AbsOperationTile.php";

// place ocean
class Operation_w extends AbsOperationTile {
    function checkPlacement($color, $location, $info, $map) {
        $reservename = $this->getReservedArea();
        if ($reservename == 'notocean') {
            if (isset($info['ocean'])) return MA_ERR_RESERVED;
            if (isset($info['reserved'])) return MA_ERR_RESERVED;
            return 0;
        }
        if (!isset($info['ocean'])) return MA_ERR_NOTRESERVED;
        return 0;
    }

    function argPrimaryDetails() {
        $oceans = $this->game->getTrackerValue('', 'w');
        if ($oceans >= 9) {
            $keys = ['none'];
            return $this->game->createArgInfo($this->color, $keys, function ($color, $key) {
                return [
                    'q'=>MA_OK
                ];
            });
        }
        return parent::argPrimaryDetails();
    }

    function getTileType(): int {
        return MA_TILE_OCEAN;
    }

    function effect(string $owner, int $inc): int {
        //if ($inc != 1) throw new feException("Cannot use counter $inc for this operation");
        $oceans = $this->game->getTrackerValue('', 'w');
        if ($oceans >= 9) {
            $this->game->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} is at max, skipping increase'), 'tracker_w');
            $target = $this->getCheckedArg('target');
            if ($target == 'none') return 1; // skipped, this is ok  when no oceans left
            return 1; // skip placing tile
        }

        $this->game->effect_increaseParam($owner, "w", 1);

        $tile = $this->effect_placeTile();
        $this->game->notifyEffect($owner, 'place_ocean', $tile);

        //special handling card_main_188
        if ($this->getContext() == 'card_main_188') {
            $target = $this->getCheckedArg('target');
            $this->game->putInEffectPool($owner, 'acard188', $target);
        }

        return 1;
    }

}
