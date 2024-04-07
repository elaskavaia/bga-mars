<?php

declare(strict_types=1);

class Operation_pass extends AbsOperation {
    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc, ?array $args = null): int {
        $operations = $this->game->getTopOperations();

        $isMulti = $this->game->hasMultiPlayerOperations($operations);

        if ($isMulti) {
            throw new feException("Pass operation is impossible in this state");
        }

        $this->game->machine->clear();
        $this->game->dbSetTokenState("tracker_passed_${color}", 1, '');
        $this->game->notifyMessage(clienttranslate('${player_name} passes'));
        // pass is not an action so decreasig the stat, it was increased before
        $this->game->incStat(-1, 'game_actions',  $this->getPlayerId());
        $this->game->undoSavepoint();
        return 1;
    }

    protected function getVisargs() {
        return array_merge(parent::getVisargs(), [
            'bcolor' => 'red' // button color
        ]);
    }
}
