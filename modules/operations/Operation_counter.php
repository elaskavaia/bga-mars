<?php

declare(strict_types=1);

class Operation_counter extends AbsOperation {

    function isVoid() : bool{
        return false;
    }

    function effect(string $owner, int $inc): int {
        // counter function, followed by expression
        // result of experssion is set as counter for top rank operation
        $par = $this->params ?? '';
        if (startsWith($par,"'")) {
            $par = substr($par, 1, strlen($par) - 2); // unquote
        }
        $count = $this->game->evaluateExpression($par, $owner);
        if (!is_numeric($count))  throw new Exception("Did not evaluate to a number $par $count");
        $this->game->debugConsole("-evaluted to $count");
        $tops = $this->game->machine->getTopOperations();
        $this->game->machine->setCount($tops, $count);
        return 1;
    }
}
