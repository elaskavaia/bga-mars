<?php

/*
 * This is a generic class to manage multi-step undo.
 *
 *
 *
CREATE TABLE IF NOT EXISTS `multiundo` (
  `move_id` int(10) NOT NULL,
  `player_id` int(10) NOT NULL,
  `data` mediumtext NOT NULL,
  `meta` mediumtext NOT NULL,
  PRIMARY KEY (`move_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

 *
 *
 */

class DbMultiUndo extends APP_GameClass {
    var $table;
    public PGameXBody $game; // game ref
    function __construct(PGameXBody $game) {
        $this->table = 'multiundo';
        $this->game = $game;
    }

    // MUST be called before any other method if db table is not called 
    function init($table) {
        $this->table = $table;
    }

    function getSelectQuery() {
        $sql = "SELECT *";
        $sql .= " FROM " . $this->table;
        return $sql;
    }

    function isXUndo() {
        return $this->game->getGameStateValue('var_xundo') == 1;
    }

    function setMoveSnapshot(int $move_id, int $player_id, array $data, array $meta = []) {
        $meta  = $meta + ['version' => 1];
        $json_data = $this->escapeStringForDB(fixedJsonEncode($data, JSON_NUMERIC_CHECK));
        $json_meta = $this->escapeStringForDB(fixedJsonEncode($meta, JSON_NUMERIC_CHECK));

        $table = $this->table;
        $hasmove = $this->getUniqueValueFromDB("SELECT `move_id` FROM $table WHERE `move_id`='$move_id'");
        if ($hasmove) {
            $sql = "UPDATE " . $this->table;
            $sql .= " SET data='$json_data', meta='$json_meta', player_id='$player_id'";
            $sql .= " WHERE move_id='$move_id'";
            $this->DbQuery($sql);
        } else {
            $sql = "INSERT INTO " . $this->table . " (move_id,player_id,data,meta)";
            $sql .= " VALUES ('$move_id','$player_id', '$json_data', '$json_meta')";
            $this->DbQuery($sql);
        }
    }


    function doSaveUndoSnapshot(array $meta) {
        $move_id = $this->getNextMoveId() - 1;
        $player_id = $this->game->getActivePlayerId();
        if (!$this->isXUndo()) {
            $this->game->setGameStateValue('undo_moves_stored', $move_id);
            $this->game->bgaUndoSavePoint();
            return;
        }
        $barrier = array_get($meta, 'barrier', 0);

        $this->game->setGameStateValue('undo_moves_player', $player_id);
        $data_all  = $this->getCurrentTablesAsObject();

        $this->clearSnapshotsAfter($move_id);
        if ($barrier) $this->clearSnapshotsBefore($move_id);
        $this->setMoveSnapshot($move_id, $player_id, $data_all, $meta);
        //$this->notifyUndoMove($move_id);
    }

    function notifyUndoMove($move_id_or_meta) {
        if (is_array($move_id_or_meta)) {
            $meta = $move_id_or_meta;
        } else {
            $meta = $this->getMetaForMove($move_id_or_meta, true);
        }
        $barrier = array_get($meta, 'barrier', 0);
        $move_id = array_get($meta, 'move_id', 0);
        $label = array_get($meta, 'label', '');
        $player_id = array_get($meta, 'player_id', 0);
        if (!$player_id) $player_id = $this->game->getActivePlayerId();
        $meta['barrier'] = $barrier;
        unset($meta['player_id']);
        if ($barrier) {
            $barrier_message = clienttranslate('(no undo beyond this point)');
        } else {
            $barrier_message = '';
        }

        $this->game->notifyWithName(
            'undoMove',
            '${player_name} ${label_tr} ${undo_button} ${barrier_tr}',
            $meta + ['undo_button' => $move_id, 'barrier_tr' => $barrier_message, 'label_tr' => $label],
            $player_id
        );
    }

    function clearSnapshotsAfter(int $move_id = 0) {
        $undotable = $this->table;
        $this->DbQuery("DELETE FROM $undotable WHERE `move_id` >= $move_id");
    }
    function clearSnapshotsBefore(int $move_id) {
        $undotable = $this->table;
        $this->DbQuery("DELETE FROM $undotable WHERE `move_id` < $move_id");
    }

    function cancelGamelogs(int $move_id) {
        $packet_id = $this->getUniqueValueFromDB("SELECT MIN(`gamelog_packet_id`) FROM gamelog WHERE `gamelog_move_id` >= $move_id");
        if (!$packet_id) return;
        $this->DbQuery("UPDATE gamelog SET `cancel` = 1 WHERE `gamelog_packet_id` >= $packet_id AND `gamelog_private` != 1");
    }


    function getLatestSavedMoveId(int $before) {
        if (!$this->isXUndo()) {
            return $this->game->getGameStateValue('undo_moves_stored', 0);
        };
        $undotable = $this->table;
        return $this->getUniqueValueFromDB("SELECT MAX(`move_id`) FROM $undotable WHERE `move_id` < $before");
    }

    function getAvailableUndoMoves() {
        $moves = [];
        if (!$this->isXUndo()) {
            $res = [
                'player_id' =>  $this->game->getGameStateValue('undo_moves_player', 0),
                'move_id' =>    $this->game->getGameStateValue('undo_moves_stored', 0),
                'label' => ''
            ];
            $moves[$res['move_id']] = $res;
            return $moves;
        };
        $undotable = $this->table;
        $all =  $this->getCollectionFromDB("SELECT `move_id`,`player_id`,`meta` FROM $undotable");

        foreach ($all as $row) {
            $value = $row['meta'];
            $res =  json_decode($value, true);
            $res['player_id'] = $row['player_id'];
            $res['move_id'] = $row['move_id'];
            $moves[$row['move_id']] = $res;
        }
        return $moves;
    }

    function getNextMoveId() {
        return $this->game->getNextMoveId();
    }
    function errorCannotUndo(int $move_id = 0) {
        if ($move_id == 0)
            $message = $this->game->_("Nothing to undo");
        else {
            $message = sprintf($this->game->_("Nothing to undo for move %s"), $move_id);
        }
        throw new BgaUserException($message);
    }

    /** Replace custom undo data of move_id into bga system undo tables */
    function doReplaceUndoSnapshot(int $move_id) {

        $current =  $this->getNextMoveId();
        $this->warn("restoring to move $move_id ($current)|");
        if ($move_id >= $current - 1) {
            $this->errorCannotUndo($move_id);
        }
        $tables = $this->game->getObjectListFromDB("SHOW TABLES", true);
        $prefix = "zz_savepoint_";
        $saved = $this->getMoveSnapshotDataJson($move_id);
        $undotable = $this->table;

        if (!$saved) $this->errorCannotUndo($move_id);
        if (count($saved) == 0) $this->errorCannotUndo($move_id);

        foreach ($tables as $table) {
            if ($this->needsSaving($table)) {
                $copy = "{$prefix}{$table}";
                $saved_data = $saved[$table];
                $this->DbQuery("DELETE FROM $copy");
                $this->game->dbInsertValues($copy, $saved_data);
                //$this->warn("restore $table");
            }
        }
        foreach ($tables as $table) {
            if ($this->needsCopying($table)) {
                $copy = "{$prefix}{$table}";
                // special case - override some tables with existing (including self)
                $fields = $this->game->dbGetFieldListAsString($table);
                $this->DbQuery("DELETE FROM $copy");
                $this->DbQuery("INSERT INTO $copy ($fields) SELECT $fields FROM $table");
                //$this->warn("copy over $table");
            }
        }
    }

    function needsSaving(string $table) {
        if (startsWith($table, 'zz_')) return false;
        if ($this->needsCopying($table)) return false;
        if ($table == 'replaysavepoint' || $table == 'bga_user_preferences') {
            return false;
        }
        return true;
    }


    /**
     * The tables that need copying are in "undo" list but the should not be, we preserve current copy instead
     */
    function needsCopying(string $table) {
        if ($table == $this->table || $table == 'user_preferences'  || $table == 'gamelog' || $table == 'player') {
            return true;
        }
        return false;
    }

    function getMoveSnapshotDataJson($move_id) {
        $row = $this->getMoveSnapshot($move_id);
        if ($row == null) return null;
        $value = $row['data'];
        return json_decode($value, true);
    }

    function getMetaForMove($move_id, $extra = false) {
        $row = $this->getMoveSnapshot($move_id);
        if ($row == null) return null;
        $value = $row['meta'];
        $res =  json_decode($value, true);
        if ($extra) {
            $res['player_id'] = $row['player_id'];
            $res['move_id'] = $move_id;
        }
        return $res;
    }

    function getCurrentTablesAsObject() {
        $tables = $this->getObjectListFromDB("SHOW TABLES", true);
        $data_all = [];

        foreach ($tables as $table) {
            if ($this->needsSaving($table)) {
                $datatable = $this->getCollectionFromDB("SELECT * from $table");
                $data_all[$table] = $datatable;
            }
        }
        return $data_all;
    }

    function getMoveSnapshot(int $move_id) {
        $sql = $this->getSelectQuery();
        $sql .= " WHERE move_id='$move_id'";
        $dbres = $this->DbQuery($sql);
        $res = mysql_fetch_assoc($dbres);
        return $res;
    }

    function rewriteHistory(int $from_move_id, int $to_move_id) {
        $undotable = $this->table;
        $meta = $this->getMetaForMove($from_move_id);
        $this->game->systemAssertTrue("ERR:DbMultiUndo:01", $meta && is_array($meta));
        $meta['last_move'] = $to_move_id;
        $json_meta = self::escapeStringForDB(fixedJsonEncode($meta, JSON_NUMERIC_CHECK));
        $this->DbQuery("UPDATE $undotable SET `meta` = '$json_meta' WHERE `move_id` = $from_move_id");
    }

    function undoRestorePoint(int $move_id = 0) {
        $player_id = $this->game->getActivePlayerId();
        if ($player_id != $this->game->getCurrentPlayerId()) {
            $this->game->userAssertTrue(totranslate('Only active player can Undo'));
        }
        $next = $this->game->getNextMoveId();

        if (!$this->isXUndo()) {
            $move_id = $this->getLatestSavedMoveId($next);
            $this->game->bgaUndoRestorePoint();
            $this->game->setUndoSavepoint(false);
            //$this->game->setGameStateValue('next_move_id', $next);
            if ($move_id) $this->cancelGamelogs($move_id);
            $cancelledIds = $this->getCanceledNotifIds();
            $this->game->notifyWithName('undoRestore', clienttranslate('${player_name} takes back his move'), [
                'last_move' => $next - 1,
                'undo_move' => $move_id,
                'cancelledIds' => $cancelledIds
            ], $player_id);
            return;
        }

        if ($move_id === 0) {
            $move_id = $this->getLatestSavedMoveId($next);
        }
        if (!$move_id) $this->errorCannotUndo();

        $meta = $this->getMetaForMove($move_id, true);

        $save_player_id = array_get($meta, 'player_id', 0);
        if ($player_id != $save_player_id && $save_player_id != 0) {
            $this->game->userAssertTrue(totranslate('Stored Undo data belongs to other player'));
        }

        //$this->game->not_a_move_notification = false;
        $this->doReplaceUndoSnapshot($move_id);
        $this->game->bgaUndoRestorePoint();
        $this->game->setUndoSavepoint(false); // unset it because it was set by bga undo
        $this->clearSnapshotsAfter($move_id + 1);
        $this->cancelGamelogs($move_id);
        $this->rewriteHistory($move_id, $next);
        $this->game->setGameStateValue('next_move_id', $next);

        $cancelledIds = $this->getCanceledNotifIds();


        $this->game->notifyWithName('undoRestore', clienttranslate('${player_name} undoes moves ${last_move} - ${undo_move}'), [
            'last_move' => $next - 1,
            'undo_move' => $move_id,
            'cancelledIds' => $cancelledIds
        ], $player_id);

        $this->notifyUndoMove($move_id);
    }

    public function getCanceledNotifIds() {
        if ($this->isXUndo()) {
            $cancelledIds = $this->getObjectListFromDB("SELECT `gamelog_notification` FROM gamelog WHERE `cancel` = 1 AND `gamelog_private` != 1");
            return self::extractNotifIds($cancelledIds);
        } else return [];
    }

    protected static function extractNotifIds($notifications) {
        $notificationUIds = [];
        foreach ($notifications as $packet) {
            $data = \json_decode($packet['gamelog_notification'], true);
            foreach ($data as $notification) {
                array_push($notificationUIds, $notification['uid']);
            }
        }
        return $notificationUIds;
    }
}



function utf8ize($d) {
    if (is_array($d)) {
        foreach ($d as $k => $v) {
            $d[$k] = utf8ize($v);
            // if ($d[$k] != $v) {
            //     throw new BgaUserException("trip point $v $k ($d[$k])");
            // }
        }
    } else if (is_object($d))
        foreach ($d as $k => $v)
            $d->$k = utf8ize($v);

    else
        return utf8_encode($d);

    return $d;
}

function fixedJsonEncode($data) {
    $result = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    $ret = json_last_error();
    if ($result === false) {
        $data = utf8ize($data);
        $result = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }
    if ($result === false) {
        throw new feException("json error $ret");
    }
    return $result;
}
