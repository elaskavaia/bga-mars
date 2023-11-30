<?php

declare(strict_types=1);


class Operation_buycard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $money = $this->game->getTrackerValue($color,'m');
        $cost = 3;
        if ($money>=$cost) {
            // use money if can
            //$this->game->executeImmediately($color,"nm",$cost);
            $this->game->effect_incCount($color, "m", -$cost); // direct pay cannot do execute immediatly it fails for Helion trying to ask user
        } else {
            $this->game->multiplayerpush($color, "${cost}nm", "$card_id:a");
        }
        $this->game->effect_moveCard($color, $card_id, "hand_$color", MA_CARD_STATE_SELECTED, clienttranslate('private: ${player_name} buys a card ${token_name}'), [
            "_private"=>true
        ]);
        $this->game->notifyCounterChanged("hand_$color", ["nod" => true]);
        return 1;
    }

    function isVoid(): bool {
        if ($this->getMinCount() == 0) return false;
        if ($this->noValidTargets()) return true;
        return $this->game->isVoidSingle("3nm", $this->color);
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main","draw_${color}"));
        $hasmoney = !$this->game->isVoidSingle("3nm", $color);
        $q = MA_ERR_COST;
        if ($hasmoney) $q = 0;
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($q) {
            return [
                'pre' => $this->game->precondition($color,$tokenId),
                'q' => $q
            ];
        });
    }


    function canResolveAutomatically() {
        return false;
    }
}
