<?php

declare(strict_types=1);

class Operation_confirm extends AbsOperation {
    function isVoid(): bool {
        return false; // cannot auto-resolve this
    }

    // public function noValidTargets(): bool{
    //     return false;
    // }

    function canResolveAutomatically() {
        $player_id = $this->getPlayerId();
        if ($this->getMnemonic() == 'confturn') {
            $pref = (int) $this->game->dbUserPrefs->getPrefValue($player_id, MA_PREF_CONFIRM_TURN);
            if (!$pref) {
                return true;
            }
        }

        return false;
    }

    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        $this->game->notifyMessage('');
        return 1;
    }
}
