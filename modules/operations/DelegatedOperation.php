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
        $newop = $this->game->machine->createOperationSimple($type, $this->color, $opinfo['data']);
        if ($newop['type'] == $opinfo['type']) throw new BgaSystemException("Cannot create delegate for $type");
        $this->delegate = $this->game->getOperationInstance($newop);
    }

    function arg() {
        return $this->delegate->arg();
    }

    function action_resolve(array $args): int {
        $this->delegate->action_resolve($args);
        return $this->getCount();
    }

    function auto(string $owner, int &$count): bool {
        $loccount = $this->delegate->getCount();
        $refcount = $loccount * $count; // XXX
        return $this->delegate->auto($owner, $refcount);
    }

    function isVoid(): bool {
        return $this->delegate->isVoid();
    }

    function noValidTargets(): bool {
        return $this->delegate->noValidTargets();
    }

    protected function getMinCount(): int {
        return $this->delegate->getMinCount();
    }

    function isOptional() {
        return $this->delegate->isOptional();
    }

    function canSkipChoice(): bool {
        return $this->delegate->canSkipChoice();
    }

    function isFullyAutomated() {
        return $this->delegate->isFullyAutomated();
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
}
