# THE CUT — Professional Polish Pass

Covers everything from the last review: real app icons, a proper icon set
for navigation, actual onboarding, and bringing the two pages I'd built
(leaderboard, leagues) up to the visual bar the rest of the app already
has.

## Real app icons — finally

`public/icons/README.txt`'s placeholder note is gone because it's no
longer a placeholder. Generated a mark from scratch matching your
established brand gradient (the pink→red→gold diagonal already used in
the home screen's "THE CUT" wordmark): a single bold glowing diagonal cut
bar on the near-black background. Checked it at three sizes — full,
96px (realistic home-screen size), and under Android's aggressive
circular icon mask — it reads clearly at all three.

Files added: `public/icons/icon-192.png`, `icon-512.png`, `apple-icon.png`,
`public/favicon.png`. `app/layout.tsx` now references all of them properly
(favicon, PWA icon, Apple touch icon) instead of reusing one file for
everything.

## Real navigation icons

Built `lib/microgames/engine/NavIcons.tsx` — five small hand-drawn SVGs
(Home, Practice/target, Daily/bolt, Ranks/bar-chart, Leagues/people)
replacing the Unicode glyphs (⌂ ◎ ♛ ♜ ⚑) in both places the bottom nav is
rendered. Deliberately didn't add an icon library dependency for this —
five SVGs by hand is zero added risk and gives exact control over the
stroke weight to match the rest of the app, versus pulling in a package I
can't verify installs cleanly.

Worth knowing: a few *other* Unicode glyphs remain elsewhere (the ◎ and
⚄ on the home screen's practice buttons, the ϟ on the challenge card, the
✦ in the world-ring) — lower visibility than the persistent nav, so left
alone for now, but same fix if you want them addressed later.

## Actual onboarding — didn't exist before at all

- **`/how-to-play`** — a real explainer page: the Daily, practice, streaks,
  leagues, and how results are shown. This concept was never explained
  anywhere in the app before this.
- **First-visit popup** — a brief 3-point version shows automatically the
  first time someone lands on the home screen, with a link to the full
  page or a one-tap dismiss. Sequenced so it appears *before* the
  name-prompt popup, never both at once.
- **A persistent "?" icon** in the top-right of the home screen — always
  available, not just on first visit, in case someone wants to check the
  rules again later.

## Leaderboard and Leagues brought up to the same bar

These were the two pages I'd personally built with plain inline styles
while the rest of the app had a much richer visual language already —
that gap is closed:
- Proper header treatment matching the practice hub (back button, kicker,
  title) instead of a bare label.
- Real skeleton-loading animation instead of plain "Loading…" text.
- Styled empty/error states instead of plain centered text.
- The bottom nav now appears on both pages — previously they were
  dead-ends with only a single link back to `/daily`.
- Ranked rows now have the same glow/gradient treatment as the rest of
  the app's cards, with #1 getting a distinct highlighted treatment.

## What I'd still flag as follow-up, not done here

- The scattered decorative glyphs mentioned above (◎ ⚄ ϟ ✦).
- No custom 404 or offline page yet.
- Still no automated Daily close — the gap flagged a few turns back is
  still open if you want it next.

Same upload flow as always — full project, no new environment variables,
no new migration.
