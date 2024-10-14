<?php

declare(strict_types=1);

class Operation_cardpre extends AbsOperation {
    function effect(string $color, int $inc): int {
        if ($this->noValidTargets()) {
            $infos = $this->arg()['info'];
            foreach ($infos as $card_id => $info) {
                 $this->game->effect_moveCard($color, $card_id, "limbo", 0, clienttranslate('${player_name} cannot play card ${token_name}, player discrds it and gains compensation (designer ruling)'));
                 $this->game->effect_incCount($color, 'm', 15);

            }        
            return 1; // skip this
        }
        $card_id = $this->getCheckedArg('target', false);
        $this->game->put($color, 'cardx', $card_id);
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $location = $this->params('hand');
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_prelude_","{$location}_{$color}"));
        return $this->game->filterPlayable($color, $keys);
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function requireConfirmation() {
        return true;
    }

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }

    function canSkipChoice() {
        return false;
    }

    function isVoid(): bool {
        return false; // is not void because can get 15 ME instead of playing
    }
}
