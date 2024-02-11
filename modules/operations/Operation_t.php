<?php

declare(strict_types=1);


class Operation_t extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->effect_increaseParam($owner, $this->mnemonic, $inc, 2);
        return $inc;
    }

    function getPrimaryArgType() {
        return '';
    }

    function getMax() {
        $max = $this->game->getRulesFor($this->game->getTrackerId('', $this->getMnemonic()), 'max', 0);
        return $max;
    }

    function requireConfirmation() {
        $current = $this->game->getTrackerValue('', $this->getMnemonic());
        if ($current >= $this->getMax()) {
            return true;
        }
        return false;
    }

    function getPrompt(){
        if ($this->requireConfirmation()) return clienttranslate('${you} must confirm, operation ${name} will not have effect as parameter is at max');
        return parent::getPrompt();
    }
}
