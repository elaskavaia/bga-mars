<?php

declare(strict_types=1);

/** 
 * Gain all colony bonuses
 */
class Operation_colonybon extends  AbsOperation {

    function getPrimaryArgType() {
        return '';
    }

    public function checkIntegrity() {
        $c = $this->getUserCount();
        if ($c === null) $c = $this->getCount();
        if ($c != 1)
            throw new feException("Cannot use counter $c for this operation " . $this->mnemonic);
        return true;
    }


    function effect(string $owner, int $inc): int {
        $color = $this->color;
        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_$color", "card_colo");
        foreach ($markers as $markerId => $info) {
            $card = $info['location'];
            $rules = $this->game->getRulesFor($card, '*');
            $trade_res = $rules['a'];
            $other = getPart($markerId, 1);
            $this->game->putInEffectPool($other, $trade_res, "$card:colo_bonus");
        }
        return $inc;
    }

    function canFail(): bool {
        return false;
    }

    function canResolveAutomatically() {
        return true;
    }

    protected function getOpName() {
        return c_lienttranslate('Gain all colony bonuses');
    }
}
