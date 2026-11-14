# Delve shop server

A Cloudflare Worker (free plan, no card) that is the only thing allowed to change a player's Crystal wallet
(`wallet/<uid>` in Firestore). The game reads the wallet; `firestore.rules` forbid players from writing it.

- `POST /spend`: a signed-in, verified player spends Crystals on a boost or cosmetic (rules in `src/shopcat.js`).
- `POST /ls-webhook`: Lemon Squeezy tells us an order was paid or refunded (checked with the webhook signature).
- `GET /health`

Tested without any accounts: `node tests/shop-server.mjs` (fake Google keys and Firestore).

## Going live (one time)

1. **Lemon Squeezy** (free; takes ~5% + 50p per sale and handles VAT): create a store, then three products
   (100, 550 and 1,200 Crystals at £0.99 / £4.99 / £9.99). Note each product's *variant id* and *checkout link*.
2. **Firebase service account**: Firebase console > Project settings > Service accounts > Generate new private key.
   This can be a separate key from `admin/serviceAccountKey.json`. Keep it secret.
3. **Cloudflare** (free account): from this folder
   - `npx wrangler login`
   - set `SA_EMAIL` (the key's `client_email`) and `LS_VARIANTS` in `wrangler.toml`
   - `npx wrangler secret put SA_KEY` (paste the key's `private_key`)
   - `npx wrangler secret put LS_SECRET` (any long random string; use the same one in step 4)
   - `npx wrangler deploy` and note the URL, e.g. `https://delve-shop.<you>.workers.dev`
4. **Lemon Squeezy webhook**: Settings > Webhooks > add `<worker URL>/ls-webhook`, events `order_created` and
   `order_refunded`, signing secret = `LS_SECRET`.
5. **Game**: put the worker URL and the three checkout links in `src/shop-config.js`, deploy the Firestore rules
   (`npx -y firebase-tools@latest deploy --only firestore:rules`) and the game.
6. Before real sales: terms of sale, refund policy and a privacy policy update.
