<?php

declare(strict_types=1);

/**
 * Trade with colony
 * This can be void.
 * - when player's ship is already in another colony
 * - when its occupied
 * - cost 9m/3e/3u
 */
class Operation_trade extends AbsOperation {
    function argPrimaryDetails() {
        $colony = $this->getTargetColony();
        $color = $this->color;
        if (!$colony) {
            $par = $this->params();
            $free = $par == "free";
            $avail = $this->game->tokens->getTokensOfTypeInLocation("fleet_$color", "colo_fleet");
            if (count($avail) == 0) {
                $keys = ["none"];
                return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
                    return ["q" => MA_ERR_ALREADYUSED, "level" => 0];
                });
            }
            $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
            $keys = array_keys($tokens);
            return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($free) {
                $oncolony = $this->game->tokens->getTokensOfTypeInLocation("fleet_", $tokenId);
                $claimed = count($oncolony);
                $state = $this->game->tokens->getTokenState($tokenId);
                $q = MA_OK;
                if ($state < 0) {
                    $q = MA_ERR_PREREQ;
                } elseif ($claimed > 0) {
                    $q = MA_ERR_OCCUPIED;
                } elseif (!$free && !$this->canPayCost($tokenId)) {
                    $q = MA_ERR_COST;
                }

                return ["q" => $q, "level" => $state];
            });
        } else {
            // auto-resolve
            $keys = [$colony];
            return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
                $state = $this->game->tokens->getTokenState($tokenId);
                return ["q" => MA_OK, "level" => $state];
            });
        }
    }

    function checkVoid() {
        if ($this->isVoid()) {
            $op = $this->mnemonic;
            $info = $this->arg()["info"];
            // $this->game->userAssertTrue(toJson($this->arg()));
            $usertarget = array_key_first($info);
            $this->game->userAssertTrue(clienttranslate("This move is not allowed by the rules"), $usertarget, "Operation $op");
            $infotarget = array_get($info, $usertarget);
            $err = $infotarget["q"];
            switch ($err) {
                case MA_ERR_ALREADYUSED:
                    $this->game->userAssertTrue(clienttranslate("Cannot perform Trade: your fleet ship is already used this generation"));
                    break;
                case MA_ERR_OCCUPIED:
                    $this->game->userAssertTrue(clienttranslate("Cannot perform Trade: colony is occupied"));
                    break;
                case MA_ERR_COST:
                    $this->game->userAssertTrue(clienttranslate("Cannot perform Trade: you cannot afford it"));
                    break;
            }
        }
        return parent::checkVoid();
    }

    function getTargetColony() {
        $colony = $this->getContext(2);
        return $colony;
    }

    function canPayCost($tokenId) {
        $color = $this->color;
        if ($this->game->getTrackerValue($color, "u") >= 3) {
            return true;
        }
        if ($this->game->getTrackerValue($color, "e") >= 3) {
            return true;
        }
        $pay = $this->getPaymentExpr($tokenId);
        $payment_inst = $this->game->getOperationInstanceFromType($pay, $color, 1);
        if ($payment_inst->isVoid()) {
            return false;
        }
        return true;
    }

    function canSkipChoice() {
        return false;
    }

    function getPrimaryArgType() {
        $colony = $this->getTargetColony();
        if (!$colony) {
            return "token";
        } else {
            return "";
        }
    }

    public function checkIntegrity() {
        return $this->checkIntegritySingleton();
    }

    public function getPaymentExpr($colony) {
        $listeners = $this->game->collectListeners($this->color, "onPay_trade", null, $colony);

        $counts = ["m" => 9, "e" => 3, "u" => 3];
        foreach ($listeners as $lisinfo) {
            $outcome = $lisinfo["outcome"];
            // at this point only discounts are any res
            $opexpr = $this->game->parseOpExpression($outcome);
            $res = $opexpr->args[0];
            if ($res == "q") {
                $counts["m"] -= 1;
                $counts["e"] -= 1;
                $counts["u"] -= 1;
            } else {
                $counts[$res] -= 1;
            }
        }
        $m = $counts["m"];
        $e = $counts["e"];
        $u = $counts["u"];
        return "{$m}nm/{$e}ne/{$u}nu";
    }

    function effect(string $owner, int $inc): int {
        $colony = $this->getTargetColony();

        if (!$colony) {
            $par = $this->params();
            $free = $par == "free";
            $colony = $this->getCheckedArg("target");

            // that is last action before triggered effects and payment
            $data = [$this->getContext(0), $this->getContext(1), $colony];
            $this->game->push($owner, "trade", implode(":", $data));
            $this->game->machine->interrupt();

            $this->game->triggerEffect($owner, "on_trade", $colony);

            if (!$free) {
                $this->game->push($owner, $this->getPaymentExpr($colony), "op_trade");
            }

            return $inc;
        }
        $card = $colony;
        $avail = $this->game->tokens->getTokensOfTypeInLocation("fleet_$owner", "colo_fleet");
        $ship = array_key_first($avail);
        $this->game->systemAssertTrue("Trade error", $ship);
        $step = $this->game->tokens->getTokenState($card);

        $this->game->dbSetTokenLocation(
            $ship,
            $card,
            1,
            clienttranslate('${player_name} trades on ${card_name} with power of ${step}'),
            [
                "card_name" => $this->game->getTokenName($card),
                "step" => $step,
            ],
            $this->getPlayerId()
        );

        $rules = $this->game->getRulesFor($card, "*");
        $trade_res = $rules["i"];
        $trade_slots = $rules["slots"];
        $op = $trade_slots[$step] . $trade_res;

        // that is last action after trade bonuses
        $this->game->push($owner, "tradeinc(reset)", "$card:x");
        $this->game->machine->interrupt();

        $this->game->putInEffectPool($owner, $op, "$card:trade_bonus");

        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker_", $card);

        $trade_res = $rules["a"];
        foreach ($markers as $markerId => $info) {
            // each player with colony gets trading bonus
            $other = getPart($markerId, 1);
            $this->game->putInEffectPool($other, $trade_res, "$card:colo_bonus");
        }

        return $inc;
    }
    static function activateColoniesOnPlayCard($proj, $game) {
        $holds = "x";
        if ($proj) {
            $holds = $game->getRulesFor($proj, "holds", "");
            if (!$holds) {
                return;
            }
        }
        $colonies = $game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
        foreach ($colonies as $colo => $info) {
            if ($info["state"] >= 0) {
                continue;
            }
            $prod = $game->getRulesFor($colo, "prod", "");
            $activate = false;
            if (!$prod) {
                $activate = true;
            } elseif (!$proj) {
                // check all cards
                $cards = $game->tokens->getTokensOfTypeInLocation("card", "tableau_%");
                foreach ($cards as $card => $info) {
                    $holds = $game->getRulesFor($card, "holds", "");
                    if ($holds == $prod) {
                        $activate = true;
                        break;
                    }
                }
            } elseif ($proj) {
                if ($holds == $prod) {
                    $activate = true;
                }
            }
            if ($activate) {
                $game->dbSetTokenLocation($colo, "display_colonies", 1, clienttranslate('Colony tile ${card_name} is activated'), [
                    "card_name" => $game->getTokenName($colo),
                ]);
            } elseif (!$proj) {
                $game->notifyMessage(
                    clienttranslate(
                        'Colony tile ${card_name} is not yet activated because no player possesses a card that holds required resources'
                    ),
                    [
                        "card_name" => $game->getTokenName($colo),
                    ]
                );
            }
        }
    }

    function canFail(): bool {
        return true;
    }

    function canResolveAutomatically() {
        $colony = $this->getTargetColony();
        if (!$colony) {
            return false;
        }
        return true;
    }

    public function getPrompt() {
        return clienttranslate('${you} must select a colony tile to trade with');
    }

    protected function getOpName() {
        return clienttranslate("Trade");
    }
}
