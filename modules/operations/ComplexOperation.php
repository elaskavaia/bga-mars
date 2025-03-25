<?php

declare(strict_types=1);


class ComplexOperation extends AbsOperation {
    private array $delegates;
    private string $operation;
    public function __construct(array $opinfo, PGameXBody $game) {
        parent::__construct($opinfo['type'], $opinfo, $game);
        $type = $this->mnemonic;
        $expr = $this->game->parseOpExpression($type);
        $this->operation = $expr->op;
        $this->delegates = [];
        foreach ($expr->args as $arg) {
            $newop = $this->game->machine->createOperationSimple(OpExpression::str($arg), $this->color, $opinfo['data'], $opinfo['id']);
            if ($newop['type'] == $opinfo['type']) throw new BgaSystemException("Cannot create delegate for $type");
            $this->delegates[] = $this->game->getOperationInstance($newop);
        }
    }

    function getPrimaryArgType() {
        return '';
    }

    protected function getVisargs() {
        $result =  [
            "name" => $this->getOpName(),
            'count' => $this->getCount()
        ];

        return $result;
    }

    private function getRecName($join) {
        $args = [];
        $pars = [];
        foreach ($this->delegates as $i => $sub) {
            $pars[] = "p$i";
            $args["p$i"] = ["log" => $sub->getButtonName(), "args" => $sub->getVisargs()];
        }
        $log = implode($join, array_map(function ($a) {
            return '${' . $a . '}';
        }, $pars));
        $args["i18n"] = $pars;
        return  ['log' => $log, 'args' => $args];
    }

    protected function getOpName() {
        $rules = $this->rules();
        $name = array_get($rules,'name');
        if ($name) return $name;
        
        $op = $this->operation;

        switch ($op) {
            case ':':
                return $this->getRecName(" ⤇ ");
            case ',':
            case ';':
                return $this->getRecName("$op ");
            case '/':
            case '+':
                return $this->getRecName(" $op ");

            case '!':
                return $this->getRecName("")['args']['p0'];
        }

        return $this->mnemonic;
    }


    protected function getPrompt() {
        return  clienttranslate('${you} must confirm ${name}');
    }

    function getSkipButtonName(){
        if ($this->isOptional()) return clienttranslate('Skip');
        return parent::getSkipButtonName();
    }

    function auto(string $owner, int &$count): bool {
        $this->user_args = null;
        if (!$this->canResolveAutomatically()) return false; // cannot resolve automatically

        if ($this->isOptional()) {
            if ($this->noValidTargets()) {
                // skip
                $this->game->notifyMessage(clienttranslate('${player_name} skips effect ${name}: no valid targets'),[
                    "name" => $this->getOpName()
                ], $this->getPlayerId());
                return true;
            }
        }
        if (!$this->isFullyAutomated()) return false;


        foreach ($this->delegates as $i => $sub) {
            $refcount = $sub->getCount();
            $sub->checkVoid();
            $subvalue = $sub->auto($owner, $refcount);
            if ($subvalue == false) {
                throw new BgaSystemException("Cannot auto-resovle " . $sub->mnemonic);
            };
        }
        return true;
    }

    function checkVoid() {
        if ($this->isVoid()) {
            foreach ($this->delegates as $i => $sub) {
                $sub->checkVoid();
            }
        }
        parent::checkVoid();
    }


    function canFail(){
        if ($this->isOptional()) return false;
        return true;
    }


    protected function effect(string $owner, int $userCount): int {
        if ($this->game->expandOperation($this->op_info, $userCount)) {
            if ($userCount>=$this->getMinCount()) return $this->getCount(); // user picked less than all
            return $userCount;
        }
        $type = $this->op_info['type'];
        throw new BgaSystemException("Cannot auto-resove $type");
    }

    function canResolveAutomatically() {
        if ($this->getMinCount() == 0 || $this->isOptional()) {
            if ($this->noValidTargets()) return true; // auto skip
            return false;
        }
     
        if ($this->getMinCount() != $this->getCount()) return false;
        if ($this->operation == '/') return false;
        if ($this->operation == '+') return false;
        foreach ($this->delegates as $i => $sub) {
            $subvalue = $sub->canResolveAutomatically();
            if (!$subvalue) return false;
        }
        return $subvalue;
    }

    function requireConfirmation() {
        if ($this->isOptional()) return true;
        return false; // this has to be send to server to expand before confirmation
    }

    /** Test function */
    function checkIntegrity() {
        foreach ($this->delegates as $i => $sub) {
            $sub->checkIntegrity();
        }
        return true;
    }

    function isFullyAutomated() {
        foreach ($this->delegates as $i => $sub) {
            $subvalue = $sub->isFullyAutomated();
            if (!$subvalue) return false;
        }
        return $subvalue;
    }


    function isVoid(): bool {
        if ($this->getMinCount() == 0) return false;
        $op = $this->operation;
        $subvoid = false;
        foreach ($this->delegates as $i => $sub) {
            $subvoid = $sub->isVoid();
            switch ($op) {
                case '/':
                    if ($subvoid == false) return false;
                    break;
                case ':':
                    if ($subvoid == true) return true;
                    break;
                case ',':
                case ';':
                case '+':
                    if ($subvoid == false && $sub->hasNoSideEffects()) continue 2;
                    return $subvoid; // we only can check first operation because the other may depend on it
                case '!':
                    break;
            }
        }
        return $subvoid;
    }

    function noValidTargets(): bool {
        $op = $this->operation;
        $subvoid = false;
        foreach ($this->delegates as $i => $sub) {
            $subvoid = $sub->noValidTargets();
            switch ($op) {
                case '/':
                    return false; // cannot evaluate it may depends on order of operations
                case ':':
                    // we only need to check first part of operator
                    if ($subvoid == true) return true;
                    else return false;
                case ',':
                case ';':
                    if ($subvoid == true) return true;
                    else return false;
                case '+':
                    return false; // cannot evaluate it may depends on order of operations
                case '!':
                    break;
            }
        }
        return $subvoid;
    }
}
