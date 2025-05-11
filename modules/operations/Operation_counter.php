<?php

declare(strict_types=1);

class Operation_counter extends AbsOperation {

    function isVoid(): bool {
        return false;
    }

    function evaluate() {

        $owner = $this->getOwner();
        $expr = $this->getParam(0);
        $min = $this->getParam(1, '');
        $max = $this->getParam(2, '');
        if ($min === 'null') $min = '';

        $count = $this->game->evaluateExpression(trim($expr), $owner, $this->getContext(), ['wilds' => []]);
        if (!is_numeric($count))  throw new Exception("Did not evaluate to a number $expr $count");

        if ($max) {
            $maxcount = (int) $max;
            if ($count > $maxcount) $count = $maxcount;
        }

        $mincount = $min  ? $this->game->evaluateExpression(trim($min), $owner, $this->getContext(), ['wilds' => []]) : $count;
        if (!is_numeric($mincount))  throw new Exception("Did not evaluate to a number $min $mincount");


        return [$count, $mincount];
    }

    function effect(string $owner, int $inc): int {
        // counter function, followed by expression
        // result of experssion is set as counter for top rank operation
        list($count, $mincount) = $this->evaluate();
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
