<?php

declare(strict_types=1);


class ComplexOperation extends AbsOperation {
    private array $delegates;
    private string $operation;
    public function __construct(array $opinfo, PGameXBody $game) {
        parent::__construct($opinfo['type'], $opinfo, $game);

        $type = $opinfo['type'];
        $expr = OpExpression::parseExpression($type);
        $this->operation = $expr->op;
        $this->delegates = [];
        foreach ($expr->args as $arg) {
            $newop = $this->game->machine->createOperationSimple(OpExpression::str($arg), $opinfo['owner']);
            if ($newop['type'] == $type) throw new BgaSystemException("Cannot create delegate for $type");
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


    protected function getOpName() {
        $rules = $this->rules();
        if ($rules) return $rules['name'];

        switch ($this->operation) {
            case ':':
                $pay = $this->delegates[0];
                $gain = $this->delegates[1];
                return ['log' => '${pay} => ${gain}', 'args' => [
                    "pay" => ["log" => $pay->getButtonName(), "args" => $pay->getVisargs()],
                    "gain" => ["log" => $gain->getButtonName(), "args" => $gain->getVisargs()]
                ]];

            case '!':
                $gain = $this->delegates[0];
                return ['log' => $gain->getButtonName(),  "args" => $gain->getVisargs()];
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
        return false;
    }
}
