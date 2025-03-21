<?php

declare(strict_types=1);

/** 
 * Add resource specified by static parameter to any card on your tableau i.e. ores(Animal).
 * This cannot fail - it can be skipped.
 */
class Operation_ores extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$color");
        $keys = array_keys($tokens);
        $keys[] = 'none';
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            if ($tokenId == 'none') return MA_OK;
            $par = $this->getResTarget();
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($par && $holds != $par)  return MA_ERR_NOTAPPLICABLE;
            $targetTag = $this->getCardTarget();
            if ($targetTag && !$this->game->hasTag($tokenId,"$targetTag"))  return MA_ERR_NOTAPPLICABLE;
            return MA_OK;
        });
    }

    function getResTarget() {
        return $this->getParam(0, '');
    }

    function getCardTarget() {
        return $this->getParam(1, '');
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
        if ($card === 'none') return $inc; // skipped, this is ok for resources

        for ($i = 0; $i < $inc; $i++) {
            $res = $this->game->createPlayerResource($owner);
            $this->game->effect_moveResource($owner, $res, $card, 1, clienttranslate('${player_name} adds ${restype_name} to ${card_name}'), $card);
        }

        return $inc;
    }

    function canFail(): bool {
        return false;
    }

    function canResolveAutomatically() {
        return false;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to add ${count} ${restype_name} resource/s');
    }

    protected function getVisargs() {
        $par = $this->getResTarget();
        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['restype_name']
        ];
    }

    protected function getOpName() {
        $par = $this->getResTarget();
        return ['log' => clienttranslate('Add ${restype_name} to another card'),  "args" => [
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['restype_name']
        ]];
    }
}
