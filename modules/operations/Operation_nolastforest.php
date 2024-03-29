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
        $this->game->effect_incCount($color, 'p', -$plants, ['message' => '']);
        $this->game->queueremove($color,'lastforest');
        $this->game->queueremove($color,'nolastforest');
        return 1;
    }

    function getOpName() {
        return clienttranslate("Reject placing Greenery");
    }
}
