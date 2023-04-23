<?php

declare(strict_types=1);


class Operation_stan extends AbsOperation {
    function effect(string $color, int $inc): int {
        $this->game->uaction_playCard($this->user_args); // XXX
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_stanproj", "display_main"));
        return $this->game->filterPlayable($color, $keys);
    }
}
