# 🎴 Discord Collectible Card Bot

A Discord bot where players **drop 3 random cards and claim one**, building a persistent
collection. Inspired by Karuta/Karutta-style card games. Built with **discord.js v14**,
**better-sqlite3**, and **sharp**.

Ships with a 20-card aespa set (4 members × 5 series, one per rarity tier).

---

## ✨ Features

- **`/drop` — drop 3, claim 1.** Rolls 3 weighted-random cards and posts them as a single
  side-by-side image with `1️⃣ 2️⃣ 3️⃣` claim buttons.
- **Dropper priority.** For the first **10 seconds**, only the dropper can claim. After that,
  anyone can grab the remaining cards.
- **Per-player cooldowns** (persisted in SQLite, survive restarts):
  - **Drop:** 5 minutes between `/drop`
  - **Claim:** 2 minutes between claims (applies to everyone, including the dropper)
- **Weighted rarities:** Common 40% · Uncommon 27% · Rare 18% · Epic 10% · Legendary 5%.
- **Persistent collections** stored in SQLite; duplicate cards stack with a quantity count.
- **Claimed buttons** become disabled and show the claimer's name (e.g. `✔ Alice`).
- **Auto-expiry:** drops close after 30 seconds, or early once all 3 cards are claimed.

## 🕹️ Commands

| Command | Who | Description |
|---|---|---|
| `/drop` | Everyone | Drop 3 random cards (5 min cooldown) |
| `/collection [user]` | Everyone | View your (or another user's) collection, grouped by rarity |
| `/card <id>` | Everyone | Inspect a card by its 6-character ID |
| `/cooldowns` | Everyone | Check your remaining drop/claim cooldowns |
| `/stats` | Everyone | Server-wide stats + top collectors |
| `/spawn` | Admin | Force-spawn a drop, bypassing cooldown |
| `/give <user> <card_id>` | Admin | Grant a specific card to a user |

---

## 🚀 Setup

### 1. Prerequisites
- **Node.js 18+**
- A Discord application + bot — create one at the
  [Discord Developer Portal](https://discord.com/developers/applications).

### 2. Install
```bash
npm install
```

### 3. Configure
Copy the example env file and fill in your values:
```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Your bot token (Bot → Reset Token) |
| `CLIENT_ID` | ✅ | Application ID (General Information) |
| `GUILD_ID` | optional | A server ID for instant command registration during dev. Leave blank for global. |
| `ADMIN_IDS` | optional | Comma-separated Discord user IDs allowed to run `/spawn` and `/give` |
| `DROP_COOLDOWN_MS` | optional | Drop cooldown (default `300000` = 5 min) |
| `CLAIM_COOLDOWN_MS` | optional | Claim cooldown (default `120000` = 2 min) |
| `DROP_PRIORITY_MS` | optional | Dropper-priority window (default `10000` = 10 s) |
| `DROP_EXPIRY_MS` | optional | Drop lifetime (default `30000` = 30 s) |

### 4. Register slash commands
```bash
npm run deploy
```
- With `GUILD_ID` set → commands appear **instantly** in that server (ideal for testing).
- Without it → commands register **globally** (can take up to ~1 hour to propagate).

### 5. Run
```bash
npm start
```

Invite the bot with the `applications.commands` and `bot` scopes (Send Messages,
Embed Links, Attach Files permissions).

---

## 🃏 Adding / editing cards

Cards live in [`data/cards.json`](data/cards.json); artwork PNGs live in `data/images/`.

Each entry:
```json
{ "id": "5W7PDH", "name": "KARINA", "series": "BLACK MAMBA", "rarity": "COMMON", "image": "02C K.png" }
```
- `id` — unique 6-char alphanumeric code (used by `/card` and `/give`).
- `rarity` — one of `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`.
- `image` — filename inside `data/images/` (must exist).

To add cards in bulk, edit the `SOURCE` array in
[`scripts/build-catalog.js`](scripts/build-catalog.js) and run:
```bash
node scripts/build-catalog.js
```
It assigns random IDs to **new** cards while preserving IDs of existing ones (keyed by
series + name), so player collections stay intact. To fully regenerate IDs, delete
`data/cards.json` first.

### Tuning rarity drop rates
Edit the `weight` values in [`utils/rarity.js`](utils/rarity.js). Weights are relative
(they don't have to sum to 100).

---

## 🗂️ Project structure

```
discord-card-bot/
├── bot/
│   ├── index.js              # Client bootstrap + interaction routing
│   ├── deploy-commands.js    # Registers slash commands with Discord
│   ├── config.js             # Env loading + gameplay tuning
│   ├── cooldowns.js          # Drop/claim cooldown logic
│   ├── drops.js              # In-memory active-drop registry (priority, expiry)
│   ├── interactions.js       # Claim button handler
│   └── commands/             # /drop /collection /card /cooldowns /stats /spawn /give
├── db/
│   ├── database.js           # SQLite connection + schema migration
│   ├── users.js              # Users, collections, cooldowns, stats
│   └── cards.js              # Catalog loader + weighted card rolling
├── utils/
│   ├── rarity.js             # Rarity tiers, weights, colors, weighted roll
│   ├── id.js                 # Random 6-char ID generator
│   └── embed.js              # Image composition + embed builders
├── data/
│   ├── cards.json            # Card catalog
│   └── images/               # Card artwork PNGs
└── scripts/
    └── build-catalog.js      # (Re)build the catalog with random IDs
```

## 🧠 How the drop/claim flow works

1. `/drop` checks the 5-min cooldown, starts it, rolls 3 weighted cards, and posts a
   composed side-by-side image with claim buttons.
2. A button press:
   - checks the presser's 2-min **claim** cooldown,
   - during the first 10s, rejects non-droppers (**priority window**),
   - reserves the card atomically in memory (first click wins),
   - grants the card in SQLite and starts the presser's claim cooldown.
3. The claimed button turns grey, disabled, and shows the claimer's name; a public
   message announces the claim.
4. The drop expires after 30s (remaining buttons disabled) or closes early once all
   3 cards are claimed.

> **Note:** active drops are in-memory game state and are intentionally not persisted —
> a restart discards any unclaimed in-flight drops. Collections and cooldowns *are*
> persisted in `data/bot.db`.

## 📄 License

MIT
