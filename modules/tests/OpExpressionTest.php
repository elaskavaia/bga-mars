<?php declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once "DbMachine.php";
require_once "tests/MachineInMem.php";

final class OpExpressionTest extends TestCase {
    public function testOpExpressionPush(): void {
        $res = OpExpression::parseExpression("a1 + a2");
    
        $this->assertEquals("(+ a1 a2)", $res->toFunc());
    }
    public function testOpExpressionPush1(): void {
        $res = OpExpression::create("+");
        $res->push(OpExpressionTerminal::create("a1"));
        $this->assertEquals("(+ a1)", $res->toFunc());
    }

    private function assertExpressionParser($expected, $input) {
        $res = OpExpression::parseExpression($input);
        $this->assertInstanceOf(OpExpression::class, $res);
        $this->assertEquals($expected, $res->toFunc());
    }
    private function assertExpressionEq($expected, $input = null) {
        if ($input === null) {
            $input = $expected;
        }
        $res = OpExpression::parseExpression($input);
        $this->assertEquals($expected, OpExpression::str($res));
    }
    private function assertExpressionFail($input = null) {
        $this->expectException(Exception::class);
        $res = OpExpression::parseExpression($input);
    }

    public function testOpExpressionParser(): void {
        $this->assertExpressionParser("(+ a b)", "a+b");
        $this->assertExpressionParser("(, (/ a b) (/ c d))", "(a/b)(c/d)");
        $this->assertExpressionParser("(/ 2 2 a)", "2a");
        $this->assertExpressionParser("(/ 0 1 a)", "?a");
        $this->assertExpressionParser("(/ 0 2 a)", "2?a");
        $this->assertExpressionParser("(/ (/ 5 5 m) M)", "5m/M");
        $this->assertExpressionParser("(+ a b c)", "(a+b+c)");
        $this->assertExpressionParser("(+ 2 2 a b c)", "2(a+b+c)");
        $this->assertExpressionParser("(/ (/ 0 1 a) (/ 0 1 b))", "(?a/?b)");
        $this->assertExpressionParser("(: d m)", "d:m");
        $this->assertExpressionParser("(^ 2 2 a b)", "2^(a+b)");

        $this->assertExpressionEq("2a");
        $this->assertExpressionEq("a;b/c");
        $this->assertExpressionEq("a/b;c/d");
        $this->assertExpressionEq("5m/M");
        $this->assertExpressionFail("bb-aa");
        $this->assertExpressionEq("2^(a+b+c)");

        $this->assertExpressionEq("[2,4]a");
        $this->assertExpressionEq("?4a","[0,4]a");
        $this->assertExpressionEq("4a","[4,4]a");
        $this->assertExpressionEq("a/b+c");
        
        $this->assertExpressionEq('discard,m,[0,](discard,m)',"(discard,m)[0,](discard,m)");

        //"1*(?a/?b/?c)"
    }
    private function assertParseRange($str,$from,$to) {
        $input = $str;
        $list=OpExpression::parseRange($input);
        $this->assertNotFalse($list);
        $this->assertEquals($from,$list[0]);
        $this->assertEquals($to,$list[1]);
        $this->assertEmpty($input);
    }
    public function testOpExpressionParserRange(): void {
        $this->assertParseRange("[0,1]",0,1);
        $this->assertParseRange("[0,]",0,-1);
        $this->assertExpressionParser("(/ 0 1 a)", "[0,1]a");
    }

    public function testSplitByEmpty(): void {
        $this->assertTSplit(["abc", "(de)"], "abc(de)");
    }
    public function testSplitOr(): void {
        $this->assertTSplit(["a", "(c/d)"], "a/(c/d)", "/");
        $this->assertTSplit(["(c/d)"], "(c/d)", "/");
    }

    public function testSplitOrTokenizer(): void {
        $this->assertTSplit(["a", "b", "(c/d)"], "a/b/(c/d)", "/");
        $this->assertTSplit(["a", "b", "(c/d)"], "a b(c/d)", "");
    }

    private function assertTSplit($expected, $input, $sep = "") {
        $res = OpLexer::getInstance()->bSplit($input, $sep);
        $this->assertEquals($expected, $res);
    }
    public function testSplitGroup(): void {
        $this->assertTSplit(["(a/b)", "(c/d)", "aa"], "(a/b)(c/d)aa");
    }

    public function testToJson(): void {
        $input = "5m/M";
        $res = OpExpression::parseExpression($input);
        $this->assertEquals('["\/",1,1,["\/","5","5","m"],"M"]', $res->toJson());

        $this->assertEquals('"m"', OpExpression::json("m"));
        $this->assertEquals('["\/",1,1,["\/","5","5","m"],"M"]', OpExpression::json("5m/M"));
    }

    private function assertTokens($expected, $input) {
        $tokens = OpLexer::getInstance()->tokenize($input);
        $this->assertEqualsArr($expected, $tokens);
    }

    public function testTokenizer() {
        $this->assertTokens(["a", "+", "b"], "a+b");
        $this->assertTokens(["aa", "+", "b"], "aa+b");
        $this->assertTokens(["a", "+", "b"], "a + b ");
        $this->assertTokens(["2", "a"], "2a");
        $this->assertTokens(["a2"], "a2");
        $this->assertTokens(["-", "2"], "-2");
        $this->assertTokens("aa", "aa");
        $this->assertTokens(["2", "a"], "2a");
        $this->assertTokens("a2", "a2");
        $this->assertTokens("22", "22");
        $this->assertTokens(["-","a"], "-a");
        $this->assertTokens(["2", "aa", "34", "+"], "  2aa 34+");
        $this->assertTokens(["-","2","a"], "-2a");
    }

    public function assertEqualsArr($expected, $table, $message = "") {
        if (is_array($expected)) {
            $this->assertEquals($expected, $table, $message);
        } else {
            $this->assertEquals([$expected], $table, $message);
            $this->assertEquals(1, count($table), $message);
        }
    }
}
