<?php

declare(strict_types=1);


class Operation_prediscard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $rest = $this->game->tokens->getTokensInLocation("draw_$color");
        foreach ($rest as $card_id => $card) {
            $this->game->dbSetTokenLocation($card_id, "discard_main", 0, clienttranslate('${player_name} discards a card'), [],  $this->game->getPlayerIdByColor($color));
        }

        return 1;
    }
}
