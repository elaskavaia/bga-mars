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

        $detais = $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $param = $this->getParam(0);
            $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $tokenId);
            $n = 0;
            if ($param != 'double') { // if double means can place colony more than once
                foreach ($markers as $id => $rec) {
                    if (getPart($id, 1) == $color) $n++;
                }
            }
            $claimed = count($markers);
            $state = $this->game->tokens->getTokenState($tokenId);
            $q = MA_OK;
            if ($state < 0) $q = MA_ERR_PREREQ;
            else if ($claimed >= 3) $q = MA_ERR_MAXREACHED; // 3 already claimed
            else if ($n > 0) $q = MA_ERR_OCCUPIED;
            return ['q' => $q, 'level' => $state];
        });
        // $primary = $this->getTargetList($detais);
        // if (count($primary) == 0) {
        //     // no valid targets add 'none'
        //     $detais['none'] = ['q' => MA_OK];
        // }
        return $detais;
    }

    function getPrimaryArgType() {
        return 'token';
    }


    public function checkIntegrity() {
        return $this->checkIntegritySingleton();
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');
        if ($card == 'none') {
            $this->game->notifyMessage(clienttranslate('${player_name} No valid colony location, action is skipped'));
            return 1; // skipped
        }
        $res = $this->game->createPlayerMarker($owner);
        $step = $this->game->tokens->getTokenState($card);
        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $card);
        $colonies = count($markers);
        $new_col_spot = $colonies;
        $new_spot = $new_col_spot + 1;
        if ($step < $new_spot) {
            $this->game->dbSetTokenState($card, $new_spot, clienttranslate('Trade income level of ${card_name} changes to ${new_state}'), [
                'card_name' => $this->game->getTokenName($card)
            ]);
        }

        $this->game->dbSetTokenLocation($res,  $card, $new_col_spot, clienttranslate('${player_name} builds a colony on ${card_name}'), [
            'card_name' => $this->game->getTokenName($card)
        ], $this->getPlayerId());

        $rules = $this->game->getRulesFor($card, 'r'); // placement bonus
        $this->game->putInEffectPool($owner, $rules, "$card:colo_place_bonus");
        $this->game->triggerEffect($owner, 'place_colony', $card);
        $this->game->notifyScoringUpdate();

        return 1;
    }

    function canResolveAutomatically() {
        return false;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a colony tile to build a colony on');
    }

    protected function getOpName() {
        return clienttranslate('Build Colony');
    }
}
