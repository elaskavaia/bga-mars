<?php

declare(strict_types=1);


class Operation_passdraft extends AbsOperation {
    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc): int {
        $players = $this->game->loadPlayersBasicInfos();
        $save = [];


        foreach ($players as $player_id => $player) {
            $color = $player["player_color"];
            $selected = $this->game->tokens->getTokensInLocation("draw_$color", MA_CARD_STATE_SELECTED);
            // confirm draw
            foreach ($selected as $card_id => $card) {
                $this->game->effect_moveCard($color, $card_id, "draw_$color", 0, '', ["_private" => true]);
            }
            $rest = $this->game->tokens->getTokensInLocation("draft_$color");
            $save[$color] = $rest;
            foreach ($rest as $card_id => $card) {
                // since its private notif have to do it for both people
                $this->game->effect_moveCard($color, $card_id, "discard_main", 0, '', ["_private" => true]);
            }
        }
        foreach ($players as $player_id => $player) {

            if ($this->game->isZombiePlayer($player_id)) continue;
            $color = $player["player_color"];
            $rest =  $save[$color];
            $othercolor = $this->game->getNextDraftPlayerColor($color);
            foreach ($rest as $card_id => $card) {
                // have to move in two steps since otherwise draft will have mixed cards
                $this->game->effect_moveCard($othercolor, $card_id, "draft_$othercolor", 0, '', ["_private" => true]);
            }
        }

        $this->game->undoSavepoint();
        return 1;
    }
}
