<?php

declare(strict_types=1);

class Operation_turn extends AbsOperation {

    function getPrimaryArgType() {
        return '';
    }

    static function getStandardActions($solo, $skipsec = false) {
        $actions = ['card', 'stan', 'activate', 'convh', 'convp'];
        if (!$solo) {
            $actions[] = 'claim';
            $actions[] = 'fund';
        }
        if ($skipsec) {
            $actions[] = 'skipsec';
        } else {
            $actions[] = 'pass';
        }
        return $actions;
    }

    function getSpecialAction($owner) {
        $player_id = $this->game->getPlayerIdByColor($owner);
        $actnumber = $this->game->getStat('game_actions', $player_id);
        if ($actnumber == 1) {
            // first action of the game, some corp has some rules
            $corp = $this->game->tokens->getTokenOfTypeInLocation('card_corp', "tableau_$owner");
            if (!$corp) return; // XXX
            $corp_id = $corp['key'];
            $a1 = $this->game->getRulesFor($corp_id, 'a1', '');
            if ($a1) {
                return $a1;
            }
        }
        return '';
    }

    function effect(string $owner, int $inc): int {
        $player_id = $this->game->getPlayerIdByColor($owner);
        $this->game->gamestate->changeActivePlayer($player_id); 
        $this->game->setGameStateValue('gamestage', MA_STAGE_GAME);
        $this->game->incStat(1, 'game_actions',  $player_id);
        if ($this->game->getTrackerValue($owner, 'passed') == 2) {
            // auto-pass
            $this->game->queue($owner, 'pass');
            $pass = $this->game->getOperationInstanceFromType('pass',$owner);
            $pass->action_resolve(['count'=>1]);
            return 1;
        }
        $solo = $this->game->isSolo();
        $secondaction = $this->mnemonic == 'turn2';

        // first action of the game, some corp has some rules
        $a1 = $this->getSpecialAction($owner);
        if ($a1) {
            $this->game->notifyMessage(clienttranslate('${player_name} has a mandatory action to perform as a first action'),[],$player_id);
            $this->game->queue($owner, implode("/",[$a1,'pass']));
        } else {
            $this->game->queue($owner, implode("/", $this->getStandardActions($solo, $secondaction)));
        }


        if ($solo || $secondaction) {
            $pref = (int) $this->game->dbUserPrefs->getPrefValue($player_id, MA_PREF_CONFIRM_TURN);
            if ($pref) {
                $this->game->queue($owner, "confturn");
            }
        } else {
            $this->game->queue($owner, "turn2");
        }


        if (!$secondaction && !$this->game->isSolo()) $this->game->undoSavepoint();
        return 1;
    }
}
