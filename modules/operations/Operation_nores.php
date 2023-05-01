<?php

declare(strict_types=1);

class Operation_nores extends AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $par = $this->params;
        $keys = array_keys($this->game->getCardsWithResource($par));
        $listeners = $this->game->collectListeners($color, ["defense$par"]); 
        $protected = [];
        foreach ($listeners as $lisinfo) {
            $protected[$lisinfo['owner']] = 1;
        }
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($par, $protected) {
            if (array_get($protected, $color)) return MA_ERR_RESERVED;
            $holds = $this->game->getRulesFor($tokenId, 'holds', '');
            if (!$holds) return MA_ERR_NOTAPPLICABLE;
            if ($par && $holds != $par) return MA_ERR_NOTAPPLICABLE;
            return 0;
        });
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');

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
