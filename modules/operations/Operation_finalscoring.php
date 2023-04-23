<?php

declare(strict_types=1);


class Operation_finalscoring extends AbsOperation {
    function effect(string $owner, int $inc): int  {
        // TODO

        $this->game->debugConsole("-- final scoring --");
        $players = $this->game->loadPlayersBasicInfos();

        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker", "award%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // milestone_x
            $color = explode('_', $id)[1];
            $player_id = $this->game->getPlayerIdByColor($color);
            // XXX determine the winner
            $this->game->dbIncScoreValueAndNotify($player_id, 5, '*', "game_vp_award", ['place' => $loc]);
        }
        $markers = $this->game->tokens->getTokensOfTypeInLocation("marker", "milestone%");
        foreach ($markers as $id => $rec) {
            $loc = $rec['location']; // milestone_x
            $color = explode('_', $id)[1];
            $player_id = $this->game->getPlayerIdByColor($color);
            $this->game->dbIncScoreValueAndNotify($player_id, 5, '*', "game_vp_ms", ['place' => $loc]);
        }
        // score map, this is split per type for animation effects
        foreach ($players as $player) {
            $this->scoreMap($player["player_color"]);
        }

        foreach ($players as $player) {
            $this->scoreCards($player["player_color"]);
        }
        return 1;
    }
    function scoreMap(string $owner) {
    }

    function scoreCards(string $owner) {
        // get all cards, calculate VP field
        $player_id = $this->game->getPlayerIdByColor($owner);
        $cards = $this->game->tokens->getTokensOfTypeInLocation("card", "tableau_$owner");
        foreach ($cards as $card => $cardrec) {
            $vp  = $this->game->getRulesFor($card, 'vp');
            //$this->game->debugConsole(" $card -> $vp");
            if (!$vp) continue;
            if (is_numeric($vp)) {
                $this->game->dbIncScoreValueAndNotify($player_id, $vp, '*', "game_vp_cards", ['place' => $card]);
                continue;
            }
            try {
                $value = $this->game->evaluateExpression($vp, $owner, $card);
                if ($value) {
                    $this->game->dbIncScoreValueAndNotify($player_id, $value, '*', "game_vp_cards", ['place' => $card]);
                    continue;
                }
            } catch (Exception $e) {
                $this->game->debugConsole("error during expression eval $card=>'$vp'");
                $this->game->error("error during expression eval $vp");
                $this->game->error($e);
            }
        }
    }
}
