<?php

declare(strict_types=1);

/**
 * Stub class for tokens overriding db function to be in memory
 */

class TokensInMem extends DbTokens {


    static function record($arr) {
        return [
            "key" => $arr[0],
            "location" => $arr[1],
            "state" => $arr[2],
        ];
    }

    function clear_cache() {
        // 
    }
    function getTokenInfo($token_key) {
        self::checkKey($token_key);
        return array_get($this->keyindex,$token_key,null);
    }

    function DbCreateTokens($values) {
        foreach ($values as $row) {
            $rec = static::record($row);
            $key = $rec["key"];
            if (array_key_exists($key, $this->keyindex)) {
                throw new Exception("Dupicate key $key in " . toJson($row));
            }

            $this->keyindex[$key] = $rec;
        }
    }

    function setTokenState($token_key, $state) {
        self::checkState($state);
        self::checkKey($token_key);
        if (!array_key_exists($token_key, $this->keyindex)) {
            return;
        }
        $this->keyindex[$token_key]["state"] = $state;
        return $state;
    }

    function incTokenState($token_key, $by) {
        self::checkState($by);
        self::checkKey($token_key);
        if (!array_key_exists($token_key, $this->keyindex)) {
            return;
        }
        $this->keyindex[$token_key]["state"] =   $this->keyindex[$token_key]["state"] + $by;
        return;
    }

    function moveToken($token_key, $location, $state = 0) {
        self::checkLocation($location);
        self::checkState($state, true);
        self::checkKey($token_key);
        $this->keyindex[$token_key]["location"] = $location;
        if ($state !== null) $this->keyindex[$token_key]["state"] = $state;
    }

    function getTokensOfTypeInLocation($type, $location = null, $state = null, $order_by = null) {
        $result = [];
        if ($location && endsWith($location,'%')) $location=substr($location,0,strlen($location)-1);
        foreach ($this->keyindex as $key => $rec) {
            if ($type && !startsWith($key, $type)) continue;
            if ($location && isset($rec['location']) && !startsWith($rec['location'], $location)) continue;
            if ($state !== null && $rec['state'] != $state) continue;
            $result[$key] = $rec;
        }

        return $result;
    }
}
