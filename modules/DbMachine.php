<?php

declare(strict_types=1);

require_once "OpExpression.php";
/*
 * This is a generic class to manage game operation machine.
 *
 * On DB side this is based on a standard table with the following fields:
 *
 *
CREATE TABLE IF NOT EXISTS `machine` (
   `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
   `rank` int(10) NOT NULL DEFAULT 1,
   `type` varchar(64) NOT NULL,
   `owner` varchar(8),
   `count` int(10) NOT NULL DEFAULT 1,
   `mcount` int(10) NOT NULL DEFAULT 1,
   `flags` int(10) NOT NULL DEFAULT 0,
   `parent` int(10) unsigned, 
   `pool` varchar(32),
   `data` varchar(64),
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;


 *
 *
 */
define("MACHINE_OP_RESOLVE_DEFAULT", 1 << 2);

define("MACHINE_FLAG_UNIQUE", 1 << 3); // 8
define("MACHINE_FLAG_SHARED_COUNTER", 1 << 2); // 4
define("MACHINE_FLAG_ORDERED", 1 << 1); // 2

define("MACHINE_OP_ALL_MASK", MACHINE_FLAG_UNIQUE | MACHINE_FLAG_SHARED_COUNTER | MACHINE_FLAG_ORDERED);
define("MACHINE_OP_OR", MACHINE_FLAG_SHARED_COUNTER);
define("MACHINE_OP_LAND", MACHINE_FLAG_UNIQUE | MACHINE_FLAG_SHARED_COUNTER);
define("MACHINE_OP_AND", MACHINE_FLAG_UNIQUE);
define("MACHINE_OP_SEQ", MACHINE_FLAG_ORDERED);


class DbMachine extends APP_GameClass {
    var $table;
    var $game;

    function __construct($game, $table = "machine") {
        $this->table = $table;
        $this->game = $game;
    }

    function _($text) {
        return $this->game->_($text);
    }

    function getTableFields() {
        return ["id", "rank", "type", "owner", "count", "mcount", "flags", "parent", "data", "pool"];
    }

    function getSelectQuery() {
        $sql = "SELECT * ";
        $sql .= " FROM " . $this->table;
        return $sql;
    }

    function getIdsWhereExpr($list) {
        $keys = $this->ids($list);
        $sql = " id IN ('" . implode("','", $keys) . "') ";
        return $sql;
    }

    function getUpdateQuery() {
        $table = $this->table;
        return "UPDATE $table SET";
    }

    function push($type, $mcount = 1, $count = 1, $owner = null, $resolve = MACHINE_OP_RESOLVE_DEFAULT, $data = "") {
        $op = $this->createOperation($type, 1, $mcount, $count, $owner, $resolve, 0, $data);
        $this->interrupt();
        return $this->insertOp(1, $op);
    }

    function queue($type, $mcount = 1, $count = 1, $owner = null, $resolve = MACHINE_OP_RESOLVE_DEFAULT, $data = "") {
        $rank = $this->getExtremeRank(true);
        $rank++;
        $op = $this->createOperation($type, $rank, $mcount, $count, $owner, $resolve, 0, $data);
        return $this->insertOp($rank, $op);
    }

    function put($type, $mcount = 1, $count = 1, $owner = null, $resolve = MACHINE_OP_RESOLVE_DEFAULT, $data = "") {
        $rank = 1; //$this->getExtremeRank(false);
        $op = $this->createOperation($type, $rank, $mcount, $count, $owner, $resolve, 0, $data);
        return $this->insertOp($rank, $op);
    }

    function insertMC(
        $type,
        $rank,
        $mincount = 1,
        $count = 1,
        $owner = null,
        $resolve = MACHINE_OP_RESOLVE_DEFAULT,
        $data = "",
        $parent = 0,
        $pool = "main"
    ) {
        $op = $this->createOperation($type, $rank, $mincount, $count, $owner, $resolve, $parent, $data, $pool);

        //$this->warn($this->getlistexpr([$op]));
        return $this->insertOp($rank, $op);
    }

    function insertOp($rank, $op) {
        $this->insertList($rank, [$op]);
        return $this->DbGetLastId();
    }

    function createOperationSimple(string $type, string $color) {
        $expr = OpExpression::parseExpression($type);
        $from = 1;
        $to = 1;
        if ($expr->op == '!') {
            $from = $expr->from;
            $to = $expr->to;
            $type = OpExpression::str($expr->toUnranged());
        }
        return $this->createOperation($type, 1, $from, $to, $color, MACHINE_OP_RESOLVE_DEFAULT);
    }

    function createOperation(
        $type,
        $rank = 1,
        $mcount = 1,
        $count = 1,
        $owner = null,
        $flags = MACHINE_OP_RESOLVE_DEFAULT,
        $parent = 0,
        $data = "",
        $pool = "main"
    ) {
        $record = [
            "type" => $this->escapeStringForDB($type),
            "rank" => $this->checkInt($rank),
            "owner" => $this->escapeStringForDB($owner),
            "mcount" => $this->checkInt($mcount),
            "count" => $this->checkInt($count),
            "flags" => $this->checkInt($flags),
            "parent" => $this->checkInt($parent),
            "data" => $this->escapeStringForDB($data),
            "pool" => $this->escapeStringForDB($pool),
        ];
        return $record;
    }

    /**
     * Insert list of records of rank, UNCHECKED fields, must not come from user
     *
     * @param int $rank
     * @param array $list
     * @return []
     */
    function insertList($rank, $list) {
        $res = [];
        foreach ($list as $record) {
            if ($rank !== null) {
                $record["rank"] = $rank;
            }
            $res[] = $this->insertMap($record);
        }
        return $res;
    }

    function insertMap($map) {
        $fields = $this->getTableFields();
        array_shift($fields);
        $flat = [];
        foreach ($fields as $key) {
            $flat[] = $map[$key];
        }
        return $this->dbInsert($fields, $flat);
    }

    function dbInsert($fields, $values) {
        $sql = "INSERT INTO " . $this->table;
        $sql .= " (`" . implode("`,`", $fields) . "`)";
        $sql .= " VALUES ('" . implode("','", $values) . "')";
        $this->DbQuery($sql);
        $id = $this->DbGetLastId();
        return $id;
    }

    final function checkInt($key) {
        if ($key === null || $key === false) {
            throw new feException("must be integer number but was null/false");
        }
        if (is_numeric($key)) {
            return (int) $key;
        }
        throw new feException("must be integer number");
    }

    final function checkId($key) {
        $id = $this->checkInt($key);
        if ($id <= 0) {
            throw new feException("must be positive integer number");
        }
        return $id;
    }

    /**
     * Checks that given array either list of ids or list returned by function such get operations() which is map of
     * id => record
     * throws exception if not of any of this structures, otherwise it returns array of ids
     *
     * @param
     *            $arr
     * @return array of operaton ids
     */
    final function ids($arr) {
        if ($arr === null) {
            throw new feException("arr cannot be null");
        }
        if (is_numeric($arr)) {
            return [(int) $arr];
        }

        if (!is_array($arr)) {
            $debug = var_export($arr, true);
            throw new feException("arr is not an array: $debug");
        }
        if (count($arr) == 0) {
            return [];
        }
        if (array_key_exists("id", $arr)) {
            $id = $this->getId($arr);
            return [$id];
        }
        $res = [];
        foreach ($arr as $key => $info) {
            $id = $this->getId($info);
            $res[] = $id;
        }
        return $res;
    }

    final function checkMap($arr) {
        if (is_array($arr)) {
            if (count($arr) == 0) {
                return true;
            }
            foreach ($arr as $key => $info) {
                if (array_key_exists("id", $info)) {
                    return true;
                }
            }
        }
        return false;
    }

    final function getId($info, $throw = true) {
        try {
            if (is_array($info)) {
                if (array_key_exists("id", $info)) {
                    return $this->checkId($info["id"]);
                }
                $debug = var_export($info, true);
                throw new feException("operation structure is not correct: $debug");
            } else {
                return $this->checkId($info);
            }
        } catch (Throwable $e) {
            if ($throw) {
                throw $e;
            } else {
                return false;
            }
        }
    }

    // Get max on min state on the specific location
    function getExtremeRank($getMax) {
        if ($getMax) {
            $sql = "SELECT MAX(`rank`) res ";
        } else {
            $sql = "SELECT MIN(`rank`) res ";
        }
        $sql .= "FROM " . $this->table;
        $sql .= " WHERE `rank` > 0";
        $dbres = self::DbQuery($sql);
        $row = mysql_fetch_assoc($dbres);
        if ($row) {
            return (int) $row["res"];
        } else {
            return 0;
        }
    }

    function getTopRank() {
        return $this->getExtremeRank(false);
    }

    public function getFlags($resolve) {
        if (is_array($resolve)) {
            $resolve = $resolve["flags"];
        }
        return $resolve;
    }

    public function isOrdered($resolve) {
        return is_flag_set($this->getFlags($resolve), MACHINE_FLAG_ORDERED);
    }

    public function isUnique($resolve) {
        return is_flag_set($this->getFlags($resolve), MACHINE_FLAG_UNIQUE);
    }

    public function isInf($info) {
        if (is_array($info)) {
            $info = $info["count"];
        }
        return $info < 0;
    }

    public function isSharedCounter($resolve) {
        return is_flag_set($this->getFlags($resolve), MACHINE_FLAG_SHARED_COUNTER);
    }

    public function isOptional($info) {
        if (is_array($info)) {
            $info = $info["mcount"];
        }
        return $info <= 0;
    }

    public function getResolveType($info) {
        return $this->getFlags($info) & MACHINE_OP_ALL_MASK;
    }

    public function isMandatory($info) {
        return !$this->isOptional($info);
    }
    public function getCount($info) {
        if (is_array($info)) {
            $info = $info["count"];
        }
        if (!is_numeric($info)) {
            throw new feException("Non numberic count '$info'");
        }
        return $info;
    }

    function getTopOperations() {
        return $this->getOperationsByRank();
    }

    function getOperationsByRank($rank = null) {
        if ($rank === null) {
            $rank = $this->getTopRank();
        }
        $this->checkInt($rank);
        return $this->getCollectionFromDB($this->getSelectQuery() . " WHERE rank = $rank");
    }

    function info($op) {
        if (is_array($op) && array_get($op,'id')>0) {
            return $op;
        } 

        $arr = $this->infos($op);
        if (count($arr) == 0) {
            return null;
        }
        return array_shift($arr);
    }

    /**
     * Get specific operations info
     */
    function infos($list) {
        $keys = $this->ids($list);
        if (count($keys) == 0) {
            return [];
        }
        $sql = $this->getSelectQuery();
        $sql .= " WHERE id IN ('" . implode("','", $keys) . "') ";
        $dbres = self::DbQuery($sql);
        $result = [];
        while ($row = mysql_fetch_assoc($dbres)) {
            $result[$row["id"]] = $row;
        }
        if (count($result) != count($keys)) {
            self::error("infos: some operations have not been found:");
            self::error("requested: " . implode(",", $keys));
            self::error("received: " . implode(",", array_keys($result)));
            throw new feException("infos: Some operations have not been found!");
        }
        return $result;
    }

    function interrupt($from = 0, $count = 1) {
        $set = $this->getUpdateQuery();
        $this->DBQuery("$set rank = rank + $count WHERE rank >= $from");
    }

    function normalize() {
        $top = $this->getTopRank();
        if ($top > 1) {
            $set = $this->getUpdateQuery();
            $this->DBQuery("$set rank = rank - $top + 1 WHERE rank >= $top");
        }
    }

    /**
     * Remove operations (its not really removed from db, but rank set to -1)
     */
    function hide($list) {
        $set = $this->getUpdateQuery();
        $ids = $this->getIdsWhereExpr($list);
        $sql = "$set rank = -1 WHERE $ids";
        self::DbQuery($sql);
    }

    function drop($list, $validate = true) {
        if ($validate && !$this->validateOptional($list)) {
            throw new BgaUserException(self::_("Cannot decline mandatory action"));
        }
        $this->hide($list);
    }

    function pop($list, $single = false) {
        $infos = $this->infos($list);
        $this->hide($list);
        $this->normalize()();
        if ($single) {
            if (count($infos) >= 1) {
                return array_shift($infos);
            }
            return null;
        }
        return $infos;
    }

    function delete($list) {
        $table = $this->table;
        $ids = $this->getIdsWhereExpr($list);
        $sql = "DELETE FROM $table WHERE $ids";
        self::DbQuery($sql);
    }

    function subtract($list, $inc, $validate = true) {
        $inc = $this->checkInt($inc);
        $recs = $this->infos($list);
        foreach ($recs as $op) {
            $id = $op["id"];
            if ($op["count"] != -1) {
                if ($validate && $op["count"] < $inc) {
                    throw new BgaUserException($this->_("Insufficient count"));
                }
                $this->DbSetField("count", max($op["count"] - $inc, 0), $id);
            }

            $this->DbSetField("mcount", max($op["mcount"] - $inc, 0), $id);
        }
    }

    function DbSetField($field, $value, $idOrList, $quoted = false) {
        $ids = $this->ids($idOrList);
        $wids = $this->getIdsWhereExpr($ids);
        $set = $this->getUpdateQuery();
        if ($quoted) {
            $value = "'" . $this->escapeStringForDB($value) . "'";
        } else {
            $this->checkInt($value);
        }
        $sql = "$set $field = $value WHERE $wids";
        self::DbQuery($sql);
    }

    function prune() {
        $set = $this->getUpdateQuery();
        $sql = "$set rank = -1 WHERE count = 0 AND rank >= 0";
        self::DbQuery($sql);
    }

    function setCount($list, $count) {
        $count = $this->checkInt($count);
        $set = $this->getUpdateQuery();
        $ids = $this->getIdsWhereExpr($list);
        $sql = "$set count = $count WHERE $ids";
        self::DbQuery($sql);
    }

    function renice($list, $rank) {
        $set = $this->getUpdateQuery();
        $ids = $this->getIdsWhereExpr($list);
        $this->DBQuery("$set rank = $rank WHERE $ids");
    }

    function clear() {
        $set = $this->getUpdateQuery();
        $this->DBQuery("$set rank = -1 WHERE 1");
    }

    public function validateOptional($list) {
        $sel = $this->getSelectQuery();
        $ids = $this->getIdsWhereExpr($list);
        $sql = "$sel WHERE mcount > 0 AND $ids";
        if (count($this->getCollectionFromDB($sql)) > 0) {
            return false;
        }
        return true;
    }

    public function checkValidCountForOp(array $op, int $count){
        $min = $op['mcount'];
        $max = $op['count'];
        if ($count < $min) throw new BgaUserException("Illegal count $count, minimum value is $min");
        if ($count > $max && $max != -1) throw new BgaUserException("Illegal count $count, maximum value is $max");
        return true;
    }

    public function toStringFlags($flags) {
        $strflags = "";

        if (is_flag_set($flags, MACHINE_FLAG_ORDERED)) {
            $strflags .= ",";
        }

        if (is_flag_set($flags, MACHINE_FLAG_UNIQUE) && is_flag_set($flags, MACHINE_FLAG_SHARED_COUNTER)) {
            $strflags .= "^";
        } elseif (is_flag_set($flags, MACHINE_FLAG_UNIQUE) && !is_flag_set($flags, MACHINE_FLAG_ORDERED)) {
            $strflags .= "+";
        } elseif (is_flag_set($flags, MACHINE_FLAG_SHARED_COUNTER)) {
            $strflags .= "/";
        }

        if (!$strflags) {
            $strflags = "0";
        }
        return $strflags;
    }

    public function expandOp($op, $rank = 1) {
        $this->insertRule($op["type"], $rank, $op["mcount"], $op["count"], $op["owner"], $op["flags"], $op["data"], $op["id"], $op["pool"]);
    }

    public function operandCode($op) {
        switch ($op) {
            case "+":
                return MACHINE_OP_AND;
            case "^":
                return MACHINE_OP_LAND;
            case "/":
                return MACHINE_OP_OR;
            case ";":
                return MACHINE_OP_SEQ;
            case ":":
                return MACHINE_OP_SEQ;
            case ",":
                return MACHINE_OP_SEQ;
            case "!":
                return MACHINE_OP_SEQ;
            default:
                return 0;
        }
    }

    /**
     * DbMachine operators:
     * a/b or
     * a+b and unordered
     * a,b and ordered
     * a b and ordered
     * a;b and ordered lowest priority
     * Na multiplier, i.e. 3d - 3 times operator d
     * N*a multiplier
     * a:b pay:get
     * (a) group
     * @ - nop operation, i.e. a/b/@
     * ?a optional, alias for a/@
     * -a negative operation, i.e name of operation is actually -a
     */
    public function insertRule(
        $rule,
        $rank = 1,
        $mcount = 1,
        $count = 1,
        $owner = null,
        $resolve = MACHINE_OP_SEQ,
        $data = "",
        $parent = 0,
        $pool = "main"
    ) {
        if (!$rule) {
            return;
        }
        if ($rule instanceof OpExpression) {
            $expr = $rule;
        } else {
            $expr = OpExpression::parseExpression($rule);
        }
        $opflag = $this->operandCode($expr->op);
        $op = OpExpression::getop($expr);
        if ($expr instanceof OpExpressionRanged) {
            $count = $expr->to;
            $mcount = $expr->from;
        }

        switch ($op) {
            case "!":
                $main = $expr->args[0];
                $this->insertMC(OpExpression::str($main), $rank, $mcount, $count, $owner, MACHINE_OP_SEQ, $data, $parent, $pool);
                break;
            case "+":
            case ",":
            case ":":
                $this->interrupt($rank);
                if ($mcount == 0) {
                    $this->insertMC(OpExpression::str($expr->toUnranged()), $rank, $mcount, $count, $owner, MACHINE_OP_SEQ, $data, $parent, $pool);
                } else {
                    foreach ($expr->args as $subrule) {
                        $this->insertMC(OpExpression::str($subrule), $rank, 1, 1, $owner, $opflag, $data, $parent, $pool);
                    }
                }
                break;
            case ";":
                $this->interrupt($rank, count($expr->args));
                foreach ($expr->args as $subrule) {
                    $this->insertRule($subrule, $rank, 1, 1, $owner, $opflag, $data, $parent, $pool);
                    $rank += 1;
                }
                break;
            case "^":
            case "/":
                $this->interrupt($rank);
                foreach ($expr->args as $subrule) {
                    $this->insertMC(OpExpression::str($subrule), $rank, $mcount, $count, $owner, $opflag, $data, $parent, $pool);
                }
                break;

            default:
                throw new Exception("Unknown operation $op");
        }
        return;
    }

    function resolve($op_info, $count = 1, ?array $tops = null) {
        $info = $this->info($op_info);
        
        if ($this->isSharedCounter($info)) {
            if ($tops == null) $tops = $this->getTopOperations();
            if ($count === null) $count = 1;
            $this->subtract($tops, $count);
        } else {
            if ($count === null) $count=$info['count'];
            if ($count == -1) $count = 1;
            $this->subtract($info, $count);
        }

        if ($this->isUnique($info) && !$this->isInf($info)) {
            $this->hide($info);
        }
        $this->prune();
        $this->normalize();
        $info["resolve_count"] = $count;
        return $info;
    }

    /** Debug functions */

    function gettablearr() {
        $sel = $this->getSelectQuery();
        $arr = $this->getCollectionFromDB("$sel WHERE rank >=0");
        return array_values( $arr);
    }

    function getrowexpr($row) {
        if (is_string($row)) {
            return $row;
        }
        if (is_numeric($row)) {
            return "$row";
        }
        if (is_null($row)) {
            return "null";
        }
        $res = $row["type"];
        $count = $row["count"];
        $optional = $this->isOptional($row);
        if ($optional == false && $count == 1) {
            return $res;
        }

        $to = $count;
        $from = $optional ? 0 : $to;

        return "(! $from $to $res)";
    }
    function tofuncexpr($xop, $ops) {
        $res = "(" . $xop . " ";
        foreach ($ops as $arg) {
            $res .= $this->getrowexpr($arg);
            $res .= " ";
        }
        $res = trim($res) . ")";
        return $res;
    }

    function gettableexpr() {
        $bottom = $this->getExtremeRank(true);
        $resa = "(; ";
        $num = 0;
        $res = "@";
        for ($i = $this->getTopRank(); $i <= $bottom; $i++) {
            $ops = $this->getOperationsByRank($i);
            if (count($ops) == 0) {
                continue;
            }
            $num++;
            $res = $this->getlistexpr($ops);
            $resa .= $res . " ";
        }
        if ($num == 1) {
            return trim($res);
        }
        $resa = trim($resa) . ")";
        return $resa;
    }
    function getlistexpr($ops) {
        $res = "";
        if (count($ops) == 1) {
            $res = $this->getrowexpr(array_shift($ops));
        } else if (count($ops) == 0) {
            $res = "";
        } else {
            $one = reset($ops);
            $flags = $this->getResolveType($one);
            $xop = $this->toStringFlags($flags);
            $count = $this->getCount($one);
            $optional = $this->isOptional($one);
            if (is_flag_set($flags, MACHINE_FLAG_SHARED_COUNTER)) {
                if ($optional || $count > 1) {
                    foreach ($ops as &$arg) {
                        $flags = $this->getFlags($one);
                        $arg["count"] = 1;
                        $arg["mcount"] = 1;
                    }

                    $res = $this->tofuncexpr($xop, array_merge([$optional ? 0 : $count, $count], $ops));
                } else {
                    $res = $this->tofuncexpr($xop, $ops);
                }
            } else {
                $res = $this->tofuncexpr($xop, $ops);
            }
        }
        return $res;
    }
}

if (!function_exists("is_flag_set")) {
    function is_flag_set($value, $flag) {
        return ($value & $flag) == $flag;
    }
}

if (!function_exists("is_flag_unset")) {
    function is_flag_unset($value, $flag) {
        return ($value & $flag) == 0;
    }
}
