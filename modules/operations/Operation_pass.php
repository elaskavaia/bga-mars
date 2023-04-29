<?php

declare(strict_types=1);

class Operation_pass extends AbsOperation {
    function isVoid(): bool {
        return false; // cannot auto-resolve this
    }

    function canResolveAutomatically() {
        return false;
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        $this->game->machine->clear();
        $this->game->dbSetTokenState("tracker_passed_${color}", 1,'');
        $this->game->notifyMessage(clienttranslate('${player_name} passes'));
        return 1;
    }
}
