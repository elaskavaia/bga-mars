<?php

declare(strict_types=1);

class Operation_turn2 extends AbsOperation {
    function effect(string $owner, int $inc): int  {
        $this->game->queue($owner, "card/stan/activate/convh/convp/claim/fund/skipsec/pass");
        return 1;
    }
}
