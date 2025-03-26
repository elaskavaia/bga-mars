<?php

declare(strict_types=1);

/** 
 * Add colony tcard
 */
class Operation_colocard extends  AbsOperation {
    function argPrimaryDetails() {
        $color = $this->color;
        $tokens = $this->game->tokens->getTokensOfTypeInLocation("card_colo", "deck_colo");
        $keys = array_keys($tokens);

        return $this->game->createArgInfo($color, $keys, function ($color, $tokenId) {
            return MA_OK;
        });
    }

    function getPrimaryArgType() {
        return 'token';
    }


    public function checkIntegrity() {
        $c = $this->getUserCount();
        if ($c === null) $c = $this->getCount();
        if ($c != 1)
            throw new feException("Cannot use counter $c for this operation " . $this->mnemonic);
        return true;
    }

    function effect(string $owner, int $inc): int {
        $card = $this->getCheckedArg('target');

        $this->game->dbSetTokenLocation($card, 'display_colonies', -1, c_lienttranslate('Colony tile ${card_name} is put in play'), [
            'card_name' => $this->game->getTokenName($card)
        ]);

        $this->game->activateColonies();
        return $inc;
    }

    public function getPrompt() {
        return c_lienttranslate('${you} must select a colony tile to put in play');
    }

    protected function getOpName() {
        return c_lienttranslate('Add Colony tile');
    }
}
