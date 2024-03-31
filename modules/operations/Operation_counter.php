<?php

declare(strict_types=1);

class Operation_counter extends AbsOperation {

    function isVoid(): bool {
        return false;
    }

    function evaluate(){
        $par = $this->params;
        $params = explode(",", $par);
        $owner = $this->getOwner();
        $count = $this->game->evaluateExpression(trim($params[0]), $owner, $this->getContext());
        $mincount = count($params) > 1 ? $this->game->evaluateExpression(trim($params[1]), $owner, $this->getContext()) : $count;
        if (!is_numeric($count))  throw new Exception("Did not evaluate to a number $par $count");
        if (!is_numeric($mincount))  throw new Exception("Did not evaluate to a number $par $mincount");
        return [$count,$mincount];
    }

    function effect(string $owner, int $inc): int {
        // counter function, followed by expression
        // result of experssion is set as counter for top rank operation
        list ($count,$mincount) = $this->evaluate();
        //$this->game->debugLog("-evaluted to $count:$mincount");
        $this->game->machine->hide($this->op_info); // this cannot be part of top
        $tops = $this->game->machine->getTopOperations($owner);
        $top = array_shift($tops);
        $this->game->machine->setCount($top, $count, $mincount);
        return 1;
    }

    function getPrimaryArgType() {
        return '';
    }
}
