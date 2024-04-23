<?php

declare(strict_types=1);


/** Finish prelude setup */
class Operation_prelude extends AbsOperation {
    function getPrimaryArgType() {
        return '';
    }

    function effect(string $color, int $inc): int {
        //$player_id = $this->game->getPlayerIdByColor($color);
    
        if ($this->game->getGameStateValue('var_begginers_corp') == 1)  return 1;
        if (!$this->game->isPreludeVariant()) return 1;

        $this->game->setGameStateValue('gamestage', MA_STAGE_PRELUDE);
        // play prelude automatically
        $rest =  $this->game->tokens->getTokensOfTypeInLocation("card_prelude_", "hand_${color}");
        foreach ($rest as $card_id => $card) {
                $this->game->effect_playCard($color, $card_id);
        }
        
        return 1;
    }
}
