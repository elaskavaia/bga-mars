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
            $this->game->notifyMessage('no more cards');
            return 1;
        }
        $card_id = $card['key'];
        $player_id = $this->game->getPlayerIdByColor($color);
        $notif = clienttranslate('${player_name} reveals ${token_name}');
        //reveal and discard the top card of the draw deck. If that card has a microbe tag, add a science resource here
        $this->game->dbSetTokenLocation($card_id, "reveal", 0, $notif, [], $player_id);
        $tags = $this->game->getRulesFor($card_id, 'tags', '');
        if (strstr($tags, 'tagMicrobe')) {
            $this->game->notifyMessage(clienttranslate('it has tag'));
            $this->game->putInEffectPool($color, "res", $this->getContext());
        } else {
            $this->game->notifyMessage(clienttranslate('it does not have tag'));
        }
        $this->game->dbSetTokenLocation($card_id, "discard_main", 0, '', [],  $player_id);
        return 1;
    }
}
