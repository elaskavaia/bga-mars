<?php

declare(strict_types=1);

class Operation_embedded extends AbsOperation {
    public string $expr;

    public function __construct(string $op, PGameXBody $game) {
        parent::__construct('embedded', $game);
        $this->expr = substr($op, 1, strlen($op) - 2); // unquote
    }

    function isVoid($op, $args = null) {
        return false;
    }

    function auto(string $owner, int $inc, array $args = null) {
        if (startsWith($this->expr, '#')) {
            // counter function, followed by expression
            // result of experssion is set as counter for top rank operation
            $par = substr($this->expr, 1);
            $count = $this->game->evaluateExpression($par, $owner);
            if (!is_numeric($count))  throw new Exception("Did not evaluate to a number $par $count");
            $this->game->debugConsole("-evaluted to $count");
            $tops = $this->game->machine->getTopOperations();
            $this->game->machine->setCount($tops, $count);
        } else {
            throw new Exception("Unsupported embedded operation " . ($this->expr));
        }
        return true;
    }
}
