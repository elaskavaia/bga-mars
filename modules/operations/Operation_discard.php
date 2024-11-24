<?php

declare(strict_types=1);

class Operation_discard extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->autoSkip()) {
            return $inc;
        }

        $card_id = $this->getCheckedArg('target');
        if (!is_array($card_id)) {
            $cards_ids = [$card_id];
            $num = 1;
        } else {
            $cards_ids = $card_id;
            $num = count($cards_ids);
            if (count($cards_ids) < $this->getMinCount()) {
                $this->game->userAssertTrue(totranslate('Insufficient amount of cards selected'));
            }
        }

        if ($num > 0) {
            $location = null;
            foreach ($cards_ids as $card_id) {
                if ($location == null) $location = $this->game->tokens->getTokenLocation($card_id);
                $this->game->effect_moveCard($color, $card_id, "discard_main", 0, '', ['_private' => true]);
            }
        }

        $this->game->notifyWithName(
            'tokenMovedHidden',
            clienttranslate('${player_name} discards ${count} card/s'),
            ['count' => $num, 
            'place_from' => $location, 'location' => 'discard_main', 'token_type' => 'card'],
            $this->getPlayerId()
        );

        return $num;
    }

    function canSkipChoice() {
        return true;
    }

    function argPrimary() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensInLocation("hand_$color"));
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

    function canFail(){
        if ($this->isOptional()) return false;
        return true;
    }
}
