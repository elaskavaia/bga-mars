<?php

declare(strict_types=1);

/**
 * Special action for search for life
 */
class Operation_acard5 extends AbsOperation {
    function effect(string $color, int $inc): int {
        $deck = "deck_main";
        $card = $this->game->tokens->getTokenOnTop($deck, false);
        if (!$card) {
            $this->game->notifyMessage(clienttranslate('no more cards'),['_notifType'=>'message_warning']);
            return 1;
        }
        $card_id = $card['key'];
        //reveal and discard the top card of the draw deck. If that card has a microbe tag, add a science resource here
        $this->game->effect_moveCard($color, $card_id, "reveal", MA_CARD_STATE_SELECTED);
        $tags = $this->game->getRulesFor($card_id, 'tags', '');
        if (strstr($tags, 'Microbe')) {
            $this->game->notifyMessageWithTokenName(clienttranslate('${player_name} reveals ${token_name}: it has a Microbe tag'), $card_id, $color,['_notifType'=>'message_warning']);
            $this->game->putInEffectPool($color, "res", $this->getContext());
        } else {
            $this->game->notifyMessageWithTokenName(clienttranslate('${player_name} reveals ${token_name}: it does not have a Microbe tag'), $card_id, $color,['_notifType'=>'message_warning']);
        }
        $this->game->notifyAnimate(2000); // delay to show the card
        $this->game->effect_moveCard($color, $card_id, "discard_main", 0);
        $this->game->undoSavepoint();
        return 1;
    }
    function getPrimaryArgType() {
        return '';
    }
}
