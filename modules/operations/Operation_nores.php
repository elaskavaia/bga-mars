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
    function arg(array $op) {
        $result = parent::arg($op);
        $par = $this->params ?? 'Unknown';
        $result['restype_name'] = $par;
        $result['target'][] = 'none';
        return $result;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a card to remove up to ${count} ${restype_name} resource/s');
    }
}
