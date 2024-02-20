<?php

declare(strict_types=1);

require_once "Operation_discard.php";
class Operation_sell extends Operation_discard {
    function effect(string $color, int $inc): int {
        $actual = parent::effect($color, $inc);
        $this->game->effect_incCount($color, "m", $actual);
        return $this->getCount(); // all done
    }

    function getPrompt() {
        if ($this->getCount() > 1) return clienttranslate('${you} must select one or more cards to discard to gain 1 M€ per card');
        return parent::getPrompt();
    }
}
