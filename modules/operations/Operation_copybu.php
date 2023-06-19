<?php

declare(strict_types=1);


class Operation_copybu extends AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $map = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_${color}");
        $keys = array_keys($map);
        return $this->game->createArgInfo($color, $keys, function ($color, $card_id) {
            $tags = $this->game->getRulesFor($card_id, 'tags', '');
            if (!strstr($tags, 'Building')) return MA_ERR_PREREQ;
            $r = $this->game->getRulesFor($card_id, 'r', '');
            $subr = self::getProductionOnlyRules($r, $card_id);
            if (!$subr) return MA_ERR_NOTAPPLICABLE;
            if ($this->game->isVoidSingle($subr, $color, 1, $card_id)) return MA_ERR_MANDATORYEFFECT;
            return [
                'q'=>MA_OK,
                'r'=>$subr
            ];
        });
    }


    function canResolveAutomatically() {
        return false;
    }

    function getProductionOnlyRules($r, $card_id) {
        if ($card_id == 'card_main_207') return $r;
        // special rules for Mining Area and Mining Rights 
        if ($card_id == 'card_main_67' || $card_id == 'card_main_64') {
            $num = getPart($card_id, 2);
            $ohex = $this->game->tokens->getTokenLocation("tile_$num");
            $pp = $this->game->getProductionPlacementBonus($ohex);
            return $pp;
        }
        if (!$r) return '';
        $parsed = $this->game->parseOpExpression("nop,$r");
        $res = [];
        foreach ($parsed->args as $arg) {
            $subrule = OpExpression::str($arg);
            $un = $arg->toUnranged();
            $isprod = $this->game->getRulesFor("op_$un", 'opp', 0);
            if ($isprod) $res[] = $subrule;
        }
        return implode(",", $res);
    }

    function effect(string $color, int $inc): int {
        $card_id = $this->getCheckedArg('target');
        $r = $this->game->getRulesFor($card_id, 'r');
        $subr = self::getProductionOnlyRules($r, $card_id);
        $this->game->machine->push($subr, 1, 1, $color, MACHINE_FLAG_ORDERED, "$card_id:r");
        $this->game->notifyMessageWithTokenName(clienttranslate('${player_name} copies production box of ${token_name}'), $card_id, $color);
        return 1;
    }

    function getOpName() {
        return clienttranslate('Copy production box');
    }

    function getPrompt() {
        return clienttranslate('${you} must select a building card to copy production boxes');
    }
}
