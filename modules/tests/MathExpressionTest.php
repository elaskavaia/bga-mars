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
        assertEquals(0,$res->evaluate($mapper));

        $res = MathExpressionParser::parse("b >= 10");
        $this->assertEquals("(b >= 10)", $res->__toString());
        $mapper = function ($x) {
            return 1;
        };
        assertEquals(0,$res->evaluate($mapper));

        $mapper = function ($x) {
            return 10;
        };
        assertEquals(1,$res->evaluate($mapper));

        $res = MathExpressionParser::parse("(gen)");
        $this->assertEquals("gen", $res->__toString());
    }
}
