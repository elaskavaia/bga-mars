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
        $min = $this->getMinCount();
        $diff = $value - $min;

   
        if ($diff == -1 && $this->getType() == 'p') {
            $card_id = $this->getContext(0);
            //$this->game->warn("context $card_id");
            // to be precise can check card type and if viral enhancers are in play
            if ($card_id)  return false; // hack: plans can be gained via play effects
        }
        return  $diff < 0;
    }

    function hasNoSideEffects(): bool {
        return true;
    }

    function getPrimaryArgType() {
        return '';
    }

    function canFail(){
        return true;
    }
}
