<?php

declare(strict_types=1);

class Operation_counter extends AbsOperation {

    function isVoid(): bool {
        return false;
    }

    function effect(string $owner, int $inc): int {
        // counter function, followed by expression
        // result of experssion is set as counter for top rank operation
        $par = $this->params;
        $params = explode(",", $par);
        $count = $this->game->evaluateExpression(trim($params[0]), $owner);
        $mincount = count($params) > 1 ? $this->game->evaluateExpression(trim($params[1]), $owner) : $count;
        if (!is_numeric($count))  throw new Exception("Did not evaluate to a number $par $count");
        $this->game->debugLog("-evaluted to $count");
        $this->game->machine->hide($this->op_info); // this cannot be part of top
        $tops = $this->game->machine->getTopOperations($owner);
        $this->game->machine->setCount($tops, $count, $mincount);
        return 1;
    }
}
