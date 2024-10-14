<?php

declare(strict_types=1);

/** Operators:
 * / regular or (multiple operands)
 * + unordered and (multiple operands)
 * ^ unordered limited select i..e 2 of a,b,c unique
 * , ordered and, usually same priority
 * ; ordered and, usually different priority
 * @ nop operation, no operands
 * : 2 operands - pay:get
 * ? optional, alias for [0,1]a
 * ! atomic (if needed)
 */
class OpExpression extends APP_Object {
    public $op;
    public $from = 1;
    public $to = 1;
    public $args;


    function __construct(string $op, $args = []) {
        if (!is_string($op)) {
            throw new Exception("Operator should be string");
        }
        if (!is_array($args)) {
            throw new Exception("Operands should be an array");
        }
        $this->op = $op;
        $this->args = $args;
    }

    public function isAtomic() {
        return false;
    }

    public static function str($expr, $topop = ";") {
        $op = static::getop($expr);
        if ($expr instanceof OpExpression) {
            $res = $expr->__toString();
            if (OpParser::compareOperationRank($topop, $op) > 0) {
                $res = "($res)";
            }
        } else {
            $res = $expr;
        }
        return $res;
    }
    public static function json($str) {
        $expr = static::parseExpression($str);
        $res = $expr->toJson();
        return $res;
    }
    /**
     * when dumped to array items will look like
     * [op min max arg1 arg2 arg3]...
     * where arg are subexpression of operations
     */
    public static function arr($str) {
        $expr = static::parseExpression($str);
        $res = $expr->toArray();
        return $res;
    }

    public static function getop($expr) {
        if ($expr instanceof OpExpression) {
            return $expr->op;
        }
        return "!";
    }
    function __toString() {
        $op = $this->op;
        if ($op == "^") {
            $op = "+";
        }

        $opcount = count($this->args);
        if ($opcount == 1) {
            return static::str($this->args[0]);
        }
        if ($opcount == 0) {
            return "0";
        }

        $res = static::str($this->args[0]);
        for ($i = 1; $i < $opcount; $i++) {
            $res .= $op . static::str($this->args[$i]);
        }
        return $res;
    }

    function push($arg) {
        if (is_array($arg)) {
            $this->args = array_merge($this->args, $arg);
        } else {
            $this->args[] = $arg;
        }
    }
    public function toFunc() {
        $res = "(" . $this->op . " ";
        foreach ($this->args as $arg) {
            $res .= $arg->toFunc();
            $res .= " ";
        }
        $res = trim($res) . ")";
        return $res;
    }
    public function toArray() {
        $res = [$this->op, $this->from, $this->to];
        foreach ($this->args as $arg) {
            $res[] = $arg->toArray();
        }
        return $res;
    }

    public function toJson($options = 0) {
        return toJson($this->toArray(), $options);
    }

    public static function create($o, $args = []) {
        return new OpExpression($o, $args);
    }

    public static function parseExpression($rule, $defaultOp = ",") {
        return OpParser::parse($rule, $defaultOp);
    }
    function toUnranged() {
        return OpExpression::create($this->op, $this->args);
    }

    function isSimple() {
        return $this->op == "!";
    }

    function isUnranged() {
        return ($this->to == $this->from && $this->to == 1);
    }
}

class OpExpressionTerminal extends OpExpression {
    function __construct($expr) {
        parent::__construct("!");
        $this->push($expr);
    }
    public function __toString() {
        return $this->args[0];
    }
    public function toFunc() {
        return $this->args[0];
    }
    public function toArray() {
        return $this->args[0];
    }

    public function toJson($options = 0) {
        return '"' . $this->__toString() . '"';
    }

    public function isAtomic() {
        return true;
    }

    public static function create($expr, $args = []) {
        return new OpExpressionTerminal($expr);
    }
}
class OpExpressionRanged extends OpExpression {
    function __construct($from, $to, $expr = null) {
        parent::__construct("!");
        $this->from = $from;
        $this->to = $to;
        if ($expr) {
            $this->push($expr);
        }
    }
    static function createRanged($from, $to, $expr, $shared) {
        if ($from == $to && $to == 1 && $shared == false) {
            return $expr;
        }

        $res = new OpExpressionRanged($from, $to);
        if ($expr instanceof OpExpressionTerminal) {
            $res->push($expr);
        } elseif ($expr instanceof OpExpressionRanged) {
            $res->push($expr);
        } else {
            $mop = $expr->op;
            if ($shared && $mop == "+") {
                $mop = "^";
            } elseif ($shared) {
                throw new Exception("Shared counter is not supported for this operation $mop");
            }

            if ($from == 0 && $to == 1) {
                if ($mop == "+") {
                    // convert to shared
                    $mop = "^";
                    $to = count($expr->args);
                    $res->to = $to;
                }
            }

            $res->op = $mop;

            //if ($mop == ',' && $to!=1) throw new Exception("Shared counter is not supported for this operation $mop");

            foreach ($expr->args as $subexpr) {
                $res->push($subexpr);
            }
        }
        return $res;
    }


    function __toString() {
        $res = parent::__toString();
        if (count($this->args) > 1) {
            $res = "($res)";
        }
        if ($this->op == "^") {
            $res = "^$res";
        }
        $from = $this->from;
        $count = $this->to;
        $optional = $from == 0;
        if ($count != 1 && $from != $count && $from != 0) {
            $res = "[$from,$count]" . $res;
            return $res;
        }
        if ($count == -1) {
            $res = "[$from,]" . $res;
            return $res;
        }
        if ($optional) {
            $res = "?$res";
        }
        if ($count != 1) {
            $res = $count . $res;
        }

        return $res;
    }

    public function toFunc() {
        $res = "(" . $this->op . " " . $this->from . " " . $this->to . " ";
        foreach ($this->args as $arg) {
            $res .= $arg->toFunc();
            $res .= " ";
        }
        $res = trim($res) . ")";
        return $res;
    }
}

class OpLexer {
    protected static $instance;

    public function  __construct() {
    }


    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new OpLexer();
        }

        return self::$instance;
    }

    public function getTerminalName($string) {
        $tname = "T_EOS";
        $this->nextToken($string, 0, $tname);
        return $tname;
    }
    public function tokenize($line, $bIgnoreWs = true) {
        $tokens = [];
        $offset = 0;
        $tname = "";
        while ($offset < strlen($line)) {
            $result = $this->nextToken($line, $offset, $tname);
            $len = strlen($result);
            if ($len == 0) {
                break;
            }
            $offset += $len;
            if ($bIgnoreWs && $tname == "T_WHITESPACE") {
                continue;
            }
            $tokens[] = $result;
        }

        return $tokens;
    }

    function isdigit($c) {
        $ordc = ord($c);
        return $ordc >= ord('0') && $ordc <= ord('9');
    }
    function isident($c) {
        $ordc = ord($c);
        return $c == '_' || ($ordc >= ord('0') && $ordc <= ord('9')) || ($ordc >= ord('a') && $ordc <= ord('z')) || ($ordc >= ord('A') && $ordc <= ord('Z'));
    }
    function isspace($c) {
        return $c == ' ';
    }
    protected function nextToken(string $line, $offset = 0, &$tname = null) {
        $tname = "T_EOS";
        $len = strlen($line);
        if ($line === '' || $offset >= $len) {
            return "";
        }
        for ($i = $offset; $i < $len; $i++) {
            $c = $line[$i];
            switch ($tname) {
                case "T_NUMBER":
                    if ($this->isdigit($c)) break;
                    return substr($line, $offset, $i - $offset);
                case "T_WHITESPACE":
                    if ($this->isspace($c)) break;
                    return substr($line, $offset, $i - $offset);
                case "T_IDENTIFIER":
                    if ($this->isident($c)) break;
                    return substr($line, $offset, $i - $offset);
                case "T_STRING":
                    if ($c == "'") {
                        return substr($line, $offset, $i - $offset + 1);
                    }
                    break;
                case "T_EOS":
                    if ($this->isdigit($c)) {
                        $tname = "T_NUMBER";
                        break;
                    }
                    if ($this->isspace($c)) {
                        $tname = "T_WHITESPACE";
                        break;
                    }
                    if ($this->isident($c)) {
                        $tname = "T_IDENTIFIER";
                        break;
                    }
                    if ($c == "'") {
                        $tname = "T_STRING";
                        break;
                    }
                    if ($i + 1 < $len) {
                        $cnext = $line[$i + 1];
                        if ($cnext == '=') {
                            if ($c == '<' || $c == '>' || $c == '=') {
                                $tname = "T_OP";
                                return "{$c}{$cnext}";
                            }
                        }
                        if ($c == '-') {
                            if ($this->isdigit($cnext)) {
                                $tname = "T_NUMBER";
                                break;
                            }
                        }
                    }
                    $tname = $c;
                    return $c;
                default:
                    throw new Error("invalid state $tname");
            }
        }

        if ($tname == "T_STRING") throw new Error("unclosed string");
        if ($tname != "T_EOS") return substr($line, $offset);

        throw new Error("invalid state $tname");
    }
}

class OpParser {
    private $tokens;
    private $lexer;
    public $defaultOp = ",";

    static $binary_operator_priority = [
        ";" => 1,
        ":" => 2,
        "/" => 3,
        "+" => 4,
        "," => 5,
        "!" => 6
    ];

    public static function compareOperationRank($pop, $cop) {
        $prank = $binary_operator_priority[$pop] ?? 0;
        $crank = $binary_operator_priority[$cop] ?? 0;
        return $prank <=> $crank;
    }

    function __construct($str) {
        $this->lexer = new OpLexer();
        $tokens = $this->lexer->tokenize($str);
        $this->tokens = $tokens;
    }
    public function parseError($text) {
        throw new Exception($text);
    }
    static function parse($str, $defaultOp = ",") {
        $parser = new OpParser($str);
        $parser->defaultOp = $defaultOp;
        return $parser->parseExpression();
    }
    function peek() {
        if ($this->isEos()) {
            return null;
        }
        $pop = $this->tokens[0];
        return $pop;
    }
    function eos() {
        if (!$this->isEos()) {
            throw new Exception("Unexpected token " . $this->peek());
        }
    }
    function isEos() {
        return (count($this->tokens) == 0);
    }

    function pop() {
        if ($this->isEos()) {
            throw new Exception("Cannot shift");
        }
        $pop = array_shift($this->tokens);
        return $pop;
    }
    function consume($bip) {
        $pop = $this->pop();
        if ($bip != $pop) {
            throw new feException("Expected $bip but got $pop");
        }
    }
    function parseTerm() {
        $lookup = $this->peek();
        if ($lookup === null) {
            $this->parseError("Unexpected end of expression");
        }
        if ($lookup == "(") {
            $this->consume("(");
            $expr = $this->parseExpression();
            $this->consume(")");
            return $expr;
        }
        $op = $this->pop();
        $tt = $this->lexer->getTerminalName($op);

        if ($tt != "T_IDENTIFIER" && $tt != "T_STRING"  && $tt != "T_NUMBER"  && $tt != "T_STRING") {
            throw new feException("Unexpected token '$op' $tt");
        }
        if ($tt == "T_IDENTIFIER") {
            $lookup = $this->peek();
            if ($lookup == '(') {
                // function all
                $this->consume("(");
                $parms = $this->parseExpression();
                $this->consume(")");
                $args = $parms->__toString();
                return OpExpressionTerminal::create("$op($args)");
            }
        }

        return  OpExpressionTerminal::create($op);
    }


    public function parseRangedExpression() {
        if ($this->isEos()) {
            $this->parseError('Expected expression');
        }

        $from = 1;
        $to = 1;
        $shared = false;
        $optional = false;
        $numeric = false;

        $op = $this->peek();
        if ($op == "[") {
            $this->pop();
            $from =  $this->pop();
            $this->consume(',');
            $to =  $this->pop();
            if ($to == "]") {
                $to = -1;
            } else {
                $this->consume(']');
            }
            $op = $this->peek();
            if ($op == "^") {
                $this->pop();
                $shared = true;
                $op = $this->peek();
            }
        } else {
            if (is_numeric($op)) {
                $this->pop();
                $to = $op;
                $from = $op;
                $numeric = true;
                $op = $this->peek();
            }
            if ($op == "?") {
                $this->pop();
                $optional = true;
                $op = $this->peek();

                if (is_numeric($op)) {
                    $this->pop();
                    $to = $op;
                    $from = $op;
                    $numeric = true;
                    $op = $this->peek();
                }
            }
            if ($op == "^") {
                $this->pop();
                $shared = true;
                $op = $this->peek();
            }
        }
        $pr = static::$binary_operator_priority[$op] ?? null;
        if ($pr !== null || $op == ')') {
            if ($numeric)
                return OpExpressionTerminal::create($to);
            else
                $this->parseError("Unexpected token $op");
        }

        if ($optional) $from = 0;
        $node = self::parseTerm();
        return OpExpressionRanged::createRanged($from, $to, $node, $shared);
    }

    function parseExpression($min_priority = 1) {
        $node = $this->parseRangedExpression();

        while (!$this->isEos()) {
            $val = $this->peek();
            $pr = static::$binary_operator_priority[$val] ?? null;
            $has_op = false;
            if ($pr) { // binary operation
                $has_op = true;
            } else if ($val == ')') {
                break;
            } else {
                $val = $this->defaultOp;
                $pr = static::$binary_operator_priority[$val];
            }
            if ($pr < $min_priority) {
                return $node;
            }
            if ($has_op)
                $this->pop();
            $rnode = $this->parseExpression($pr + 1);
            if ($rnode === false) {
                $this->parseError('Expected expression at the right side of ' . $val . ' operator');
            }
            if ($val != '!') {
                $prevop = OpExpression::getop($node);
                if ($prevop == $val) {
                    // append
                    $node->push($rnode);
                } else {
                    $node = OpExpression::create($val, [$node, $rnode]);
                }
            } else {
                $node = OpExpression::create($this->defaultOp, [$node, $rnode]);
            }
        }
        return $node;
    }
}
