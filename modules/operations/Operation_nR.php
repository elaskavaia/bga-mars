<?php

declare(strict_types=1);

class Operation_nR extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incCount($owner, $this->getType(), -$inc);
        return $inc;
    }

    protected function getType() {
        return substr($this->mnemonic, 1);
    }

    public function isVoid(): bool {
        $value = $this->game->getTrackerValue($this->color, $this->getType());
        return $value - $this->getMinCount() < 0;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    protected function getPrimaryArgType() {
        return '';
    }
}
