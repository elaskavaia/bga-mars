# Bug Triage - project config and state

Game-specific configuration and running state for the `game-bug-triage` skill.
The skill itself is game-independent; everything project-specific lives here.
Read this file at the start of every triage run.

## Game reference

- **BGA game id:** 1924 (Terraforming Mars)
- **Bug list:** https://boardgamearena.com/bugs?game=1924
- **Single report:** https://boardgamearena.com/bug?id=<REPORT_ID>
- **Studio project:** https://studio.boardgamearena.com/studiogame?game=terraformingmars
- **Studio error log:** https://studio.boardgamearena.com/studioissues?game=terraformingmars - studio short name is `terraformingmars`, not the numeric id above. Add `&tableId=<TABLE_ID>` for one table, `&id=<ERROR_ID>` for one error, `&projects=frontend|backend` to filter.

The list is large (5000+ reports, mostly closed). Use the skill's bulk JSON endpoints, never page through the UI.

## Rules sources (for `rules`-type reports)

Check a reporter's claim against these before assuming the code is wrong:

1. [RULES.md](RULES.md) - base rulebook - you must read this no matter what you doing.
2. [RULES_FAQ.md](RULES_FAQ.md) - official FAQ and errata, designer rulings.
3. [RULES_PRELUDE.md](RULES_PRELUDE.md), [RULES_COLONIES.md](RULES_COLONIES.md), [RULES_HELLAS_ELYSIUM.md](RULES_HELLAS_ELYSIUM.md) - expansions and maps.

Game blocking (draw before a payment, undo barriers, south pole) is a known design problem, see [GAME_BLOCKING.md](GAME_BLOCKING.md) before triaging any "stuck" / "cannot undo" / "cannot place" report.

## Deploy model

Each deployed version gets a git tag `v<version>` and a [CHANGELOG.md](../../CHANGELOG.md) entry. To decide if a fix is live:

- Find the fix commit: `git log --oneline -i --grep='#<reportid>'` (commit messages reference `BGA #<id>`, older ones `Bug #<id>` or `#<id>:`).
- Is it in the latest tag: `git merge-base --is-ancestor <commit> <latest-tag> && echo LIVE`.
- List tags containing it: `git tag --contains <commit> --sort=creatordate | head`.

In the latest deployed tag -> **Fixed**. Committed/tagged but that tag not deployed -> **Waiting for deploy**. When unsure whether a tag is deployed, ask.

## Investigation and tests

- PHPUnit tests in `modules/tests/`, per op `Operation_<type>Test.php`; blocking scenarios in `DeadlockTest.php`.
- Run one: `npm run test -- --filter <method> modules/tests/<File>.php`.
- A reproducing test must be **green**, asserting the current buggy behavior, with a comment pinning it for `BGA #<id>` (flip the assertion when the fix lands) - see the skill's CONFIRMED note.

## Bug triage last checked

**not set** - no full triage run yet (2026-10-18 was a partial run, see the log). The first full run sets this line to `date` at run start.

## Tracked bugs

Internal record of triaged reports (root cause, fix, test) - never put this detail in a public bug comment. Blocking bugs are described in more detail in [GAME_BLOCKING.md](GAME_BLOCKING.md).

- [ ] **Experimental Forest greenery on the Hellas south pole, cards revealed then 6 MC cannot be paid, no undo (BGA #171254).** Not fixed by the `w+6nm` reorder, possibly worse: rule `2draw(Plant),forest` reveals before the greenery is placed, so the barrier comes before the 6 MC payment, and the pole is now selectable even when the payment cannot be reached. Suspected hard block, no test yet.
- [ ] **Aquifer Turbines refused with 0-2 MC although ocean adjacency would pay (BGA #173222).** Kept on purpose: reordering to `w+2pe+3nm` makes the prelude playable, which removes the 15 MC sell escape, see GAME_BLOCKING.md "Forced actions". Pinned by `DeadlockTest::testAquiferTurbinesRefused`.
- [ ] **Mars U swap must be resolved before the Research Outpost draw / Ice Moon Colony draw (BGA #204898).** Draws are postponed while a fallible op is pending. Pinned by `DeadlockTest::testMarsUSwapPostponedBeforeCity`.
- [ ] **Mars U swap blocked until Robotic Workforce copy resolves (BGA #180335).** False positive, Robotic Workforce is not playable without a target. Pinned by `DeadlockTest::testMarsUSwapPostponedBeforeCopy`.
- [ ] **Minority Refuge refused at -4 MC production with Poseidon / Luna colony (BGA #225898).** Playability ignores gains that arrive during the play. Pinned by `DeadlockTest::testMinorityRefugePoseidonRefused`.
- [ ] **Building a colony cannot be undone (BGA #243602).** Cause not investigated, possibly an unneeded barrier.
- [ ] **Two unplayable preludes give 15 MC instead of 30 (BGA #232402, #229191).** Prelude sell mechanism, not investigated.

## Triage run log

- 2026-10-18 (partial, fixes only): searched unresolved report titles and all 66 Confirmed reports (full text) for bugs fixed by 5afe39f (pole and card rule reorder, v261018-2203). Fixed: #220016, #202081, #168636, #189092 (default template). #184677 already Fixed. Not fixed and tracked above: #171254, #173222, #204898, #180335, #225898. Marker not set.
