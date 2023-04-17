<?php declare(strict_types=1);

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
class OpExpression {
    public $op;
    public $from = 1;
    public $to = 1;
    public $args;
    static $binary_operator_list = [";", ":", "/", "+", ",", "!"];

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

    public static function compareOperationRank($pop, $cop) {
        $prank = array_search($pop, static::$binary_operator_list);
        $crank = array_search($cop, static::$binary_operator_list);
        return $prank <=> $crank;
    }

    public static function str($expr, $topop = ";") {
        $op = static::getop($expr);
        if ($expr instanceof OpExpression) {
            $res = $expr->toString();
            if (static::compareOperationRank($topop, $op) > 0) {
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
    function toString() {
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

    public static function parseRange(&$rules) {
        $tokens = OpLexer::getInstance()-> tokenize($rules);
        $op = array_shift($tokens);

        if ($op == "[") {
            $from = array_shift($tokens);
            $zap = array_shift($tokens);
            if ($zap != ",") {
                throw new feException(", is expected in range $op");
            }
            $to = array_shift($tokens);
            if ($to == "]") {
                $to = -1;
            } else {
                $sk = array_shift($tokens);
                if ($sk != "]") {
                    throw new feException(", is expected in range $op");
                }
            }
            $rules = join("", $tokens);
            return [$from, $to];
        }

        $next = count($tokens) > 0 ? $tokens[0] : "";
        if (is_numeric($op)) {
            $to = $op;
            $from = $op;
            if ($next == "?") {
                array_shift($tokens);
                $from = 0;
            }
            $rules = join("", $tokens);
            return [$from, $to];
        }
        if ($op == "?") {
            $from = 0;
            $to = 1;
            if (is_numeric($tokens)) {
                array_shift($tokens);
                $to = $next;
            }
            $rules = join("", $tokens);
            return [$from, $to];
        }

        return false;
    }
    public static function parseTerminal(&$rules) {
        $tokens = OpLexer::getInstance()-> tokenize($rules);
        $op = array_shift($tokens);
        $ttype = OpLexer::getInstance()-> getTerminalName($op);
        if ($ttype != "T_IDENTIFIER" && $ttype != "T_STRING") {
            throw new feException("unexpected token $op in $rules");
        }
        $rules = join("", $tokens);
        return OpExpressionTerminal::create($op);
    }
    public static function parseRangedExpression(&$rules) {
        if (!$rules) {
            return "";
        }

        $expr = self::parseRange($rules);
        if ($expr) {
            $from = $expr[0];
            $to = $expr[1];
        } else {
            $from = 1;
            $to = 1;
        }

        if (!$rules) {
            throw new Exception("Unexpected end of expression");
        }

        $ops = OpLexer::getInstance()->bSplit($rules, "", 2);

        $op = $ops[0];
        $shared = false;
        if ($op == "^") {
            $shared = true;
            array_shift($ops);
            $op = $ops[0];
        }
        if ($op[0] == "(") {
            $op = substr($op, 1, strlen($op) - 2);
            $res = self::parseExpression($op);
        } else {
            $res = self::parseTerminal($op);
        }

        if (count($ops) > 1) {
            $rules = $ops[1];
        } else {
            $rules = "";
        }

        return OpExpressionRanged::createRanged($from, $to, $res, $shared);
    }

    public static function parseExpression($rule, $defaultOp = ",") {
        if (!$rule) {
            return "";
        }

        foreach (static::$binary_operator_list as $x) {
            if ($x == "!") {
                break;
            }
            $ops = OpLexer::getInstance()->bSplit($rule, $x);
            if (count($ops) > 1) {
                $res = OpExpression::create($x);
                foreach ($ops as $op) {
                    $res->push(self::parseExpression($op));
                }
                return $res;
            }
            // contunue
        }

        $res = OpExpression::create($defaultOp);
        while (strlen($rule) > 0) {
            $expr = self::parseRangedExpression($rule);
            if (!$expr) {
                break;
            }
            $res->push($expr);
        }

        if ($res instanceof OpExpression && count($res->args) == 1) {
            return $res->args[0];
        }
        return $res;
    }
}

class OpExpressionTerminal extends OpExpression {
    function __construct($expr) {
        parent::__construct("!");
        $this->push($expr);
    }
    public function toString() {
        return $this->args[0];
    }
    public function toFunc() {
        return $this->args[0];
    }
    public function toArray() {
        return $this->args[0];
    }

    public function toJson($options = 0) {
        return '"' . $this->toString() . '"';
    }

    public static function create($expr, $args = []) {
        return new OpExpressionTerminal($expr);
    }
}
class OpExpressionRanged extends OpExpression {
    function __construct($from, $to, $expr = null) {
        parent::__construct("/");
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

    function toUnranged() {
        return OpExpression::create($this->op, $this->args);
    }

    function toString() {
        $res = parent::toString();
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
        if ($count != 1) {
            $res = $count . $res;
        }
        if ($optional) {
            $res = "?$res";
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
    protected $terminals = [
        "/^(\s+)/" => "T_WHITESPACE",
        "/^(\d+)/" => "T_NUMBER",
        "/^(\w+)/" => "T_IDENTIFIER",
        "/^('[^']*')/" => "T_STRING",
    ];

    protected function  __construct(){

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
    protected function nextToken($line, $offset = 0, &$tname = null) {
        $tname = "T_EOS";
        if (!$line || $offset >= strlen($line)) {
            return "";
        }
        $string = substr($line, $offset);
        foreach ($this->terminals as $pattern => $name) {
            if (preg_match($pattern, $string, $matches)) {
                $tname = $name;
                return $matches[1];
            }
        }
        $tname = $string[0];
        return $string[0];
    }

    public function bSplit($str, $separators, $limit = -1) {
        if (is_string($str)) {
            $tokens = $this->tokenize($str);
        } elseif (is_array($str)) {
            $tokens = $str;
        } else {
            throw new Exception("Unsupported for arg for bSplit");
        }
        $parts = [];
        $current = "";
        $count = 0;
        foreach ($tokens as $tok) {
            if ($separators && strpos($separators, $tok) !== false) {
                $is_sep = true;
                $break = true;
            } else {
                $is_sep = false;
                $break = false;
            }
            if (!$separators && $current) {
                $break = true;
            }
            if ($count == 0 && $break && ($limit == -1 || count($parts) < $limit - 1)) {
                // separator
                $parts[] = $current;
                $current = "";
            }
            if ($tok == "(" || $tok == "[") {
                $count++;
            }
            if ($tok == ")" || $tok == "]") {
                $count--;
            }
            if (!$is_sep || $count > 0) {
                $current .= $tok;
            }
        }
        $parts[] = $current;
        return $parts;
    }
}
