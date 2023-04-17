<?php declare(strict_types=1);

require_once "OpExpression.php";

/** This can evaluate simple math expressions for purposes of pre-condition evaluation
 *
 */
abstract class MathExpression {
    abstract public function evaluate($mapper);
    abstract public function __toString();
    static function parse($str) {
        return MathExpressionParser::parse($str);
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
        throw new Exception("Failed to resolved '$value'");
    }
     public function __toString() {
        return $this->left;
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

    public function evaluate($mapper) {
        $left = $this->left->evaluate($mapper);
        $right = $this->right->evaluate($mapper);
        $op = $this->op;
        return eval("return $left $op $right;");
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
    static function parse($str) {
        $parser = new MathExpressionParser($str);
        return $parser->parseExpression();
    }
    function peek() {
        if (count($this->tokens) == 0) {
            return null;
        }
        $pop = $this->tokens[0];
        return $pop;
    }
    function eos() {
        if (count($this->tokens) != 0) {
            throw new Exception("Unexpected tokens");
        }
    }

    function pop() {
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
            $this->eos();
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
            "/^(-\s*\d+)/" => "T_NUMBER",
        ]);
    }
    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new MathLexer();
        }

        return self::$instance;
    }
}
