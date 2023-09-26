<?php

declare(strict_types=1);


/** Finish game setup */
class Operation_finsetup extends AbsOperation {
    function effect(string $color, int $inc): int {
        //$player_id = $this->game->getPlayerIdByColor($color);
        $this->game->setGameStateValue('gamestage', MA_STAGE_GAME);
        if ($this->game->getGameStateValue('var_begginers_corp') == 1)  return 1;

        // pin drawn cards
        $selected = $this->game->tokens->getTokensInLocation("hand_$color", MA_CARD_STATE_SELECTED);
        foreach ($selected as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "hand_$color", 0);
        }

        // discard second cord
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "draw_${color}");
        foreach ($rest as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "limbo", 0, '${player_names} discards ${card_name}');
        }

        // discard unbough cards
        $rest = $this->game->tokens->getTokensInLocation("draw_$color");
        foreach ($rest as $card_id => $card) {
            $type = getPart($card_id, 1);
            $this->game->effect_moveCard($color, $card_id, "discard_$type", 0);
        }

        // play selected corp properly
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "tableau_${color}");
        foreach ($rest as $card_id => $card) {
            $this->game->effect_playCorporation($color, $card_id, false);
        }
        return 1;
    }
}
