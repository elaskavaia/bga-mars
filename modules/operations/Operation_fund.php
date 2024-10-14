<?php

declare(strict_types=1);


// Fund an award
class Operation_fund extends AbsOperation {
    function effect(string $color, int $inc): int {
        $marker = $this->game->createPlayerMarker($color);
        $milestone = $this->getCheckedArg('target');
        $no = $this->getPlayerNo();
        $this->game->tokens->setTokenState($milestone, $no);
        $this->game->dbSetTokenLocation($marker, $milestone, 1, clienttranslate('${player_name} funds ${place_name} award'), [],  $this->game->getPlayerIdByColor($color));
        $free = $this->params();
        if ($free != 'free') {
            $cost = $this->getStateArg('cost');
            $this->game->push($color, "{$cost}nm", $milestone);
        }
        return 1;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("award_", null, null);
        $keys = array_keys($map);
        $claimed = $this->game->tokens->countTokensInLocation("award_%", null);
        $costs = [8, 14, 20, 0, 0, 0];
        $cost = $costs[$claimed];
        $this->argresult['cost'] = $cost;

        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($map, $cost, $claimed) {
            $free = $this->params();
   
            if ($map[$tokenId]['state'] > 0) $q = MA_ERR_OCCUPIED;
            else if ($claimed >= 3) $q = MA_ERR_MAXREACHED; // 3 already claimed
            else if ($free == 'free') $q = MA_OK;
            else if (!$this->game->canAfford($color, $tokenId, $cost)) $q = MA_ERR_COST;
            else $q = MA_OK;

            // add count, place and vp
            $table = [];
            $this->game->scoreAward($tokenId, $table);
            $extra = $table[$this->getPlayerId()]['details']['awards'][$tokenId];
            return [
                'q' => $q
            ] + $extra;
        });
    }

    function getButtonName() {
        $free = $this->params();
        if ($free != 'free') {
            return parent::getButtonName();
        } else {
            return clienttranslate('Fund an award for free');
        }
    }

    function getPrimaryArgType() {
        return 'token';
    }
}
