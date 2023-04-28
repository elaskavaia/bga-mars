<?php

declare(strict_types=1);


class DelegatedOperation extends AbsOperation {
    public AbsOperation $delegate;
    public function __construct(array $opinfo, PGameXBody $game) {
        parent::__construct($opinfo['type'], $opinfo, $game);
        $type = $this->mnemonic;
        $newop = $this->game->machine->createOperationSimple($type, $this->color);
        if ($newop['type'] == $opinfo['type']) throw new BgaSystemException("Cannot create delete for $type");
        $newop['data']=$opinfo['data'];
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
        $count =  $this->getCount();
        return $this->delegate->auto($owner, $loccount);
    }

    function isVoid(): bool {
        return $this->delegate->isVoid();
    }
    function isAutomatic() {
        return $this->delegate->isAutomatic(); 
    }
}
