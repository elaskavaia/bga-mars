<?php

declare(strict_types=1);


/**
 * Delegate operation is only need to resolve operations with count, like 2m
 * In this case mnemonic of this one is "2m" and count is 1, and delegate is "m" with count of "2"
 */
class DelegatedOperation extends AbsOperation {
    public AbsOperation $delegate;
    public function __construct(array $opinfo, PGameXBody $game) {
        parent::__construct($opinfo['type'], $opinfo, $game);
        $type = $this->mnemonic;
        $newop = $this->game->machine->createOperationSimple($type, $this->color, $opinfo['data'], array_get($opinfo,'id',0));
        if ($newop['type'] == $opinfo['type']) throw new BgaSystemException("Cannot create delegate for $type");
        $this->delegate = $this->game->getOperationInstance($newop);
    }

    function arg() {
        return $this->delegate->arg();
    }

    function action_resolve(array $args): int {
        $this->user_args =  $args;
   
        if ($this->getUserCount() > 0 || !$this->isOptional()) {
            $this->delegate->action_resolve($args);
        } else {
            $this->game->notifyWithName('message',clienttranslate('${player_name} skips ${name}'), $this->arg()['args'], $this->getPlayerId());
        }
        return $this->getCount();
    }

    function auto(string $owner, int &$count): bool {
        $loccount = $this->delegate->getCount();
        $refcount = $loccount * $count;  
        return $this->delegate->auto($owner, $refcount);
    }

    function isVoid(): bool {
        return $this->delegate->isVoid();
    }

    function noValidTargets(): bool {
        return $this->delegate->noValidTargets();
    }

    function getCount(): int {
        return parent::getCount();
    }

    // function getMinCount(): int
    // {
    //     return $this->delegate->getMinCount();
    // }


    function isOptional() {
        // its optional if delegate is, however mincount and count of this one is still 1
        return $this->delegate->isOptional();
    }

    function canSkipChoice(): bool {
        return $this->delegate->canSkipChoice();
    }

    function isFullyAutomated() {
        return $this->delegate->isFullyAutomated();
    }

    function requireConfirmation() {
        return false; // this has to be send to server to expand before confirmation
    }

    function canFail(){
        return $this->delegate->canFail();
    }

    function hasNoSideEffects(): bool {
        return $this->delegate->hasNoSideEffects();
    }

    function canResolveAutomatically() {
        return $this->delegate->canResolveAutomatically();
    }

    function checkIntegrity() {
        return $this->delegate->checkIntegrity();
    }

    function getPrimaryArgType() {
        return '';
    }
}
