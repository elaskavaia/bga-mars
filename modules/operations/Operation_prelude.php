<?php

declare(strict_types=1);


/** Finish prelude setup */
class Operation_prelude extends AbsOperation {
    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc): int {
        if (!$this->game->isPreludeVariant()) return 1;
        $player_id = $this->game->getPlayerIdByColor($color);
        if ($this->game->isZombiePlayer($player_id))  return 1;

        $this->game->setGameStateValue('gamestage', MA_STAGE_PRELUDE);
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_prelude_", "hand_{$color}");
        foreach ($rest as $card_id => $card) {
                $this->game->push($color, 'cardpre');
                //$this->game->effect_playCard($color, $card_id);
        }
        
        return 1;
    }
}
