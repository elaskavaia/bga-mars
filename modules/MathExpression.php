<?php

declare(strict_types=1);

require_once "OpExpression.php";

/** This can evaluate simple math expressions for purposes of pre-condition evaluation
 *
 */
abstract class MathExpression {
    abstract public function evaluate($mapper);
    abstract public function __toString();
    abstract public function toArray();
    static function parse($str) {
        return MathExpressionParser::parse($str);
    }

    public static function arr($str) {
        $expr = static::parse($str);
        $res = $expr->toArray();
        return $res;
    }
}
class MathTerminalExpression extends MathExpression {
    public $left;
    function __construct($left) {
        $this->left = $left;
    }
    public function evaluate($mapper) {
        $value = $this->left;
        if (is_numeric($value)) {
            return $value;
        }
        if (!$value) {
            return 0;
        }
        $value = $mapper($value);
        if (is_numeric($value)) {
            return $value;
        }
        if (!$value) {
            return 0;
        }
        throw new feException("Failed to resolved MathTerminalExpression '$value'");
    }
    public function __toString() {
        return $this->left;
    }

    public function toArray(){
        return $this->left;
    }
}
class MathUnaryExpression extends MathExpression {
    public $op;
    public $right;
    function __construct(string $op, $right) {
        if (!is_string($op)) {
            throw new Exception("Operator should be string");
        }
        $this->op = $op;
        $this->right = $right;
    }
    public function __toString() {
        return sprintf("(%s(%s))", $this->op, $this->right);
    }
    public function evaluate($mapper) {
        $right = $this->right->evaluate($mapper);
        $op = $this->op;
        throw new feException("Cannot evaluate MathUnaryExpression");
        //$res = eval("return $op($right);");
        //return (int)($res);
    }

    public function toArray(){
        return [$this->op, $this->right->toArray()];
    }
}
class MathBinaryExpression extends MathExpression {
    public $op;
    public $left;
    public $right;

    function __construct(string $op, $left, $right) {
        if (!is_string($op)) {
            throw new Exception("Operator should be string");
        }
        $this->op = $op;
        $this->left = $left;
        $this->right = $right;
    }

    public function __toString() {
        return sprintf("(%s %s %s)", $this->left, $this->op, $this->right);
    }

    public function toArray(){
        return [$this->op, $this->left->toArray(), $this->right->toArray()];
    }

    public function evaluate($mapper) {
        $left = $this->left->evaluate($mapper);
        $right = $this->right->evaluate($mapper);
        $op = $this->op;
        //$res = eval("return $left $op $right;");
        $res = 0;
        switch($op) {
            case "+": $res =  $left + $right; break;
            case "-": $res =  $left - $right; break;
            case "/": $res =  $left / $right; break;
            case "%": $res =  $left % $right; break;
            case "*": $res =  $left * $right; break;
            case "<": $res =  $left < $right; break;
            case "<=": $res =  $left <= $right; break;
            case ">": $res =  $left > $right; break;
            case ">=": $res =  $left >= $right; break;
            case "==": $res =  $left == $right; break;
            case "&": $res =  $left & $right; break;
            case "|": $res =  $left | $right; break;
        
        }
        return (int)($res);
    }
}

class MathExpressionParser {
    private $tokens;
    private $lexer;
    function __construct($str) {
        $this->lexer = new MathLexer();
        $tokens = $this->lexer->tokenize($str);
        $this->tokens = $tokens;
    }
    static function parse($str): MathExpression {
        $parser = new MathExpressionParser($str);
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
            throw new Exception("Unexpected tokens " . join(" ", $this->tokens));
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
            throw new Exception("Expected $bip but got $pop");
        }
    }
    function parseTerm() {
        $lookup = $this->peek();
        if ($lookup == "(") {
            $this->consume("(");
            $expr = $this->parseExpression();
            $this->consume(")");
            return $expr;
        }
        $op = $this->pop();
        $tt = $this->lexer->getTerminalName($op);
        if ($tt != "T_IDENTIFIER" && $tt != "T_NUMBER") {
            throw new Exception("Unexpected token '$op' $tt");
        }
        return  new MathTerminalExpression($op);
    }
    function parseExpression() {
        $left = $this->parseTerm();
        $lookup = $this->peek();

        if ($lookup === null || $lookup === ')') {
            return $left;
        }
        $op = $this->pop();
        $tt = $this->lexer->getTerminalName($op);
        if ($tt == "T_IDENTIFIER" || $tt == "T_NUMBER") {
            throw new Exception("Unexpected token $op");
        }
        $right = $this->parseTerm();
        return new MathBinaryExpression($op, $left, $right);
    }
}

class MathLexer extends OpLexer {
    function __construct() {
        parent::__construct();
        $this->terminals = array_merge($this->terminals, [
            "/^(>=)/" => "T_OP",
            "/^(<=)/" => "T_OP",
            "/^(==)/" => "T_OP",
            "/^(-\s*\d+)/" => "T_NUMBER",
        ]);
    }
    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new MathLexer();
        }

        return self::$instance;
    }

    static function toregex(string $str) {
        if ($str[0]=='\'') {
            $str = static::unquote($str);
        } 

        if ($str[0]=='/') return $str;
        return "/^${str}\$/";
    }

    static function unquote(string $str) {
        return stripslashes(substr(substr($str, 1), 0, -1));
    }
}
