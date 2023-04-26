<?php

declare(strict_types=1);

require_once "Operation_res.php";

class Operation_nores extends Operation_res {
    function argPrimaryDetails() {
        $color = $this->color;
        $par = $this->params;
        $keys = array_keys($this->game->getCardsWithResource($par));
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($par) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($par && $holds != $par) return MA_ERR_NOTAPPLICABLE;
            return 0;
        });
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
        if ($card === 'none') return $inc; // skipped, this is ok for resources

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

    function   canResolveAutomatically() {
        return false;
    }

    function arg() {
        $result = parent::arg();
        $par = $this->params ?? 'Unknown';
        $result['args']['restype_name'] = $par;
        $result['target'][] = 'none';
        return $result;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to remove up to ${count} ${restype_name} resource/s');
    }
}
