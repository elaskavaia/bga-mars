<?php

declare(strict_types=1);

/**
 * Remove resource from your own card
 */
class Operation_nres extends AbsOperation {

    function argPrimaryDetails() {
        $color = $this->color;
        $card = $this->getContext(0);
        $param = $this->getParam(0);
        if ($param) {
            $useholds = $param;
            $tokens = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$color");
            $keys = array_keys($tokens);
        } else {
            $keys = [$card];
            $useholds = $this->game->getRulesFor($card, 'holds', '');
        }
        $count = $this->getMinCount();
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($count, $useholds) {
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($holds != $useholds) return MA_ERR_NOTAPPLICABLE;
            $map = $this->game->getCardsWithResource($holds, $tokenId);
            $current = $map[$tokenId] ?? 0;
            if ($current >= $count) return MA_OK;
            return MA_ERR_MANDATORYEFFECT;
        });
    }

    protected function getOpName() {
        $card = $this->getContext();
        $par = $this->game->getRulesFor($card, 'holds', '');
        return ['log' => clienttranslate('Remove ${restype_name} from ${card_name}'),  "args" => [
            "card_name" => $this->game->getTokenName($card),
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['card_name', 'restype_name']
        ]];
    }


    function effect(string $owner, int $inc): int {
        $card = $this->getContext();
        if (!$card) throw new feException("Context is not defined for operation");
        $param = $this->getParam(0);
        if (!$param) {
            $holds = $this->game->getRulesFor($card, 'holds', '');
            if (!$holds) throw new feException("Card '$card' cannot hold resources");
        } else {
            $holds = $param;
            $card = $this->getCheckedArg('target');
        }


        $resources = $this->game->tokens->getTokensOfTypeInLocation("resource", $card);
        $num = $inc;
        foreach ($resources as $key => $info) {
            $num--;
            $this->game->effect_moveResource($owner, $key, "tableau_$owner", 0, clienttranslate('${player_name} removes ${restype_name} from ${card_name}'), $card);
            if ($num == 0) break;
        }
        if ($num > 0) throw new BgaUserException("Insufficient number of resources");
        return $inc;
    }

    function getPrimaryArgType() {
        return 'token';
    }

    function canFail() {
        return true;
    }

    function getPrompt() {
        $param = $this->getParam(0);
        if ($param) {
            return clienttranslate('Remove resource from your card');
        } else {
            return clienttranslate('Remove resource from this card');
        }
    }
}
