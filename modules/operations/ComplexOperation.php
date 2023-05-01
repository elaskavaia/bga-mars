<?php

declare(strict_types=1);


class ComplexOperation extends AbsOperation {
    private array $delegates;
    private string $operation;
    public function __construct(array $opinfo, PGameXBody $game) {
        parent::__construct($opinfo['type'], $opinfo, $game);
        $type = $this->mnemonic;
        $expr = OpExpression::parseExpression($type);
        $this->operation = $expr->op;
        $this->delegates = [];
        foreach ($expr->args as $arg) {
            $newop = $this->game->machine->createOperationSimple(OpExpression::str($arg), $this->color);
            $newop['data'] = $opinfo['data'];
            if ($newop['type'] == $opinfo['type']) throw new BgaSystemException("Cannot create delegate for $type");
            $this->delegates[] = $this->game->getOperationInstance($newop);
        }
    }

    protected function getPrimaryArgType() {
        return 'none';
    }

    protected function getVisargs() {
        $result =  [
            "name" => $this->getOpName(),
            'count' => $this->getCount(),
            "i18n" => ["name"]
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
        if ($rules) return $rules['name'];
        $op = $this->operation;

        switch ($op) {
            case ':':
                return $this->getRecName(" => ");
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


    protected function effect(string $owner, int $count): int {
        $userCount = $this->getUserCount();
        if ($this->game->expandOperation($this->op_info, $userCount)) {
            return 1;
        }
        $type = $this->op_info['type'];
        throw new BgaSystemException("Cannot auto-resove $type");
    }

    function canResolveAutomatically() {
        return false;
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
                case ',':
                case ';':
                case '+':
                    if ($subvoid == true) return true;
                    break;
                case '!':
                    break;
            }
        }
        return $subvoid;
    }
}
