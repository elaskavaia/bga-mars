<?php

declare(strict_types=1);

require_once "Operation_card.php";

class Operation_cardES extends Operation_card {


    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params('hand');
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main_", "{$location}_{$color}"));
        return $this->filterPlayable($color, $keys);
    }

    function filterPlayable($color, $keys) {
        $parent_card = $this->getContext(0);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenid) use ($parent_card){
            $info = [];
            $info['q'] = $this->game->playability($color, $tokenid, $info, $parent_card); 
            return $info;
        });
    }
}
