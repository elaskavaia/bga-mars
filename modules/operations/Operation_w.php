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
        if ($oceans >= $this->getMax()) {
            $keys = ['none'];
            return $this->game->createArgInfo($this->color, $keys, function ($color, $key) {
                return [
                    'q' => MA_OK
                ];
            });
        }
        return parent::argPrimaryDetails();
    }

    function getTileType(): int {
        return MA_TILE_OCEAN;
    }

    public function checkIntegrity() {
        $c = $this->getUserCount();
        if ($c === null) $c = $this->getCount();
        if ($c != 1)
            throw new feException("Cannot use counter $c for this operation " . $this->mnemonic);
        return true;
    }

    function getMax() {
        $max = $this->game->getRulesFor($this->game->getTrackerId('', $this->getMnemonic()), 'max', 0);
        return $max;
    }

    function requireConfirmation() {
        return true;
    }

    function getPrompt() {
        $oceans = $this->game->getTrackerValue('', $this->getMnemonic());
        if ($oceans >= $this->getMax()) {
            return clienttranslate('No more ocean tiles in the supply: you may proceed with this action without placing an ocean tile');
        }

        return clienttranslate('${you} must select a location to place an ocean tile');
    }

    function effect(string $owner, int $inc): int {
        //if ($inc != 1) throw new feException("Cannot use counter $inc for this operation ".$this->mnemonic);
        $oceans = $this->game->getTrackerValue('', 'w');
        if ($oceans >= $this->getMax()) {
            $this->game->notifyMessageWithTokenName(clienttranslate('Parameter ${token_name} is at max, skipping increase'), 'tracker_w');
            $target = $this->getCheckedArg('target');
            if ($target == 'none') return 1; // skipped, this is ok  when no oceans left
            return 1; // skip placing tile
        }

        $this->game->effect_increaseParam($owner, "w", 1);

        $tile = $this->effect_placeTile();
        $this->game->notifyEffect($owner, 'place_ocean', $tile);

        //special handling card_main_188 Flooding
        if ($this->getContext() == 'card_main_188') {
            $target = $this->getCheckedArg('target');
            $this->game->putInEffectPool($owner, 'acard188', $target);
        }

        return 1;
    }
}
