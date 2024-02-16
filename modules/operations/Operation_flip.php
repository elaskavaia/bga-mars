<?php

declare(strict_types=1);

class Operation_flip extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $card = $this->getContext();
        $this->game->dbSetTokenState($card, MA_CARD_STATE_FACEDOWN, '');
        return 1;
    }
    function getPrimaryArgType() {
        return '';
    }
}
