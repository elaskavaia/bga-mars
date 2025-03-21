<?php

declare(strict_types=1);

class Operation_npR extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $type = $this->getType();
        $this->game->effect_incProduction($owner, $type, -$inc, ['reason_tr' => $this->getReason()]);
        return $inc;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    protected function getType() {
        return substr($this->mnemonic, 1, 2);
    }

    public function noValidTargets(): bool {
        $type = $this->getType();
        $min = $this->game->getRulesFor($this->game->getTrackerId($this->color, $type), 'min', 0);
        $value = $this->game->getTrackerValue($this->color, $type);
        $count = $this->getMinCount();
        if ($value - $count < $min) return true;
        return false;
    }

    function getPrimaryArgType() {
        return '';
    }

    function canFail() {
        return true;
    }
}
