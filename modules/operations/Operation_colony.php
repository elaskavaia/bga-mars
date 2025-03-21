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
            $n = 0;
            foreach ($markers as $id => $rec) {
                if ($id == "marker_$color") $n++;
            }
            $claimed = count($markers);
            $state = $this->game->tokens->getTokenState($tokenId);
            $q = MA_OK;
            if ($state < 0) $q = MA_ERR_PREREQ;
            else if ($claimed >= 3) $q= MA_ERR_MAXREACHED; // 3 already claimed
            else if ($n > 0) $a = MA_ERR_OCCUPIED;
            return ['q' => $q, 'level' => $state];
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
        $step = $this->game->tokens->getTokenState($card);
        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $card);
        $colonies = count($markers);
        $new_col_spot = $colonies;
        $new_spot = $new_col_spot + 1;
        if ($step < $new_spot) {
            $this->game->dbSetTokenState($card, $new_spot, c_lienttranslate('Trading power of ${card_name} resets to ${step}'), [
                'card_name' => $this->game->getTokenName($card),
                'step' => $new_spot
            ]);
        }

        $this->game->dbSetTokenLocation($res,  $card, $new_col_spot, c_lienttranslate('${player_name} builds a colony on ${card_name}'), [
            'card_name' => $this->game->getTokenName($card)
        ], $this->getPlayerId());

        $rules = $this->game->getRulesFor($card, 'r'); // placement bonus
        $this->game->putInEffectPool($owner, $rules, "$card:colo_place_bonus");
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
        return c_lienttranslate('Build Colony');
    }
}
