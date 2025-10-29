<?php

declare(strict_types=1);

class Operation_discard extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->autoSkip()) {
            return $inc;
        }

        $card_id = $this->getCard();
        if ($card_id) {
            $location = $this->game->tokens->getTokenLocation($card_id);
            $this->game->effect_moveCard($color, $card_id, "discard_main", 0, "", ["_private" => true]);

            $this->game->notifyWithName(
                "tokenMovedHidden",
                clienttranslate('${player_name} discards a card'),
                [
                    "count" => 1,
                    "reason_tr" => $this->getReason(),
                    "place_from" => $location,
                    "location" => "discard_main",
                    "token_type" => "card",
                ],
                $this->getPlayerId()
            );

            return 1;
        }

        $card_id = $this->getCheckedArg("target");
        $this->game->push($color, "discard", ":::$card_id");
        return 1;
    }

    function getCard() {
        return $this->getContext(3);
    }

    function argPrimary() {
        $card = $this->getCard();
        if ($card) {
            return [$card];
        }
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensInLocation("hand_$color"));
        return $keys;
    }

    function requireConfirmation() {
        return true;
    }

    function getPrimaryArgType() {
        return "token";
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg["target"]) == 0;
    }

    function canFail() {
        if ($this->isOptional()) {
            return false;
        }
        return true;
    }

    function getPrompt() {
        $card = $this->getCard();
        if ($card) {
            return clienttranslate('${you} must confirm that you want to DISCARD');
        }
        return clienttranslate('${you} must select a card to discard');
    }
}
