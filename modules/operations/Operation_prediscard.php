<?php

declare(strict_types=1);


class Operation_prediscard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $selected = $this->game->tokens->getTokensInLocation("hand_$color", MA_CARD_STATE_SELECTED);
        foreach ($selected as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "hand_$color", 0, '');
        }
        $count =  count($selected);
        if ($count)
            $this->game->notifyWithName('message', clienttranslate('${player_name} keeps ${count} card/s'), [
                'count' => $count
            ], $this->getPlayerId());
        $rest = $this->game->tokens->getTokensInLocation("draw_$color");
        foreach ($rest as $card_id => $card) {
            $type = getPart($card_id, 1);
            $this->game->effect_moveCard($color, $card_id, "discard_$type", 0, '', ['_private' => true]);
        }

        $rest = $this->game->tokens->getTokensInLocation("draft_$color"); // should not happen
        foreach ($rest as $card_id => $card) {
            $type = getPart($card_id, 1);
            $this->game->effect_moveCard($color, $card_id, "discard_$type", 0, '');
        }
        return 1;
    }
    function getPrimaryArgType() {
        return '';
    }
}
