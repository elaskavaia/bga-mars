<?php

declare(strict_types=1);

require_once "Operation_res.php";

class Operation_ores extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$color");
        return $this->game->createArgInfo($color, array_keys($tokens), function ($color, $tokenId) {
            $par = $this->params ?? '';
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($par && $holds != $par)  return MA_ERR_NOTAPPLICABLE;
            return 0;
        });
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
        if ($card === 'none') return $inc; // skipped, this is ok for resources

        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->dbSetTokenLocation($res, $card, 1);
        }

        return $inc;
    }

    function   canResolveAutomatically() {
        return false;
    }

    function arg() {
        $par = $this->params;
        $result = parent::arg();
        $result['args']['restype_name'] = $par;
        $result['target'][] = 'none';
        return $result;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to add ${count} ${restype_name} resource/s');
    }
}
