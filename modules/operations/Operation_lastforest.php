<?php

declare(strict_types=1);


class Operation_lastforest extends AbsOperation {
    function isVoid(): bool {
        return false;
    }

    function getPrimaryArgType() {
        return '';
    }

    function canResolveAutomatically() {
        return true;
    }
    function effect(string $ignore, int $inc): int {
        $players = $this->game->getPlayersInOrder($this->game->getCurrentStartingPlayer());
        $this->game->machine->interrupt();
        foreach ($players as $player_id => $player) {
            if (!$this->game->isPlayerAlive($player_id)) continue;
            $optype = 'convp';
            $color = $player['player_color'];
            $forestop = $this->game->getOperationInstanceFromType($optype, $color);
            if ($forestop->isVoid()) {
                continue;
            }
            $this->game->machine->put("convp/nolastforest", 1, 1, $color, MACHINE_OP_SEQ);
            $this->game->machine->put("lastforest", 1, 1, $color, MACHINE_OP_SEQ);
            break;
        }
        $this->game->notifyScoringUpdate();
        $this->game->undoSavepointWithLabel("lastforest", $this->game->isSolo() ? 0 : 1);

        return 1;
    }
}
