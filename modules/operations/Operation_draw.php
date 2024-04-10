<?php

declare(strict_types=1);

class Operation_draw extends AbsOperation {
    function effect(string $color, int $inc): int {
        $tag = $this->params();
        if ($tag) {
            // draw util you get a specific tag
            $tag_name = $tag;
            $card_id = false;
            $took = 0;
            while ($took < $inc) {
                $card_id = $this->game->effect_drawAndRevealTag($color, $tag_name, false);
                if ($card_id === null) return $inc; // no more cards
                if ($card_id !== false) {
                    $this->game->effect_moveCard($color, $card_id, "hand_${color}", 0);
                    $took ++;
                }
            }
        } else {
            $this->game->effect_draw($color, "deck_main", "hand_${color}", $inc);
        }
        return $inc;
    }

    function canResolveAutomatically() {
        if ($this->params() === 'auto') return true; // XXX never true?
        return false;
    }

    function getPrimaryArgType() {
        return '';
    }
}
