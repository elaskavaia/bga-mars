<?php

declare(strict_types=1);

require_once "Operation_res.php";

class Operation_acard149 extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$color");
        $res =  $this->game->createArgInfo($color, array_keys($tokens), function ($color, $tokenId) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            $countres = $this->game->tokens->countTokensInLocation($tokenId);
            if ($countres == 0)  return MA_ERR_NOTAPPLICABLE;
            return MA_OK;
        });
 
        return $res;
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
 
        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->effect_moveCard($owner, $res, $card, 1);
        }

        return $inc;
    }

    function canResolveAutomatically() {
        return false;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to add ${count} resource/s');
    }

    protected function getOpName() {
        return clienttranslate('Add resource to another card');
    }
}
