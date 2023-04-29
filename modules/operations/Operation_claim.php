<?php

declare(strict_types=1);


class Operation_claim extends AbsOperation {
    function effect(string $color, int $inc): int {
        $marker = $this->game->createPlayerMarker($color);
        $milestone = $this->getCheckedArg('target');
        $cost = $this->game->getRulesFor($milestone, 'cost');
        $this->game->effect_incCount($color, 'm', - $cost);
        $no = $this->getPlayerNo();
        $this->game->tokens->setTokenState($milestone, $no);
        $this->game->dbSetTokenLocation($marker, $milestone, 1, clienttranslate('${player_name} claims milestone ${place_name}'), [],  $this->game->getPlayerIdByColor($color));
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("milestone", null, null);
        $keys = array_keys($map);
        $claimed = $this->game->tokens->countTokensInLocation("award", null);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($map, $claimed) {
            if ($claimed>=3) return MA_ERR_MAXREACHED;// 3 already claimed
        
            if (!$this->game->canAfford($color,$tokenId)) return MA_ERR_COST;
            $info = $map[$tokenId];
            if ($info['state'] > 0) return MA_ERR_OCCUPIED;
            $r = $this->game->getRulesFor($tokenId, 'pre');
            if (!$this->game->evaluateExpression($r, $color)) return MA_ERR_PREREQ;
            return 0;
        });
    }
}
