<?php

declare(strict_types=1);

class Operation_turn2 extends AbsOperation {
    function effect(string $owner, int $inc): int  {
        $this->game->incStat(1, 'game_actions', $this->game->getPlayerIdByColor($owner));
        $this->game->queue($owner, "card/stan/activate/convh/convp/claim/fund/skipsec/pass");
        $this->game->queue($owner, "confturn");
        return 1;
    }
}
