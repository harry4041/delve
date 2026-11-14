# Legal pages (drafts)

`terms.html` (terms of service and sale, including Crystals and refunds) and `privacy.html` are **drafts**. They are kept
out of the deployed site on purpose: they live here, not in `public/`, so no deploy can publish them half-finished.

They are written for a UK operator selling through Lemon Squeezy (merchant of record). They are not legal advice. Have
them checked before going live (for example a solicitor, or a reputable template service you trust).

## Before publishing

1. Replace every `[BRACKETED]` item: operator name and status (sole trader or company), postal address, contact email,
   dates, the Firestore region (Firebase console > Firestore > the database's location), and an ICO number if you have one.
2. Remove the red DRAFT box from both pages.
3. Move both files to `public/` (create it; Vite copies it into the site), so they appear at
   `https://delve-game-4041.web.app/terms.html` and `/privacy.html`.
4. Link them in the game: the sign-up screen ("By creating an account you agree to the Terms and the Privacy Policy"),
   the Account tab and the Shop. In Lemon Squeezy, add the same links to the store and enable its consent box for
   immediate supply of digital content.
5. Add an Updates tab entry.

## Things the drafts promise that need a feature or a decision

- **Account deletion on request** (privacy, section 5): today it is by email and manual (admin tool / Firebase console:
  delete `saves/<uid>`, `users/<uid>`, `usernames/<name>`, `lb/<uid>`, `wallet/<uid>`, then the Auth user; keep sales
  records). A self-service "Delete my account" button is worth adding; the app stores require one for mobile apps.
- **The 14-day goodwill refund for unspent Crystals** (terms, section 5): refund in Lemon Squeezy; the webhook removes the
  Crystals automatically.
- **60 days' notice before closing the Shop** and **refunds of recent unspent Crystals if we close an account without fault**.

## Costs and registrations to check (outside the code)

- **ICO data protection fee**: UK organisations and sole traders that process personal data usually have to register
  with the ICO and pay a small yearly fee (currently around £50 for the smallest tier) unless exempt. The game already
  stores players' emails, so check https://ico.org.uk/for-organisations/data-protection-fee/ even before selling.
- **Tax**: Lemon Squeezy handles VAT/sales tax as merchant of record, but your payouts are income: register with HMRC as
  self-employed (or through a company) once you sell.
