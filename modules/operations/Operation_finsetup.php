<?php

declare(strict_types=1);


/** Finish game setup */
class Operation_finsetup extends AbsOperation {
    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc): int {
        //$player_id = $this->game->getPlayerIdByColor($color);
        $this->game->setGameStateValue('gamestage', MA_STAGE_GAME);
        if ($this->game->getGameStateValue('var_begginers_corp') == 1)  return 1;

        // pin drawn cards
        $selected = $this->game->tokens->getTokensOfTypeInLocation("card_main_","hand_$color", MA_CARD_STATE_SELECTED);
        foreach ($selected as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "hand_$color", 0);
        }
        $count =  count($selected);
        if ($count)
            $this->game->notifyWithName('message', clienttranslate('${player_name} keeps ${count} card/s'), [
                'count' => $count
            ], $this->getPlayerId());

        // discard second corp
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "draw_${color}");
        foreach ($rest as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "limbo", 0, '');
        }

        // discard unbough cards
        $rest = $this->game->tokens->getTokensInLocation("draw_$color");
        foreach ($rest as $card_id => $card) {
            $type = getPart($card_id, 1);
            $this->game->effect_moveCard($color, $card_id, "discard_$type", 0);
        }

        // play selected corp properly
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "tableau_${color}"); // old way
        foreach ($rest as $card_id => $card) {
            $this->game->effect_playCorporation($color, $card_id, false);
        }
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_corp_", "hand_${color}"); // new new
        foreach ($rest as $card_id => $card) {
            $this->game->effect_playCorporation($color, $card_id, false);
            $corpcost = -$this->game->getRulesFor($card_id, 'cost');
            $this->game->effect_incCount($color, 'm', $corpcost, ['message' => '']);
            $this->game->executeImmediately($color,"nm",3 * $count);
            break;
        }
        return 1;
    }
}
