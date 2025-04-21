<?php

declare(strict_types=1);

use PhpParser\Node\Stmt\Continue_;

/**
 * CEO's Favourite Project|3|acard149|||1||Event|0|Corporate|Add 1 resource to a card with at least 1 resource on it.
 */
class Operation_acard149 extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$color");
        $keys = ['none'];
        foreach (array_keys($tokens) as $tokenId) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) continue;
            $keys[] = $tokenId;
        }

        $res =  $this->game->createArgInfo($color,  $keys, function ($color, $tokenId) {
            if ($tokenId == 'none') return MA_OK;
            $countres = $this->game->tokens->countTokensInLocation($tokenId);
            if ($countres == 0)  return MA_ERR_NOTAPPLICABLE;
            return MA_OK;
        });

        return $res;
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');

        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->effect_moveCard($owner, $res, $card, 1, '*');
        }

        return $inc;
    }

    function requireConfirmation() {
        return true;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to add ${count} resource/s');
    }

    protected function getOpName() {
        return clienttranslate('Add resource to another card');
    }
}
