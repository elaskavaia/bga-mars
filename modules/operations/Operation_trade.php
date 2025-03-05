<?php

declare(strict_types=1);

/** 
 * Trade with colony
 * This can be void.
 * - when player's ship is already in another colony
 * - when its occupied
 */
class Operation_trade extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;

        $myfleet_location = $this->game->tokens->getTokenLocation("fleet_$color");
        if ($myfleet_location != 'tile_fleet') {
            $keys = [$myfleet_location];
            return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
                return MA_ERR_ALREADYUSED;
            });
        }
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        $keys = array_keys($tokens);
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $oncolony = $this->game->tokens->getTokensOfTypeInLocation("fleet_", $tokenId);
            $claimed = count($oncolony);
            if ($claimed > 0) return MA_ERR_OCCUPIED;
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
        if ($card === 'none') $this->game->userAssertTrue('Trade fleet is already used this turn');
        $ship = "fleet_$owner";
        $step = $this->game->tokens->getTokenState($card);

        $this->game->dbSetTokenLocation($ship,  $card, 1, c_lienttranslate('${player_name} trades on ${card_name} with power of ${step}'), [
            'card_name' => $this->game->getTokenName($card),
            'step' => $step
        ], $this->getPlayerId());

        $rules = $this->game->getRulesFor($card, '*');
        $trade_res = $rules['i'];
        $trade_slots  = $rules['slots'];
        $op = $trade_slots[$step] . $trade_res;

        $this->game->putInEffectPool($owner, $op, $card);

        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $card);
        $colonies = count($markers);
        $new_spot = $colonies + 1;
        $this->game->dbSetTokenLocation($card, 'display_colonies', $new_spot, c_lienttranslate('Trading power of ${card_name} resets to ${step}'), [
            'card_name' => $this->game->getTokenName($card),
            'step' => $new_spot
        ]);
        $trade_res = $rules['a'];
        foreach ($markers as $markerId => $info) {
            // each player with colony gets trading bonus
            $other = getPart($markerId, 1);
            $this->game->queue($other, $trade_res, $card);
        }

        return $inc;
    }
    static function activateColoniesOnPlayCard($proj, $game) {
        $holds = $game->getRulesFor($proj, 'holds', '');
        if (!$holds) return;
        $colonies = $game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        foreach ($colonies as $colo => $info) {
            if ($info['state'] >= 0) continue;
            $prod = $game->getRulesFor($colo, 'prod', '');
            if (!$prod) continue;
            if ($holds == $prod) {
                $game->dbSetTokenLocation($colo, 'display_colonies', 1, c_lienttranslate('Colony tile ${card_name} is activated'), [
                    'card_name' => $game->getTokenName($colo)
                ]);
            }
        }
    }

    function canFail(): bool {
        return true;
    }

    function canResolveAutomatically() {
        return false;
    }

    public function getPrompt() {
        return c_lienttranslate('${you} must select a colony tile to trade with');
    }

    protected function getOpName() {
        return c_lienttranslate('Trade with a colony');
    }
}
