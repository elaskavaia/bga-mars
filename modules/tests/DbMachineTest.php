<?php

declare(strict_types=1);


use PHPUnit\Framework\TestCase;


require_once "modules/DbMachine.php";
require_once "modules/tests/MachineInMem.php";

final class DbMachineTest extends TestCase {
    public function assertEqualsArr($expected, $table, $message = "") {
        if (is_array($expected)) {
            $this->assertEquals($expected, $table, $message);
        } else {
            $this->assertEquals([$expected], $table, $message);
            $this->assertEquals(1, count($table), $message);
        }
    }

    private function getMachine($input) {
        $m = new MachineInMem();
        $m->insertRule($input);

        return $m;
    }

    private function getInsertTable($input) {
        $m = $this->getMachine($input);
        $table = $m->gettablearr();
        return $table;
    }
    private function getInsertExpr($input) {
        $m = $this->getMachine($input);
        $table = $m->gettableexpr();
        return $table;
    }
    public function assertRoundtrip($input) {
        $ex = OpExpression::parseExpression($input);
        $func = $ex->toFunc();

        $tfunc = $this->getInsertExpr($input);
        $this->assertEquals($func, $tfunc);
    }

    private function assertInsertRule($expected, $input) {
        $table = $this->getInsertTable($input);
        $this->assertEqualsArr($expected, $table);
    }

    public function testInsertRuleForNegativeOp() {
        $this->assertInsertRule("1|1|na||2|2|,|", "2na");
    }
    public function testInsertRuleOrNum() {
        $m = $this->getMachine("5m/M;x");
        $this->assertEquals(1, $m->getTopRank());
        $this->assertEquals(2, $m->getExtremeRank(true));
        $top = $m->getTopOperations();
        $this->assertEqualsArr(["1|1|5m||1|1|/|", "2|1|M||1|1|/|"], $m->gettablearr($top));

        $this->assertInsertRule("1|1|a||2|2|,|", "2a");
    }

    public function testTable5m() {
        $input = "5m/M;x";
        $m = new MachineInMem();
        $m->insertRule($input);
        $tfunc = $m->gettableexpr();
        $this->assertEquals("(; (/ 5m M) x)", $tfunc);
    }

    public function testRoundtrip() {
        $this->assertRoundtrip("a/b/c");
        $this->assertRoundtrip("a/b/c;d");
        $this->assertRoundtrip("5a");

        // $this->assertRoundtrip("5a/3b");

        $this->assertRoundtrip("3?a");
        $this->assertRoundtrip("?(b/c)");
    }

    private function insertX($arr, $flags = MACHINE_OP_SEQ, $count = 1, $mincount = 1) {
        $m = new MachineInMem();
        if (is_array($arr)) {
            $m->insertX($arr, 1, $mincount, $count, null, $flags);
        } else {
            $m->insertMC($arr, 1, $mincount, $count, null, $flags);
        }
        return $m->gettablearr();
    }
    private function assertInsert($input, $types, $flags = MACHINE_OP_SEQ, $count = 1, $mincount = null) {
        if ($mincount === null) $mincount = $count;
        $this->assertEqualsArr($this->insertX($types, $flags, $count, $mincount), $this->getInsertTable($input));
    }

    public function assertResolve($start, $resolve, $count, $rest, $exp_count) {
        $m = $this->getMachine($start);
        $index = $m->findByType($resolve);
        $this->assertNotNull($index, "Cound not find $resolve");
        $ret = $m->resolve($index, $count);

        $m2 = $this->getMachine($rest);
        $func = $m2->gettableexpr();
        $this->assertEquals($func, $m->gettableexpr());
        $this->assertEquals($exp_count, $ret["resolve_count"]);
    }

    /**
     *
     * a+b+c:2:us => a => a;b+c:1:us      ===  (a+b+c){2}   2^(a+b+c)
     * a+b+c:2:u  => a => 2a;b+c:2:u      ===  (2a+2b+2c)   2*(a+b+c)
     * a+b+c:1:u  => a => a;b+c:1:u       ===  (a+b+c)
     * a+b+c:2:s  => a => a;a/b/c:1:s     ===  (a/b/c)[2]   2*(a/b/c)
     * a+b+c:2:   => a => 2a;a/b/c:2      ===  (2a/2b/2c)+  [1,*]*(a/b/c)
     */
    public function testInsert() {
        $this->assertInsert("(a/b/c)", ["a", "b", "c"], MACHINE_OP_OR);
        $this->assertInsert("a/b/c", ["a", "b", "c"], MACHINE_OP_OR);
        $this->assertInsert("?a?b", ["?a", "?b"], MACHINE_OP_SEQ, 1);
        $this->assertInsert("a+b+c", ["a", "b", "c"], MACHINE_OP_AND);
        $this->assertInsert("2(a/b/c)", ["a", "b", "c"], MACHINE_OP_OR, 2);
        $this->assertInsert("?(a/b)", ["a", "b"], MACHINE_OP_OR, 1, 0);
        $this->assertInsert("2?ores(Microbe)", ["ores(Microbe)"], MACHINE_OP_SEQ, 2, 0);
        $this->assertInsert("?2ores(Microbe)", ["ores(Microbe)"], MACHINE_OP_SEQ, 2, 0);
    }

    public function testSimpleAnd() {
        $this->assertResolve("2^(a+b+c)", "a", null, "1^(b+c)", 1);
        $this->assertResolve("1(a+b+c)", "a", null, "b+c", 1);
        $this->assertResolve("a+b+c", "b", null, "a+c", 1);
        // $this->assertResolve("?(a+b+c)", "a", null, "2?^(b+c)", 1);
    }

    public function testSimpleOr() {
        $this->assertResolve("2(a/b/c)", "a", null, "a/b/c", 1);
        $this->assertResolve("2?(a/b/c)", "a", null, "?(a/b/c)", 1);
        $this->assertResolve("?(a/b/c)", "a", null, "", 1);
    }
    public function testSimplePay() {
        $this->assertResolve("d:m", "d", null, "m", 1);
        $this->assertResolve("d:m;d:m", "d", null, "m;d:m", 1);

        $this->assertEqualsArr(['1|1|d||-1|0|,|'], $this->getInsertTable("[0,]d"));
        $this->assertResolve("[0,]d", "d", null, "[0,]d", 1);
        //        $this->assertResolve("[0,](d:m)", "d:m", null, "[0,](d:m)", -1);   
    }

    public function testSimpleOrd() {
        $this->assertResolve("2s,2np_Any,o", "2s", null, "2np_Any,o", 1);
        $this->assertInsert("2s,2np_Any,o", ["2s", "2np_Any", "o"], MACHINE_OP_SEQ);
    }

    public function testExpand() {
        $m = new MachineInMem();
        $op = $m->insertMC("m,p", 1, 1, 1, PCOLOR, MACHINE_OP_SEQ, "", 0, "multi");
        $m->expandOp($op);
        $tops = $m->getTopOperations();
        $this->assertEquals(2, count($tops));
        $first = array_shift($tops);
        $this->assertEquals("multi", $first['pool']);
    }
}
