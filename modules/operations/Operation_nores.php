<?php

declare(strict_types=1);

/**
 * Remove resource from other player
 */
class Operation_nores extends AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $par = $this->params;
        $cards = $this->game->getCardsWithResource($par);
        $keys = array_keys($cards);
        $listeners = $this->game->collectListeners(null, ["defense$par"]);
        $protected = [];
        foreach ($listeners as $lisinfo) {
            $protected[$lisinfo['owner']] = 1;
        }
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($par, $protected) {
            if ($tokenId === 'card_main_172') return MA_ERR_RESERVED; // Pets protected - hardcoded
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($par && $holds != $par) return MA_ERR_NOTAPPLICABLE;

            $cardowner = getPart($this->game->tokens->getTokenLocation($tokenId), 1);
            if ($cardowner != $color && array_get($protected, $cardowner)) return MA_ERR_RESERVED;

            return 0;
        });
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');

        $resources = $this->game->tokens->getTokensOfTypeInLocation("resource", $card);
        $num = $inc;
        foreach ($resources as $key => $info) {
            $num--;
            $this->game->effect_moveResource($owner, $key, "tableau_$owner", 0, clienttranslate('${player_name} removes ${restype_name} from ${card_name}'), $card);
            if ($num == 0) break;
        }
        if ($num > 0) throw new feException("Insufficient number of resources on $card");
        return $inc;
    }

    function canResolveAutomatically() {
        return false;
    }

    protected function getVisargs() {
        $par = $this->params;
        return [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['restype_name']
        ];
    }

    protected function getOpName() {
        $par = $this->params;
        return ['log' => clienttranslate('Remove ${restype_name} from another card'),  "args" => [
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['restype_name']
        ]];
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to remove ${count} ${restype_name} resource/s');
    }
}
