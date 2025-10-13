<?php

declare(strict_types=1);

require_once "Operation_card.php";
/** Ecology Experts */
class Operation_cardEE extends Operation_card {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg("target", false);
        if (!$card_id) {
            $this->game->notifyMessage(clienttranslate('${player_name} cannot play any card, effect in skipped'));
            $this->game->dbSetTokenState("card_prelude_P10", MA_CARD_STATE_FACEDOWN, "");
            return 1;
        }
        return parent::effect($color, $inc);
    }
    function getDelta() {
        return 20;
    }

    function noValidTargets(): bool {
        return false;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params("hand");
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main_", "{$location}_{$color}"));
        return $this->filterPlayable($color, $keys);
    }

    function filterPlayable($color, $keys) {
        $parent_card = $this->getContext(0);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenid) use ($parent_card) {
            $info = [];
            $info["q"] = $this->game->playability($color, $tokenid, $info, $parent_card);
            return $info;
        });
    }
}
