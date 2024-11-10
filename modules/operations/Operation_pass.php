<?php

declare(strict_types=1);

class Operation_pass extends AbsOperation {
    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc, ?array $args = []): int {
        $operations = $this->game->getTopOperations();
        $isMulti = $this->game->hasMultiPlayerOperations($operations);

        if ($isMulti) {
            throw new feException("Pass operation is impossible in this state");
        }

        $player_id = $this->game->getPlayerIdByColor($color);
        $auto  = array_get($args, 'auto', 0);
        if (!$color || !$player_id) {
            $this->game->error("Cannot determine player for pass operation auto=$auto c=$color p=$player_id");
            return 1;
        }

        $this->game->machine->clear();
        $this->game->dbSetTokenState("tracker_passed_$color", 1, '');
        $this->game->notifyMessage(clienttranslate('${player_name} passes'));
        // pass is not an action so decreasing the stat, it was increased before
        $this->game->incStat(-1, 'game_actions',  $player_id);
        $this->game->undoSavepointWithLabel(clienttranslate("pass"), MA_UNDO_NOBARRIER);
        return 1;
    }

    protected function getVisargs() {
        return array_merge(parent::getVisargs(), [
            'bcolor' => 'red' // button color
        ]);
    }
}
