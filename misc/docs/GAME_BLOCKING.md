# Game Blocking

The game can hard block. This is how it happens.

## Problem

Some effects are mandatory: when you play a card you must be able to execute all of its effects.
Effects can depend on each other, which creates a chain of effects (the operation pool), so at any
given moment it is impossible to tell whether all mandatory effects can be resolved. Since some
effects cannot be undone, the game can end up in a deadlock.

Example: you play a card and start executing its effects. One effect draws a card, another pays money.
You draw the card first, then find you have no money to pay. You cannot undo the draw, so you are stuck.

## Current workarounds

- In some cases the player gets no choice of order and is forced to pay first.
- In some cases a draw cannot be chosen before the other effects.

## Specific case: south pole (5,5) on some maps

Hex rules:

- `6nm+w`
- `4nm,t`

Technically this should be `+` (unordered), so it should not stop placement even if you don't
have 6 MC right away.

### Bug #220016: Could not place city (or Lava Flows) on south pole

> At turn 1 I tried to play Research Outpost on south pole (move #22). I had only 4 MC remaining
> after playing the card, but my corp was Tharsis and an ocean was already placed, so there were
> several options to get the missing MC required to pay the 6 MC requirement for south pole.

Dev reply: "most likely won't be fixed", fixing it brings back the hard locks. Reporter suggested a
"special undo" where drawn cards are shuffled back (solution C).

## Related bugs

Tracker: https://boardgamearena.com/bugs?game=1924, report `https://boardgamearena.com/bug?id=<id>`.
Status as of 2026-10-15.

South pole:

- #171254 (confirmed): Experimental Forest greenery on Hellas (5,9) with 5 MC draws cards, then
  6 MC cannot be paid and there is no undo. Dev found it is legal if ocean adjacency brings you to
  6 MC.
- #220016 (open): see above.

Draw ordering, the postpone hack blocks legal plays:

- #204898 (confirmed): Research Outpost on a draw spot with Mars U, forced to resolve Mars U first.
  Later comment: Ice Moon Colony on Pluto, player wants to draw before choosing the ocean spot. Dev:
  "Card draw is always last due to potential deadlock situations".
- #180335 (confirmed): Mars U swap blocked until Robotic Workforce copy resolves. Robotic Workforce
  is not playable without a target, so there is no real risk (false positive).
- #173222 (confirmed): Aquifer Turbines (`2pe,3nm,w`) unplayable with 0-2 MC although ocean
  adjacency would pay for it (pay-first `,` hack).

Deadlock after a draw:

- #202081 (confirmed, block), duplicate of #168636 (confirmed): Nuclear Zone played on a full map,
  Point Luna earth tag draw resolved first, tile cannot be placed, no undo. Player got the forfeit
  penalty.

Same family:

- #225898 (confirmed): Minority Refuge at -4 MC production is refused, playability check ignores
  gains that arrive during the play (Luna colony, Poseidon). Same flaw as the south pole check.
- #243602 (confirmed): building a colony cannot be undone even without a draw (cause not
  investigated, possibly an unneeded barrier).
- #232402, #229191 (confirmed): two unplayable preludes give 15 MC instead of 30 (prelude escape,
  separate mechanism).

## How the code behaves today

- Barriers: every deck draw (`effect_draw`), reveals (`Operation_acard5`, draw-until-tag), player
  switch, first action of turn, research, draft. A barrier deletes all earlier undo snapshots.
- The `undo=1` flag in `op_material.csv` (9 ops) is used only for ordering (`AbsOperation::order`),
  it is not tied to barrier creation, e.g. `acard5` creates a barrier but is not flagged.
- Void check has no lookahead. Sequences (`,` `+` `;`) only check the first sub op, card
  `postcondition` only checks the first rule part, before the cost is paid.
- Hacks: `,` in material to force pay-first, `postpone` of `undo` ops in `+` choices,
  `checkMandatoryEffect` allows a void hex bonus only if there is an adjacent ocean (ignores
  Tharsis and other `place_city` triggers, hence the bug above).
- Once stuck there is no escape: skip/decline/whatever all fail on a mandatory void op, undo stops at
  the barrier.

## Solutions

All alternatives below work on op type metadata and machine state, not on parsing specific cards.
They can be combined.

### A. Irreversible last (generalize the postpone hack)

Each op type declares whether it is irreversible (creates a barrier) and whether it can fail
(can be void). The machine never resolves an irreversible op while a fallible mandatory op of the
same chain (all ops descending from the same root action, not only the same rank group) is still
pending; the irreversible op is re-queued at the end of the chain instead.

- Pros: small change, extends what already exists for `+` groups, no card data changes.
- Cons: forces the order even when drawing first is safe. Does not help when the fallible op needs
  something the irreversible op produces.
- Long lasting part: derive the irreversible flag from the same place that creates the barrier
  (single source of truth), so new ops cannot forget it.

### B. Irreversible gate (void while a fallible op is void)

Same metadata as A, but instead of reordering, an irreversible op is void while any mandatory
fallible op of the same chain is currently void. The player keeps full choice of order; the draw
is only blocked when the game can already see a payment is impossible. If the player gets stuck,
it happens before the barrier, so normal undo works.

South pole example (`6nm+w`, 4 MC, Tharsis): player picks `w`, places an ocean on a hex with a
draw bonus. The draw is void while `6nm` is void. Player resolves the Tharsis `3m` trigger, `6nm`
becomes payable, draw unlocks. If nothing helps, undo still works. With the gate in place the
`checkMandatoryEffect` placement guard can be relaxed, which fixes Bug #220016.

Requirements:

- Sum of pending mandatory costs per resource, not each cost alone. Otherwise `3nm + 3nm + draw`
  with 4 MC passes the gate (each cost is payable alone) and blocks after the draw.
- Look into every mandatory sub op, not only the first one as `ComplexOperation::isVoid` does.
- Scope is the current player chain, ops of other players or unrelated ops do not block.

- Pros: no forced order, small change, removes the postpone hack and the placement guard hack.
- Cons: blocks a legal sequence when the irreversible op itself would make the payment possible
  (none in TM today); the player has to undo the card. Pending gains are not counted, so a void
  cost that would be paid by a later gain still blocks the draw until that gain is resolved.

### C. Rescue undo (stuck escape)

Detect a stuck state (all top ops are mandatory and void, no skip possible), or give the player an
"I am stuck" button. Roll back to a hidden snapshot taken at the start of the chain, even across
same-player barriers. To neutralize leaked info, the drawn or revealed cards are shuffled back
into the deck.

- Pros: generic, catches every case including future expansions and our own bugs. Guarantees no
  hard block for single-player chains.
- Cons: player has seen the cards (minor leak, they only learn these cards are in the deck).
  Extra snapshot storage. Cannot cross a player switch barrier because other players acted.

## Recommendation

- B as the main fix, it keeps the order free and moves every stuck state before the barrier.
- C as a universal safety net for whatever slips through, including future expansions.
