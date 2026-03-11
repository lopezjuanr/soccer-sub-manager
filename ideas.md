# Soccer Sub Manager — Design Ideas

## Approach A: Tactical Clipboard
- **Design Movement**: Industrial Sports UX / Coaching Board Aesthetic
- **Core Principles**: High contrast for outdoor sunlight readability; large tap targets for gloved/nervous hands; zero-friction data entry; clear hierarchy between "on field" vs "bench"
- **Color Philosophy**: Deep forest green pitch + white chalk lines + amber urgency accents. Evokes the physical coaching clipboard.
- **Layout Paradigm**: Split-screen: top half = field with 4 player slots, bottom half = bench cards. No nav tabs needed.
- **Signature Elements**: Dashed chalk-line dividers; jersey number badges; pulsing green dot for active players
- **Interaction Philosophy**: Tap a bench player → tap a field player → swap. Minimal confirmation steps.
- **Animation**: Slide-up bench panel; swap animation between field/bench slots
- **Typography**: Bebas Neue (display/numbers) + Nunito (body). Bold, sporty, readable.

## Approach B: Clean Coach's App
- **Design Movement**: Modern Sports App / Nike Training Club aesthetic
- **Core Principles**: Mobile-first card layout; strong typographic hierarchy; color-coded urgency (green=fine, yellow=approaching minimum, red=below minimum)
- **Color Philosophy**: Near-black background with electric lime accent. Premium athletic feel.
- **Layout Paradigm**: Vertical scroll with sticky header showing game clock. Cards for each player showing time played vs required.
- **Signature Elements**: Progress arc per player; substitution recommendation chips; countdown timer
- **Interaction Philosophy**: App tells you exactly who to swap — one-tap confirm
- **Animation**: Progress bars animate on substitution; card flip when player moves on/off field
- **Typography**: DM Sans (body) + Space Grotesk (numbers/headings). Clean, modern, technical.

## Approach C: Referee Card / Pitch Board
- **Design Movement**: Brutalist Utility / Field-Ready Tool
- **Core Principles**: Maximum legibility in direct sunlight; no decorative elements; function over form; works with one thumb
- **Color Philosophy**: White background, black text, grass green for "on field", red for "needs time". Pure utility.
- **Layout Paradigm**: Vertical list, players sorted by minutes remaining. Most urgent always at top.
- **Signature Elements**: Large minute counters; urgency ranking; one-button "Apply Recommendation"
- **Interaction Philosophy**: Zero ambiguity — the app makes the decision, coach confirms
- **Animation**: Minimal — only a brief flash on state change
- **Typography**: IBM Plex Mono (numbers) + IBM Plex Sans (labels). Precise, clinical, trustworthy.

---

## Selected Approach: B — Clean Coach's App

Electric lime on near-black, DM Sans + Space Grotesk, progress arcs, color-coded urgency, one-tap substitution confirmation.
