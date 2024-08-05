<?php

declare(strict_types=1);


class Operation_buycard extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_ids = $this->getCheckedArg('target');
        if (!is_array($card_ids)) {
            $card_ids = [$card_ids];
        }
        $count = count($card_ids);
        $money = $this->game->getTrackerValue($color, 'm');
        $cost = 3;
        $tcost = $cost * $count;
        if ($money >= $tcost) {
            // use money if can
            //$this->game->executeImmediately($color,"nm",$cost);
            $this->game->effect_incCount($color, "m", -$tcost); // direct pay cannot do execute immediatly it fails for Helion trying to ask user
        } else {
            foreach ($card_ids as $card_id) {
                $this->game->multiplayerpush($color, "{$cost}nm", "$card_id:a");
            }
        }
        foreach ($card_ids as $card_id) {
            $this->game->effect_moveCard($color, $card_id, "hand_$color", MA_CARD_STATE_SELECTED, clienttranslate('You buy ${token_name}'));
        }
        $this->game->notifyCounterChanged("hand_$color", ["nod" => true]);
        return $this->getCount(); //remove reset of the counter
    }

    function isVoid(): bool {
        if ($this->isOptional()) return false;
        if ($this->noValidTargets()) return true;
        return $this->game->isVoidSingle("3nm", $this->color);
    }

    function canSkipChoice() {
        return false;
    }

    function requireConfirmation() {
        return true;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_main", "draw_$color"));
        $hasmoney = !$this->game->isVoidSingle("3nm", $color);
        $q = MA_ERR_COST;
        if ($hasmoney) $q = MA_OK;
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) use ($q) {
            $info = ['q' => $q]; // cannot buy if have no money
            $this->game->playability($color, $tokenId, $info);
            return $info;
        });
    }

    function getPrimaryArgType() {
        if ($this->getCount() == 1) return 'token';
        return 'token_array';
    }

    protected function getSkipButtonName() {
        if ($this->getCount() == 1) return clienttranslate("Discard Card");
        return clienttranslate("Discard All");
    }

    function getPrompt() {
        if ($this->getCount() == 1) return clienttranslate('${you} may buy this card for 3 M€ or discard');
        return clienttranslate('${you} must select up to ${count} card/s to buy for 3 M€ each');
    }


    function undo() {
        $color = $this->color;

        $selected = $this->game->tokens->getTokensOfTypeInLocation("card_main", "hand_$color", MA_CARD_STATE_SELECTED);
        $count = count($selected);

        $rest = $this->game->tokens->getTokensInLocation("draw_$color");

        $my_operations = $this->game->machine->getTopOperations($color);
        $my_op = array_shift($my_operations);
        $this->game->systemAssertTrue("ERR:Operation_buycard:01", $my_op);
        $optype = array_get($my_op,'type',null);
     

        if ($optype != 'prediscard') {
            $this->game->userAssertTrue(totranslate("Nothing to undo"));
        }
   
        $total = $count + count($rest);

        foreach ($selected as $card_id => $card) {
            $this->game->effect_moveCard($color, $card_id, "draw_$color", MA_CARD_STATE_NORMAL);
            $this->game->effect_incCount($color, 'm', 3, ['message' => '']);
        }


        $this->game->multiplayerpush($color, $total . '?buycard');
        $this->game->machine->normalize();
    }
}
