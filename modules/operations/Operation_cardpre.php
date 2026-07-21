<?php

declare(strict_types=1);

class Operation_cardpre extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg("target", false);
        if ($card_id === null) {
            return 1; // nothing left to resolve
        }
        if ($this->isPlayable($card_id)) {
            $this->game->put($color, "cardx", $card_id);
        } else {
            // designer ruling: a prelude that cannot be played is sold for 15 M€
            $this->game->effect_moveCard(
                $color,
                $card_id,
                "limbo",
                0,
                clienttranslate('${player_name} cannot play card ${token_name}, sells it for 15 M€ (designer ruling)')
            );
            $this->game->effect_incCount($color, "m", 15);
        }
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params("hand");
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_prelude_", "{$location}_{$color}"));
        $info = $this->game->filterPlayable($color, $keys);
        foreach ($info as $card_id => $cardinfo) {
            if ($cardinfo["q"] != MA_OK) {
                // relabel the button so an unplayable prelude reads as a sell, not a play
                // also re-frame as valid targets
                $info[$card_id]["name"] = clienttranslate('Sell for 15 M€ (Cannot play): ${token_name}');
                $info[$card_id]["playable"] = $cardinfo["q"];
                $info[$card_id]["q"] = 0;
            }
        }
        return $info;
    }

    private function isPlayable($card_id): bool {
        return ($this->arg()["info"][$card_id]["playable"] ?? MA_OK) == MA_OK;
    }

    function getPrimaryArgType() {
        return "token";
    }

    function requireConfirmation() {
        return true;
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg["target"]) == 0;
    }

    function canSkipChoice() {
        return false;
    }

    function isVoid(): bool {
        return false; // is not void because can get 15 M€ instead of playing
    }
}
