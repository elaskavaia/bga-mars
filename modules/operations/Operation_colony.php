<?php

declare(strict_types=1);

/** 
 * Add colony to a colony card
 * This can be void.
 * - when player already on it
 * - when there are 3 slots already occupied
 */
class Operation_colony extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        $keys = array_keys($tokens);
        $keys[] = 'none';
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            if ($tokenId == 'none') return MA_OK;
            $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $tokenId);
            $n=0;
            foreach ($markers as $id => $rec) {
                if ($id == "marker_$color") $n++;
            }
            $claimed = count($markers);
            if ($claimed >= 3) return MA_ERR_MAXREACHED; // 3 already claimed
            if ($n>0) return MA_ERR_OCCUPIED;
            return MA_OK;
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }


    public function checkIntegrity() {
        $c = $this->getUserCount();
        if ($c === null) $c = $this->getCount();
        if ($c != 1)
            throw new feException("Cannot use counter $c for this operation " . $this->mnemonic);
        return true;
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
        if ($card === 'none') return $inc; // skipped, this is ok for resources

        $res = $this->game->createPlayerMarker($owner);
        $this->game->dbSetTokenLocation($res,  $card, 1, c_lienttranslate('${player_name} builds a colony on ${card_name}'), [
            'card_name' => $this->game->getTokenName($card)
        ], $this->getPlayerId());

        $rules = $this->game->getRulesFor($card, 'r'); // placement bonus
        $this->game->putInEffectPool($owner, $rules, $card);
        $this->game->notifyEffect($owner, 'place_colony', $card);
        $this->game->notifyScoringUpdate();

        return $inc;
    }

    function canFail(): bool {
        return false;
    }

    function canResolveAutomatically() {
        return false;
    }

    public function getPrompt() {
        return c_lienttranslate('${you} must select a colony tile to build a colony on');
    }

    protected function getOpName() {
        return c_lienttranslate('Build a colony');
    }
}
