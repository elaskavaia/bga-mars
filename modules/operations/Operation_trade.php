<?php

declare(strict_types=1);

/** 
 * Trade with colony
 * This can be void.
 * - when player's ship is already in another colony
 * - when its occupied
 * - cost 9m/3e/3u
 */
class Operation_trade extends  AbsOperation {
    function argPrimaryDetails() {
        $colony = $this->getContext(0);
        $color = $this->color;
        if (!$colony) {
            $par = $this->params();
            $free = $par == 'free';
            $myfleet_location = $this->game->tokens->getTokenLocation("fleet_$color");
            if ($myfleet_location != 'colo_fleet') {
                $keys = [$myfleet_location];
                return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
                    return MA_ERR_ALREADYUSED;
                });
            }
            $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
            $keys = array_keys($tokens);
            return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($free) {
                $oncolony = $this->game->tokens->getTokensOfTypeInLocation("fleet_", $tokenId);
                $claimed = count($oncolony);
                $state = $this->game->tokens->getTokenState($tokenId);
                $q = MA_OK;
                if ($state < 0) $q = MA_ERR_PREREQ;
                else if ($claimed > 0) $q = MA_ERR_OCCUPIED;
                else if (!$free && !$this->canPayCost()) $q = MA_ERR_COST;

                return ['q' => $q, 'level' => $state];
            });
        } else {
            // auto-resolve
        }
    }

    function canPayCost() {
        $color = $this->color;
        if ($this->game->getTrackerValue($color, 'u') >= 3) return true;
        if ($this->game->getTrackerValue($color, 'e') >= 3) return true;
        $payment_inst = $this->game->getOperationInstanceFromType("9nm", $color, 1);
        if ($payment_inst->isVoid()) return false;
        return true;
    }

    function getPrimaryArgType() {
        $colony = $this->getContext(0);
        if (!$colony)
            return 'token';
        else
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
        $colony = $this->getContext(0);
        if (!$colony) {
            $par = $this->params();
            $free = $par == 'free';
            $card = $this->getCheckedArg('target');
            if ($free) {
                $colony = $card;
            } else {
                if ($card === 'none') $this->game->userAssertTrue('Trade fleet is already used this turn');
                $this->game->push($owner, "9nm/3ne/3nu", "op_trade");
                $this->game->put($owner, "trade", $card);
                return $inc;
            }
        }
        $card = $colony;
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

        $this->game->putInEffectPool($owner, $op, "$card:trade_bonus");

        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $card);
        $colonies = count($markers);
        $new_spot = $colonies;

        $this->game->dbSetTokenState($card, $new_spot, c_lienttranslate('Trading power of ${card_name} resets to ${step}'), [
            'card_name' => $this->game->getTokenName($card),
            'step' => $new_spot
        ]);

        if (count($markers) > 0) {
            $this->game->dbSetTokenState($card, $new_spot, c_lienttranslate('Each player with Colony on ${card_name} receives trading bonus'), [
                'card_name' => $this->game->getTokenName($card)
            ]);
        }

        $trade_res = $rules['a'];
        foreach ($markers as $markerId => $info) {
            // each player with colony gets trading bonus
            $other = getPart($markerId, 1);
            $this->game->putInEffectPool($other, $trade_res, "$card:colo_bonus");
        }

        return $inc;
    }
    static function activateColoniesOnPlayCard($proj, $game) {
        $holds = 'x';
        if ($proj) {
            $holds = $game->getRulesFor($proj, 'holds', '');
            if (!$holds) return;
        }
        $colonies = $game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        foreach ($colonies as $colo => $info) {
            if ($info['state'] >= 0) continue;
            $prod = $game->getRulesFor($colo, 'prod', '');
            if ((!$prod && !$proj) || $holds == $prod) {
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
        $colony = $this->getContext(0);
        if (!$colony) {
            return false;
        }
        return true;
    }

    public function getPrompt() {
        return c_lienttranslate('${you} must select a colony tile to trade with');
    }

    protected function getOpName() {
        return c_lienttranslate('Trade with a Colony');
    }
}
