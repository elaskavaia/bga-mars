<?php

declare(strict_types=1);

class Operation_turn extends AbsOperation {
    function effect(string $owner, int $inc): int {
        $this->game->queue($owner, "card/stan/activate/convh/convp/claim/fund/pass");
        // if multiplayer
        $num = $this->game->getPlayersNumber();
        if ($num > 1) {
            $this->game->queue($owner, "turn2");
        }
        return 1;
    }
}
