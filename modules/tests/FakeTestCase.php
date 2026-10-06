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
    
    function assertEquals($expected, $actual, string $message = ''): void {
        if ($expected != $actual)  $this->fail($message ? $message : "$expected <> $actual");
    }
    function assertFalse($exp, $string = null) {
        if ($exp) $this->fail($string);
    }

    function assertNotEquals($expected, $actual, string $message = ''): void {
        if ($expected == $actual)  $this->fail($message ? $message : "$expected should not equal $actual");
    }

    function assertInstanceOf($clazz, $obj, string $message = ''): void {
        if (!($obj instanceof $clazz))  $this->fail($message);
    }

    function assertArrayHasKey($key, $array, string $message = ''): void {
        if (!array_key_exists($key, $array)) $this->fail($message ? $message : "missing key $key");
    }

    function assertArrayNotHasKey($key, $array, string $message = ''): void {
        if (array_key_exists($key, $array)) $this->fail($message ? $message : "unexpected key $key");
    }

    function assertStringNotContainsString(string $needle, string $haystack, string $message = ''): void {
        if (str_contains($haystack, $needle)) $this->fail($message ? $message : "unexpected '$needle'");
    }

    function expectExceptionMessage(string $message): void {
        $this->_expectedExceptionMessage = $message;
    }
}
