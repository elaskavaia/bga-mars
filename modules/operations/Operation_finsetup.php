<?php

declare(strict_types=1);


/** Finish game setup */
class Operation_finsetup extends AbsOperation {
    function effect(string $color, int $inc): int {
        $selected = $this->game->tokens->getTokensInLocation("hand_$color", MA_CARD_STATE_SELECTED);
        foreach ($selected as $card_id => $card) {
            $this->game->dbSetTokenLocation($card_id, "hand_$color", 0, '');
        }

        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "draw_${color}");
        foreach ($rest as $card_id => $card) {
            $this->game->dbSetTokenLocation($card_id, "limbo", 0, '');
        }

   

        $rest = $this->game->tokens->getTokensInLocation("draw_$color");
        foreach ($rest as $card_id => $card) {
            $type = getPart($card_id, 1);
            $this->game->dbSetTokenLocation($card_id, "discard_$type", 0, '');
        }

        // play selected corp properly
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "tableau_${color}");
        foreach ($rest as $card_id => $card) {
            $this->game->effect_playCorporation($color, $card_id, false);
        }
        return 1;
    }
}
