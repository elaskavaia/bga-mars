<?php

declare(strict_types=1);


class Operation_lastforest extends AbsOperation {
    function effect(string $owner, int $inc): int  {
        // TODO can they decline?
        $players = $this->game->getPlayersInOrder($this->game->getCurrentStartingPlayer());
        foreach ($players as $player) {
            $forestop = $this->game->machine->createOperationSimple('forest', $player['player_color']);
            if ($this->game->isVoid($forestop)) continue;
            $this->game->machine->interrupt();
            $this->game->machine->insertOp(1, $forestop);
            $this->game->machine->put('lastforest');
        }

        return 1;
    }
}
