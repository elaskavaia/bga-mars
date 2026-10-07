<?php

// GLOBAL utility functions
function startsWith($haystack, $needle) {
    // search backwards starting from haystack length characters from the end
    return $needle === "" || strrpos($haystack, $needle, -strlen($haystack)) !== false;
}

function endsWith($haystack, $needle) {
    if ($haystack === null) {
        return false;
    }
    $length = strlen($needle);
    return $length === 0 || substr($haystack, -$length) === $needle;
}

function getPart($haystack, $i, $bNoException = false) {
    $parts = explode("_", $haystack);
    $len = count($parts);
    if ($bNoException && $i >= $len) {
        return "";
    }
    if ($i >= $len) {
        throw new feException("Access to $i >= $len for $haystack");
    }
    return $parts[$i];
}

/**
 * Return the first $i parts of the string (parts are separated by _)
 * I.e.
 * getPartsPrefix("a_b_c",2)=="a_b"
 *
 * If $i is negative - it means how many to remove from the tail, i.e
 * getPartsPrefix("a_b_c",-1)=="a_b"
 */
function getPartsPrefix($haystack, $i) {
    $parts = explode("_", $haystack);
    $len = count($parts);
    if ($i < 0) {
        $i = $len + $i;
    }
    if ($i <= 0) {
        return "";
    }
    for (; $i < $len; $i++) {
        unset($parts[$i]);
    }
    return implode("_", $parts);
}

function toJson($data, $options = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK) {
    $json_string = json_encode($data, $options);
    return $json_string;
}

/**
 * Right unsigned shift
 */
function uRShift($a, $b = 1) {
    if ($b == 0) {
        return $a;
    }
    return ($a >> $b) & ~((1 << 8 * PHP_INT_SIZE - 1) >> $b - 1);
}

if (!function_exists("array_key_first")) {
    function array_key_first(array $arr) {
        foreach ($arr as $key => $unused) {
            return $key;
        }
        return null;
    }
}
if (!function_exists("array_get")) {
    /**
     * Get an item from an array using "dot" notation.
     * If item does not exists return default
     *
     * @param array $array
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function array_get($array, $key, $default = null) {
        if (is_null($key)) {
            return $array;
        }
        if (is_null($array)) {
            return $default;
        }
        if (!is_array($array)) {
            throw new BgaSystemException("array_get first arg is not array");
        }
        if (array_key_exists($key, $array)) {
            return $array[$key];
        }
        foreach (explode(".", $key) as $segment) {
            if (!is_array($array) || !array_key_exists($segment, $array)) {
                return $default;
            }
            $array = $array[$segment];
        }
        return $array;
    }
}
