<?php

declare(strict_types=1);

class Operation_turn extends AbsOperation {
    function auto(string $owner, int $inc, array $args = null): bool {
        $this->game->queue($owner, "card/stan/convh/convp/claim/pass");
        return true;
    }
}
