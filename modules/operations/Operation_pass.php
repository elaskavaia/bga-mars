<?php

declare(strict_types=1);


class Operation_pass extends AbsOperation {

    function isVoid($op, $args = null) {
        return false;
    }

    function auto(string $color, int $inc, ?array $args = null) {
        if ($args === null) return false;
        $this->game->dbSetTokenState("tracker_passed_${color}", 1);
        $this->game->notifyMessage(clienttranslate('${player_name} passes'));
        return true;
    }
}
