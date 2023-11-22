
-- ------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- game implementation : © Alena Laskavaia <laskava@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

CREATE TABLE IF NOT EXISTS `token` (
  `token_key` varchar(64) NOT NULL,
  `token_location` varchar(64) NOT NULL,
  `token_state` int(10),
  PRIMARY KEY (`token_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `machine` (
   `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
   `rank` int(10) NOT NULL DEFAULT 1,
   `type` varchar(64) NOT NULL,
   `owner` varchar(8),
   `count` int(10) NOT NULL DEFAULT 1,
   `mcount` int(10) NOT NULL DEFAULT 1,
   `flags` int(10) NOT NULL DEFAULT 0,
   `parent` int(10) unsigned  NOT NULL DEFAULT 0, 
   `data` varchar(64) NOT NULL DEFAULT '',
   `pool` varchar(32) NOT NULL DEFAULT 'main',
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `user_preferences` (
  `player_id` int(10) NOT NULL,
  `pref_id` int(10) NOT NULL,
  `pref_value` int(10) NOT NULL,
  PRIMARY KEY (`player_id`, `pref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

