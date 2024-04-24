<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use function PHPUnit\Framework\assertEquals;
use function PHPUnit\Framework\assertFalse;
use function PHPUnit\Framework\assertTrue;

require_once "MathExpression.php";

final class MathExpressionTest extends TestCase {
    public function testOpExpressionPush(): void {
        $res = MathExpressionParser::parse("a1 + a2");
        $this->assertEquals("(a1 + a2)", $res->__toString());

        $res = MathExpressionParser::parse("a <= 10");
        $this->assertEquals("(a <= 10)", $res->__toString());

        $res = MathExpressionParser::parse("a <= -10");
        $this->assertEquals("(a <= -10)", $res->__toString());
        $mapper = function ($x) {
            return 10;
        };
        $this->assertEquals(0,$res->evaluate($mapper));

        $res = MathExpressionParser::parse("b >= 10");
        $this->assertEquals("(b >= 10)", $res->__toString());
        $mapper = function ($x) {
            return 1;
        };
        $this->assertEquals(0,$res->evaluate($mapper));

        $mapper = function ($x) {
            return 10;
        };
        $this->assertEquals(1,$res->evaluate($mapper));

        $res = MathExpressionParser::parse("(gen)");
        $this->assertEquals("gen", $res->__toString());
    }

    function checkExpr(string $expr, int $result, $mapper = null) {
        $res = MathExpressionParser::parse($expr);
        $this->assertEquals($expr, $res->__toString());
        $this->assertEquals($result,$res->evaluate($mapper));
    }
    function checkExprValue(string $expr, int $result, $mapper = null) {
        $res = MathExpressionParser::parse($expr);
        $this->assertEquals($result,$res->evaluate($mapper));
    }
    public function testOpExpressionEval(): void {
        $this->checkExprValue("2+2",4);
        $this->checkExpr("(2 + 2)",4);

        $this->checkExprValue("2 < 10",1);
        $this->checkExprValue("2 > 10",0);
        $this->checkExprValue("10 >= 10",1);
        $this->checkExprValue("10 <= 10",1);
        $this->checkExprValue("10 <= 11",1);
        $this->checkExprValue("10 >= 11",0);
        $this->checkExprValue("2*3",6);
        $this->checkExprValue("5/2",2);
        $this->checkExprValue("5%2",1);
        $this->checkExprValue("(1 + 2) + 3",6);
        $this->checkExpr("(1 & 1)",1);
        $this->checkExpr("((1 > 0) & (2 > 10))",0);

        //$this->checkExprValue("10 == 11",0);
        //$this->checkExprValue("10 == 10",1);

        $mapper = function ($x) {
            switch($x) {
                case 'a': return 3;
                case 'b': return 7;
                case 't': return -3;
                case 'g': return 1;
                default: return $x;
            }
        };

        $this->checkExpr("(a + 2)",5,$mapper);
        $this->checkExpr("(b - a)",4,$mapper);
        $this->checkExprValue("(a > 0) & (b > 0)",1,$mapper);
        $this->checkExprValue("t>=-10",1,$mapper);
        $this->checkExprValue("t<-1",1,$mapper);
        $this->checkExprValue("t>-1",0,$mapper);

        $this->checkExprValue("(g>=3)*4",0,$mapper);

        //$this->checkExpr("- a",-3,$mapper);
    }
}
