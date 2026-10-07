# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Board Game Arena (BGA) implementation of Terraforming Mars (game name `terraformingmars`), including
Prelude, Colonies and the Hellas/Elysium maps. PHP 8.4 server, TypeScript + SCSS client.

Uses the **legacy, non-namespaced** BGA framework (`Table`, `APP_DbObject`, `*.action.php`,
`gameinfos.inc.php`, `states.inc.php`), unlike the newer namespaced template in `../bga-euro`.
The operation-machine / token-store architecture is the same family as `../bga-euro`

Read [README.md](README.md) (project structure, architecture overview) and [DESIGN.md](DESIGN.md)
(token naming, locations, op/math expressions) before non-trivial work. Machine internals:
[modules/DbMachine.md](modules/DbMachine.md).

## Commands

- `npm run build` - TypeScript + SCSS + material generation
- `npm run build:ts` / `npm run watch:ts` - compile `src/*.ts` into `terraformingmars.js`
- `npm run build:scss` - compile `src/css/GameXBody.scss` into `terraformingmars.css`
- `npm run build:material` - regenerate `material.inc.php` sections from `misc/*.csv`
- `npm run test` - full PHPUnit suite in `modules/tests` (fast, ~2s), config in `phpunit.xml`
- `npm run test -- --filter Operation_sellTest` - one test class
- `npm run test -- --filter testSellSingleCard` - one test method
- `npm run test -- modules/tests/Operation_sellTest.php` - one test file
- `npm run jstest` - mocha tests in `tests/*.spec.ts`
- `npm run lint:php` - `php -l` on all server PHP files
- `npm run predeploy` - build, lint:php, test, jstest; run before committing
- `npm run add:colonies` / `npm run remove:colonies` - toggle Colonies expansion material/options

## Generated Files - do not edit directly

- `terraformingmars.js` - from `src/*.ts` (`src/Zain.ts` is the dojo entry, named to sort last)
- `terraformingmars.css` - from `src/css/*.scss`
- `material.inc.php` - sections between `/* --- gen php begin <name> --- */` and
  `/* --- gen php end <name> --- */` come from `misc/<name>.csv` via `misc/other/genmat.php`;
  everything outside those markers is hand-written

## Architecture

### Server class chain

`terraformingmars` ([terraformingmars.game.php](terraformingmars.game.php), thin shell) ->
`PGameXBody` (all game logic) -> `PGameMachine` (dispatcher, operation resolution, undo) ->
`PGameTokens` (token helpers, notifications) -> `PGameBasic` (players/colors, utilities) -> `Table`.

### Material CSV and card rules

- CSV files in `misc/` are `|`-separated; `#set key=value` lines set defaults for following rows
  (e.g. `#set class=Operation_nR_Any` makes all following ops use that class).
- Cards (`misc/cards_material.csv`) encode behavior as op expressions in columns: `r` immediate
  rules, `a` action, `e` effect, `pre` precondition (MathExpression), `vp` scoring.
  Example: `npu_Any:pu` = decrease any player's titanium production, then increase your own.
- Op expression operators are documented at the top of [modules/OpExpression.php](modules/OpExpression.php)
  (`/` or, `+` unordered and, `,` ordered and, `;` ordered and with different priority, `:` pay:get,
  `?` optional, `^` limited select, prefix number = count).

### Operations

- Each op type resolves to `Operation_<type>` in `modules/operations/` unless `misc/op_material.csv`
  sets a `class` override (many types share one class, e.g. `nm_Any`, `ns_Any` -> `Operation_nR_Any`).
  Lookup is in `PGameXBody::getOperationInstance`.
- Base classes: `AbsOperation`, `AbsOperationTile` (tile placement), `ComplexOperation`,
  `DelegatedOperation`.
- States are few and generic: `STATE_GAME_DISPATCH`, `STATE_PLAYER_TURN_CHOICE`,
  `STATE_MULTIPLAYER_DISPATCH`/`CHOICE`, `STATE_PLAYER_CONFIRM`; the machine stack drives everything.

### Private info

Hidden info (hands, decks, discard, prelude/setup picks) must not leak via state args or
`notifyAllPlayers`. State args use `_private`; see the known leak noted in [TODO.md](TODO.md).

## Testing

- Tests run against in-memory stubs: `TokensInMem`, `MachineInMem`, and BGA framework stubs embedded
  at [misc/BgaFrameworkStubs.php](misc/BgaFrameworkStubs.php) (loaded by `modules/_autoload.php`).
- `GameUT` (in `modules/tests/GameUT.php`, autoloaded) is the test game subclass;
  `init($map, $colonies)` sets up a 2-player game (colors `PCOLOR`, `BCOLOR`).
- Per-operation tests live in `modules/tests/Operation_<type>Test.php`.

## Changelog

[CHANGELOG.md](CHANGELOG.md) has user-facing entries per deployed version (`## <date> (v<version>)`),
committed as `docs: change log for v<version>`.
