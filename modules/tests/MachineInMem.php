<?php declare(strict_types=1);

/**
 * Test class for machine overriding db function to be in memory
 */
class MachineInMem extends DbMachine {
    var $xtable;

    function __construct() {
        $this->xtable = [];
    }

    function _($text) {
        return $text;
    }

    function escapeStringForDB($string) {
        return $string;
    }

    function getExtremeRank($getMax) {
        $extrime = $getMax ? 0 : PHP_INT_MAX;
        foreach ($this->xtable as $row) {
            $rank = $row["rank"];
            if ($rank > 0) {
                if ($getMax) {
                    if ($rank > $extrime) {
                        $extrime = $rank;
                    }
                } else {
                    if ($rank < $extrime) {
                        $extrime = $rank;
                    }
                }
            }
        }
        return $extrime;
    }

    function all() {
        return $this->xtable;
    }

    function getOperationsByRank($rank = null) {
        if ($rank === null) {
            $rank = $this->getTopRank();
        }
        $this->checkInt($rank);

        $arr = $this->xtable;
        return array_filter($arr, function ($elem) use ($rank) {
            return $elem["rank"] == $rank;
        });
    }

    function DbGetLastId() {
        return count($this->xtable);
    }
    function DbQuery($str) {
        $this->query = $str;
        echo "dbquery: $str\n";
        throw new feException("not implemented query");
    }

    function DbSetField($field, $value, $idOrList, $quoted = false) {
        $ids = $this->ids($idOrList);
        foreach ($this->xtable as &$row) {
            if (array_search($row["id"], $ids) !== false) {
                $row[$field] = $value;
            }
        }
    }

    function getCollectionFromDB($query, $single = false) {
        throw new feException("not implemented query");
    }

    function insertList($rank, $list) {
        foreach ($list as $row) {
            if (!isset($row["id"])) {
                $row["id"] = $this->DbGetLastId() + 1;
            }
            $row["rank"] = $rank;
            $this->xtable[] = $row;
        }

        return $this->DbGetLastId();
    }

    function gettablearr($table = null, $fakeid = true) {
        if (!$table) {
            $table = $this->xtable;
        }
        $res = [];
        $filds = $this->getTableFields();
        $i = 1;
        foreach ($table as $record) {
            $flat = [];

            if ($record["rank"] == -1) {
                continue;
            }

            foreach ($filds as $key) {
                if ($key == "flags") {
                    $flat[] = $this->toStringFlags($record[$key]);
                } elseif ($key == "id" && $fakeid) {
                    $flat[] = $i;
                } elseif ($key == "parent" || $key == "pool") {
                    // ignore
                } else {
                    $flat[] = $record[$key];
                }
            }
            $res[] = implode("|", $flat);
            $i = $i + 1;
        }
        return $res;
    }

    function insertX($arr, $rank = 1, $mcount = 1, $count = 1, $owner = null, $resolve = MACHINE_OP_SEQ, $cause = "") {
        foreach ($arr as $rule) {
            $this->insertMC($rule, $rank, $mcount, $count, $owner, $resolve, $cause);
        }
    }

    function findByType($type, $index = 0) {
        $arr = $this->xtable;
        $subarr = array_filter($arr, function ($elem) use ($type) {
            return $elem["type"] === $type;
        });
        $subarr = array_values($subarr);
        if (count($subarr) == 0) {
            return null;
        }
        if (count($subarr) <= $index) {
            return null;
        }
        return $subarr[$index]["id"];
    }

    /**
     * Get specific operations info
     */
    function infos($list) {
        $ids = $this->ids($list);
        $subarr = array_filter($this->xtable, function ($elem) use ($ids) {
            if (array_search($elem["id"], $ids) !== false) {
                return true;
            }
            return false;
        });
        return array_values($subarr);
    }

    function interrupt($from = 1, $count = 1) {
        foreach ($this->xtable as &$row) {
            if ($row["rank"] >= $from) {
                $row["rank"] += $count;
            }
        }
    }
    function renice($list, $rank) {
        $ids = $this->ids($list);
        foreach ($this->xtable as &$row) {
            if (array_search($row["id"], $ids) !== false) {
                $row["rank"] = $rank;
            }
        }
    }

    function normalize() {
        $top = $this->getTopRank();
        if ($top > 1) {
            foreach ($this->xtable as &$row) {
                if ($row["rank"] > 0) {
                    $row["rank"] = $row["rank"] - $top;
                }
            }
        }
        // $this->normalizeTop();
    }

    function normalizeTop() {
        $ops = $this->getTopOperations();
        if (count($ops) == 0) {
            return;
        }
        $first = reset($ops);
        $mop = $first["flags"];
        $count = $first["count"];
        if ($count == 1 && is_flag_set($mop, MACHINE_FLAG_UNIQUE) && is_flag_set($mop, MACHINE_FLAG_SHARED_COUNTER)) {
            foreach ($ops as &$op) {
                $op["flags"] &= ~MACHINE_FLAG_UNIQUE;
                $this->xtable[$op["id"] - 1] = $op;
                // $expr = OpExpression::parseExpression($op['type']);
                // $subop = OpExpression::getop($expr);
                // if ($subop=='*') {
                //     $op["type"] = $expr->args[2];
                //     $op["count"] = $expr->args[1];
                //     $op["count"] = $expr->args[1];
                // }
            }
        }
    }

    /**
     * Remove operations (its not really removed from db, but rank set to -1)
     */
    function hide($list) {
        $ids = $this->ids($list);

        foreach ($ids as $i) {
            $row = &$this->xtable[$i - 1];
            $row["rank"] = -1;
        }
    }

    function prune() {
        foreach ($this->xtable as &$row) {
            if ($row["rank"] > 0 && $row["count"] == 0) {
                $row["rank"] = -1;
            }
        }
    }

    function setCount($list, $count) {
        $ids = $this->ids($list);
        foreach ($this->all() as &$row) {
            if (array_search($row["id"], $ids) !== false) {
                $row["count"] = $count;
            }
        }
    }

    public function validateOptional($list) {
        $ids = $this->ids($list);
        foreach ($this->all() as &$row) {
            if (array_search($row["id"], $ids) !== false) {
                if (!$this->isOptional($row)) {
                    return false;
                }
            }
        }
        return true;
    }
}
