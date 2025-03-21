<?php

declare(strict_types=1);

class Operation_nR extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_incCount($owner, $this->getType(), -$inc, ['reason_tr' => $this->getReason()]);
        return $inc;
    }

    protected function getType() {
        return substr($this->mnemonic, 1);
    }

    public function noValidTargets(): bool {
        $value = $this->game->getTrackerValue($this->color, $this->getType());
        $min = $this->getMinCount();
        $diff = $value - $min;


        if ($diff == -1 && $this->getType() == 'p') {
            $card_id = $this->getContext(0);
            if ($card_id && $this->game->hasTag($card_id, 'Plant')) {
                if ($this->game->playerHasCard($this->color, 'card_main_74')) { // viral enhancers
                    return false; // one plant can be gained via viral enhancers
                }
            }
        }
        return  $diff < 0;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    function getPrimaryArgType() {
        return '';
    }

    function canFail() {
        return true;
    }
}
