<?php

/*
 * This is a generic class to manage multi-step undo.
 *
 *
 *
CREATE TABLE IF NOT EXISTS `zz_savepoint_multiundo` (
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
        $this->table = 'zz_savepoint_multiundo'; // table has to start with zz_reply so its not part of undo system itself
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

    function setMoveInfo($move_id, $player_id, $data, $meta = []) {
        $json_data = self::escapeStringForDB( json_encode($data, JSON_NUMERIC_CHECK));
        $json_meta = self::escapeStringForDB( json_encode($meta, JSON_NUMERIC_CHECK));
        $sql = "UPDATE " . $this->table;
        $sql .= " SET data='$json_data', meta='$json_meta', player_id='$player_id'";
        $sql .= " WHERE move_id='$move_id'";
        self::DbQuery($sql);
        if (self::DbAffectedRow() == 0) {
            $sql = "INSERT INTO " . $this->table . " (move_id,player_id,data,meta)";
            $sql .= " VALUES ('$move_id','$player_id', '$json_data', '$json_meta')";
            $this->DbQuery($sql);
        }
    }

    function doSaveUndoSnapshot(){
        $player_id = $this->game->getActivePlayerId();
        $move_id = $this->game->getGameStateValue( 'next_move_id' );
        $data_all  = $this->getTablesJson();
        $this->setMoveInfo($move_id,$player_id,$data_all);
    }

    function getTablesJson() {
        $tables = $this->game->getObjectListFromDB( "SHOW TABLES", true );
        $data_all = [];

        foreach($tables as $table) {
            if (!startsWith($table,'zz_') && $table != 'replaysavepoint') {
                $datatable = $this->getCollectionFromDB("SELECT * from $table");
                $data_all[$table] = $datatable;
            }
        }

        return $data_all;
    }

    function getMoveInfo(int $move_id) {
        $sql = $this->getSelectQuery();
        $sql .= " WHERE move_id='$move_id'";
        $dbres = self::DbQuery($sql);
        $res = mysql_fetch_assoc($dbres);
        return $res;
    }
}
