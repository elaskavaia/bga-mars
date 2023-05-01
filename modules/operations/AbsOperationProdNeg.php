<?php

declare(strict_types=1);

class AbsOperationProdNeg extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incProduction($owner, substr($this->mnemonic, 1), -$inc);
        return $inc;
    }

    protected function getType() {
        return substr($this->mnemonic, 1, 2);
    }

    public function isVoid(): bool {
        $type = $this->getType();
        $min = $this->game->getRulesFor($this->game->getTrackerId('', $type), 'min');
        $value = $this->game->getTrackerValue($this->color, $type);
        $count = $this->getMinCount();
        if ($value - $count < $min) return true;
        return false;
    }
}
