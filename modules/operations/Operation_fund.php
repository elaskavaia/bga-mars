<?php

declare(strict_types=1);


// Fund an award
class Operation_fund extends AbsOperation {

    function effect(string $color, int $inc): int {
        if (!$this->canResolveAutomatically()) return false;
        $marker = $this->game->createPlayerMarker($color);
        $milestone = $this->getCheckedArg('target');
        $cost = $this->getStateArg('cost');
        $this->game->effect_incCount($color, 'm', -$cost);
        $no = $this->getPlayerNo();
        $this->game->tokens->setTokenState($milestone, $no);
        $this->game->dbSetTokenLocation($marker, $milestone, 1, clienttranslate('${player_name} funds ${place_name} award'), [],  $this->game->getPlayerIdByColor($color));
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("award", null, null);
        $keys = array_keys($map);
        $claimed = $this->game->tokens->countTokensInLocation("award%", null);
        $costs = [8, 14, 20, 0];
        $cost = $costs[$claimed];
        $this->argresult['cost'] = $cost;
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($map, $cost, $claimed) {
            if ($claimed >= 3) return MA_ERR_MAXREACHED; // 3 already claimed
            
            if (!$this->game->canAfford($color, $tokenId, $cost)) return MA_ERR_COST;
            $info = $map[$tokenId];
            if ($info['state'] > 0) return MA_ERR_OCCUPIED;
            return 0;
        });
    }
}
