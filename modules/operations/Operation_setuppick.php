<?php

declare(strict_types=1);


class Operation_setuppick extends AbsOperation {
    function effect(string $color, int $inc): int {
        $card_ids = $this->getCheckedArg('target');
        $corpmoney = 0;
        foreach ($card_ids as $card_id) {
            if (startsWith($card_id, "card_corp")) {
                if ($corpmoney > 0) $this->game->userAssertTrue(totranslate("You can only select one corporation"));
                $corpmoney = -$this->game->getRulesFor($card_id, 'cost');
                $this->game->effect_moveCard($color, $card_id, "hand_$color", MA_CARD_STATE_SELECTED, clienttranslate('You choose corporation ${token_name}'), [
                    "_private" => true
                ]);
            }
        }
        if ($corpmoney == 0) $this->game->userAssertTrue(totranslate("You must select one corporation"));
        $cost = 3;
        $count = 0;

        foreach ($card_ids as $card_id) {
            if (startsWith($card_id, "card_main")) {
                $corpmoney -= $cost;
                $this->game->effect_moveCard($color, $card_id, "hand_$color", MA_CARD_STATE_SELECTED, clienttranslate('You buy ${token_name}'), [
                    "_private" => true
                ]);
                if ($corpmoney < 0) {
                    $this->game->userAssertTrue(totranslate("You cannot afford that many cards with this choice of corporation"));
                }
                $count++;
            }
        }
        if ($count == 0) {
            $this->game->multiplayerpush($color,'confnocards');
            $this->game->notifyPlayer($this->getPlayerId(), 'message_warning', clienttranslate('You did not select any initial project cards, it may be not a good idea. Undo if not too late'), []);
        }
        return 1;
    }

    function checkIntegrity() {
        $c = $this->getUserCount();
        if ($c === null) $c = $this->getCount();
        if ($c != 1)
            throw new feException("Cannot use counter $c for this operation " . $this->mnemonic);
        return true;
    }

    function argPrimaryDetails() {
        $color = $this->color;
        $keys = array_keys($this->game->tokens->getTokensOfTypeInLocation("card_", "draw_${color}"));
        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            $info = ['q' => 0];
            $info['pre'] = $this->game->precondition($color, $tokenId);
            return $info;
        });
    }


    function getPrimaryArgType() {
        return 'token_array';
    }

    function getPrompt() {
        return clienttranslate('Select one corporation and up to 10 project cards (then submit all choices)');
    }

    function getOpName() {
        return clienttranslate('Confirm (Corp + Cards)');
    }

    function noValidTargets(): bool {
        return false;
    }


    function canResolveAutomatically() {
        return false;
    }

    function undo($onlyCheck = false) {
        $color = $this->color;
        $selected = $this->game->tokens->getTokensInLocation("hand_$color");
        $total = count($selected);
        if ($total == 0) throw new BgaUserException(self::_("Nothing to undo"));

        $this->game->systemAssertTrue("unexpected non multiplayer", $this->game->isInMultiplayerMasterState());

        $operations = $this->game->machine->getTopOperations($color);
        $op = array_shift($operations);
        $this->game->systemAssertTrue("unexpected state", $op);
        $optype = $op['type'];
        $this->game->systemAssertTrue("unexpected state $optype", $optype == 'finsetup' || $optype == 'confnocards');

        if ($onlyCheck) return;

        foreach ($selected as $card_id => $card) {
            $this->game->dbSetTokenLocation($card_id, "draw_$color", 0, '');
        }

        $this->game->queueremove($color,'confnocards');

        $this->game->multiplayerpush($color, $this->getMnemonic());
        $this->game->machine->normalize();
    }
}
