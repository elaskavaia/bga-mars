<?php

declare(strict_types=1);

class Operation_skipsec extends AbsOperation {
    function isVoid(): bool {
        return false; // cannot auto-resolve this
    }

    function canResolveAutomatically() {
        return false;
    }

    function requireConfirmation() {
        $pref = (int) $this->game->dbUserPrefs->getPrefValue($this->getPlayerId(), MA_PREF_CONFIRM_TURN);
        if ($pref) return true;
        return false;
    }

    function effect(string $color, int $inc): int {
        $this->game->notifyMessage(clienttranslate('${player_name} skips second action'));
        $this->game->queueremove($color, 'confturn');
        $this->game->queueremove($color, 'passauto');
        // this is not an action so decreasing the stat, it was increased before
        $this->game->incStat(-1, 'game_actions',  $this->getPlayerId());
        return 1;
    }

    function getPrimaryArgType() {
        return '';
    }

    protected function getVisargs() {
        return array_merge(parent::getVisargs(),[
            'bcolor' => 'orange' // button color
        ]);
    }
}
