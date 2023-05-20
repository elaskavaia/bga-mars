<?php

declare(strict_types=1);


class Operation_copybu extends AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_${color}");
        $keys = [];
        foreach ($map as $key => $info) {
            $tags = $this->game->getRulesFor($key, 'tags', '');
            if (strstr($tags, 'tagBuilding')) {
                $keys[] = $key;
            }
        }
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $r = $this->game->getRulesFor($tokenId, 'r', '');
            if (!$r) return MA_ERR_NOTAPPLICABLE;
            if ($this->game->isVoidSingle($r, $color, 1, $tokenId)) return MA_ERR_MANDATORYEFFECT;
            return MA_OK;
        });
    }

    function effect(string $color, int $inc): int {
        $tokenId = $this->getCheckedArg('target');
        $r = $this->game->getRulesFor($tokenId, 'r');
        $this->game->machine->push($r, 1, 1, $color, MACHINE_FLAG_UNIQUE, "$tokenId:r");
        $this->game->notifyMessageWithTokenName(clienttranslate('${player_name} copies production box of ${token_name}'), $tokenId, $color);
        return 1;
    }
}
