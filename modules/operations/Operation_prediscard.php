<?php

declare(strict_types=1);


class Operation_prediscard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $selected = $this->game->tokens->getTokensInLocation("hand_$color",MA_CARD_STATE_SELECTED);
        foreach ($selected as $card_id => $card) {
            $this->game->dbSetTokenLocation($card_id, "hand_$color", 0, '');
        }
        $rest = $this->game->tokens->getTokensInLocation("draw_$color");
        foreach ($rest as $card_id => $card) {
            $type = getPart($card_id,1);
            $this->game->dbSetTokenLocation($card_id, "discard_$type", 0, clienttranslate('${player_name} discards a card'), [],  $this->game->getPlayerIdByColor($color));
        }
        return 1;
    }
}
