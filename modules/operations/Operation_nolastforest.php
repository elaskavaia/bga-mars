<?php

declare(strict_types=1);

class Operation_nolastforest extends AbsOperation {
    function canResolveAutomatically() {
        return false;
    }

    function getPrimaryArgType() {
        return '';
    }

    function isVoid(): bool {
        return false;
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        // when player denied placing last forest, remove the plants so it does not come and ask again
        $plants =  $this->game->getTrackerValue($color, 'p');
        if ($plants > 1) {         // leave 1 plant it needed for award on amazonis
            $this->game->effect_incCount($color, 'p', -$plants + 1, ['message' => '']);
        }
        return $inc;
    }

    function getOpName() {
        return clienttranslate("Reject placing Greenery");
    }
}
