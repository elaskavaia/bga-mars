<?php

declare(strict_types=1);

class Operation_draw extends AbsOperation {
    function effect(string $color, int $inc): int {
        if (!$this->game->isPlayerAlive($this->getPlayerId())) return $inc;
        $tag = $this->params();
        if ($tag) {
            // draw util you get a specific tag
            $tag_name = $tag;
            $card_id = false;
            $took = 0;
            $draw = 0;
            while ($took < $inc) {
                $card_id = $this->game->effect_drawAndRevealTag($color, $tag_name, false);
                $draw++;

                if ($card_id === null) return $inc; // no more cards
                if ($card_id !== false) {
                    // not private since we revealed it
                    $this->game->effect_moveCard($color, $card_id, "hand_$color", 0, "", ["_private" => false]);
                    $took++;
                }

                if ($draw >= 10 || $took > 0) {
                    $this->game->giveExtraTime($this->getPlayerId());
                    return $took;
                }
            }
        } else {
            $this->game->effect_draw($color, "deck_main", "hand_$color", $inc);
        }
        return $inc;
    }

    function requireConfirmation() {
        $tag = $this->params();
        if ($tag) {
            return false; // draw with tag come from prelude let not confirm that
        }
        $pref = (int) $this->game->dbUserPrefs->getPrefValue($this->getPlayerId(), MA_PREF_CONFIRM_DRAW);
        return $pref;
    }

    function canResolveAutomatically() {
        if ($this->params() === 'auto') return true; // XXX never true?
        if (!$this->requireConfirmation()) return true;
        return false;
    }

    function getPrimaryArgType() {
        return '';
    }
}
