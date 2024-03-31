<?php

declare(strict_types=1);

class Operation_discard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        if (!is_array($card_id)) {
            $cards_ids = [$card_id];
        } else {
            $cards_ids = $card_id;
            if (count($cards_ids) < $this->getMinCount()) {
                $this->game->userAssertTrue(totranslate('Insufficient amount of cards selected'));
            }
        }
        foreach ($cards_ids as $card_id) {
            $this->game->effect_moveCard($color, $card_id, "discard_main", 0, '', ['_private' => true]);
        }
        $this->game->notifyMessage(clienttranslate('${player_name} discards ${count} card/s'), ['count' => count($cards_ids)], $this->getPlayerId());
        $this->game->notifyCounterChanged("discard_main", ["nod" => true]);
        return count($cards_ids);
    }

    function canSkipChoice() {
        return true;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensInLocation("hand_${color}"));
        return $keys;
    }

    function getPrimaryArgType() {
        if ($this->getCount() > 1) return 'token_array';
        return 'token';
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }
}
