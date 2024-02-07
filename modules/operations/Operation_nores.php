<?php

declare(strict_types=1);

/**
 * Remove resource from other player
 */
class Operation_nores extends AbsOperation {
    function argPrimaryDetails() {
        $par = $this->params;
        $cards = $this->game->getCardsWithResource($par);
        $keys = array_keys($cards);

        $protected = $this->game->protectedOwners($this->color, $par);
        return $this->game->createArgInfo($this->color, $keys, function ($color, $tokenId) use ($par, $protected) {
            if ($tokenId === 'card_main_172') return ['q' => MA_ERR_PROTECTED, 'protected' => 1]; // Pets protected - hardcoded
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($par && $holds != $par) return MA_ERR_NOTAPPLICABLE;

            $cardowner = getPart($this->game->tokens->getTokenLocation($tokenId), 1);
            if (array_get($protected, $cardowner))  return ['q' => MA_ERR_PROTECTED, 'protected' => 1];
            return MA_OK;
        });
    }

    function effect(string $owner, int $inc): int {
        if ($this->game->isSolo()) {
            $this->game->notifyMessage(clienttranslate('${player_name} removes resource from neutral opponent'), [], $this->game->getPlayerIdByColor($owner));
            return $inc;
        }

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

    function noValidTargets(): bool {
        $arg = $this->arg();
        return count($arg['target']) == 0;
    }

    function canResolveAutomatically() {
        if ($this->game->isSolo()) return true;
        return false;
    }

    function canSkipAutomatically() {
        return false;
    }

    function isVoid(): bool {
        if ($this->game->isSolo()) return false;
        return parent::isVoid();
    }


    protected function getOpName() {
        $par = $this->params;
        return ['log' => clienttranslate('Remove ${restype_name} (Any Card)'),  "args" => [
            'restype_name' => $this->game->getTokenName("tag$par"),
            'i18n' => ['restype_name']
        ]];
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to remove ${count} ${restype_name} resource/s');
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
}
