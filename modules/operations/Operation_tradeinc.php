<?php

declare(strict_types=1);

/** Increase colony trading power
 */
class Operation_tradeinc extends AbsOperation {
    function getTargetColony() {
        $colony = $this->getContext(0);
        $op = $this->getContext(1);
        if ($op == "e" || $op == "x") {
            return $colony;
        }
        return "";
    }

    function getPrimaryArgType() {
        if ($this->getTargetColony()) {
            return "";
        }
        return "token";
    }

    function argPrimaryDetails() {
        $colony = $this->getTargetColony();

        if (!$colony) {
            $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "display_colonies");
            $keys = array_keys($tokens);
        } else {
            $keys = [$colony];
        }
        $excluding = $this->getContext(3);
        $param = $this->getParam(0, "");
        $result = $this->getPossibleIncDecMoves($keys, $excluding, $param);
        if ($param != "steal") {
            return $result;
        }
        // steal is more complex
        $incset = $this->getTargetList($result);
        // if include set is empty its void
        if (count($incset) == 0) {
            return $result;
        }
        // if include set has only one valid target it has to be excluded from decrease
        if (count($incset) == 1) {
            $excluding = $incset[0];
        }
        $result2 = $this->getPossibleIncDecMoves($keys, $excluding, "dec");
        $decset = $this->getTargetList($result2);
        // if decrease set empty - we cannot do it
        if (count($decset) == 0) {
            return $result2;
        }
        // if decrease set has one item we have to remove it from increase set
        if (count($decset) == 1) {
            $onlydec = $decset[0];
            if (array_get($result, $onlydec)) {
                $result[$onlydec]["q"] = MA_ERR_MANDATORYEFFECT;
            }
            return $result;
        }
        return $result;
    }
    function getPossibleIncDecMoves($keys, $excluding, $param) {
        return $this->game->createArgInfo($this->color, $keys, function ($color, $colony) use ($excluding, $param) {
            if ($colony == "none" || $colony == $excluding) {
                return ["q" => MA_ERR_NOTAPPLICABLE, "level" => -1];
            }
            $state = $this->game->tokens->getTokenState($colony);

            if ($state < 0) {
                return ["q" => MA_ERR_PREREQ, "level" => $state];
            }
            if ($param == "reset") {
                // cont
            } elseif ($param == "dec") {
                $min = count($this->game->tokens->getTokensOfTypeInLocation("marker_", $colony));
                if ($state <= $min) {
                    return ["q" => MA_ERR_MANDATORYEFFECT, "level" => $state];
                }
            } else {
                if ($state >= 6) {
                    return ["q" => MA_ERR_MAXREACHED, "level" => $state];
                }
            }
            return ["q" => MA_OK, "level" => $state];
        });
    }
    function effect(string $owner, int $inc): int {
        $colony = $this->getCheckedArg("target");
        $this->game->systemAssertTrue("Cannot determine colony", $colony);

        $state = $this->game->tokens->getTokenState($colony);
        $this->game->systemAssertTrue("Colony is not active", $state >= 0);
        $location = $this->game->tokens->getTokenLocation($colony);
        $this->game->systemAssertTrue("Colony is is not in play", $location == "display_colonies");

        $param = $this->getParam(0, "");

        if ($param == "reset") {
            $colonies = count($this->game->tokens->getTokensOfTypeInLocation("marker_", $colony));
            $new_spot = $colonies;
        } elseif ($param == "dec") {
            $new_spot = $state - $inc;
            $colonies = count($this->game->tokens->getTokensOfTypeInLocation("marker_", $colony));
            if ($new_spot < $colonies) {
                $this->game->userAssertTrue(clienttranslate("Cannot reduce further"), false);
            }
        } else {
            $new_spot = $state + $inc;
            if ($new_spot >= 6) {
                $new_spot = 6;
            }
        }

        if ($param == "steal") {
            // decrease another
            $this->game->put($owner, "tradeinc(dec)", implode(":", ["", "", "", $colony]));
        }

        $this->game->dbSetTokenState($colony, $new_spot, clienttranslate('Trade income level of ${card_name} changes to ${new_state}'), [
            "card_name" => $this->game->getTokenName($colony),
        ]);

        return $inc;
    }

    function canFail(): bool {
        return true;
    }

    function isFullyAutomated() {
        if ($this->getTargetColony()) {
            return true;
        }
        return false;
    }

    public function getPrompt() {
        $param = $this->getParam(0, "");

        if ($param == "dec") {
            return clienttranslate('${you} must decrease colony trading income level');
        }
        return clienttranslate('${you} must confirm increase colony trading income level');
    }

    protected function getSkipButtonName() {
        return clienttranslate("Decline");
    }

    protected function getOpName() {
        return clienttranslate("Manipulate colony trading income level");
    }
}
