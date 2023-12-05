<?php

declare(strict_types=1);

namespace PHPUnit\Framework;

use feException;

class TestCase {
    function fail($string = null) {
        if ($string) throw new feException($string);
        else throw new feException("assertion failed");
    }
    function assertNotNull($exp, $string = null) {
        if ($exp === null) $this->fail($string);
    }
    function assertTrue($exp, $string = null) {
        if (!$exp) $this->fail($string);
    }
    function assertEquals($expected, $exp, $string = null) {
        if ($expected != $exp)  $this->fail($string);
    }
    function assertFalse($exp, $string = null) {
        if ($exp) $this->fail($string);
    }
}
