<?php

declare(strict_types=1);

require_once "Operation_card.php";

class Operation_cardEE extends Operation_card {
    function getDelta() {
        return 20;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params('hand');
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main_", "{$location}_{$color}"));
        return $this->filterPlayable($color, $keys);
    }

    function filterPlayable($color, $keys) {
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenid) {
            $info = ['delta' => 20];
            $info['q'] = $this->game->playability($color, $tokenid, $info); // as side effect this set extra info there
            return $info;
        });
    }
}
