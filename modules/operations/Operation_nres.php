<?php

declare(strict_types=1);

require_once "Operation_res.php";

class Operation_nres extends AbsOperation {

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = [$this->getContext()];
        $count = $this->getMinCount();
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($count) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            $map = $this->game->getCardsWithResource($holds, $tokenId);
            $current = $map[$tokenId] ?? 0;
            if ($current >= $count) return 0;
            return MA_ERR_MANDATORYEFFECT;
        });
    }

    function   canResolveAutomatically() {
        return !$this->isVoid();
    }


    function effect(string $owner, int $inc): int {
        $card = $this->getContext();
        if (!$card) throw new feException("Context is not defined for operation");


        $holds = $this->game->getRulesFor($card, 'holds', '');
        if (!$holds) throw new feException("Card '$card' cannot hold resources");

        $resources = $this->game->tokens->getTokensOfTypeInLocation("resource", $card);
        $num = $inc;
        foreach ($resources as $key => $info) {
            $num--;
            $this->game->dbSetTokenLocation($key, 'miniboard_' . $owner, 0);
            if ($num == 0) break;
        }
        if ($num > 0) throw new feException("Insufficient number of resources on $card");
        return $inc;
    }
}
