# Setting up Delve on a new computer

Delve is plain HTML/CSS/JS built with Vite. The code lives in a private GitHub repo, the game data lives in Firebase, and everything else on this page is one-time setup.

## 1. Install the tools

| Tool | Why | Check |
|---|---|---|
| **Node 22 or newer** (https://nodejs.org) | runs the dev server, build and tests | `node -v` |
| **Git** | get and sync the code | `git --version` |
| **GitHub access** | the repo is private | `gh auth login` (GitHub CLI) or a personal access token |
| Edge or Chrome (optional) | only needed for the browser test pages | |

On Windows, if `npm` is not found in an old terminal, add Node to the path for that session: `$env:Path += ";C:\Program Files\nodejs"`.

## 2. Get the project

```
git clone https://github.com/harry4041/delve.git
cd delve
npm install
```

## 3. Run the game

```
npm run dev
```

Open http://localhost:5173. On Windows you can also double-click `play.cmd`.

**Do not open `index.html` or `dist/index.html` by double-clicking.** The game uses ES modules, which browsers block on `file://`, so the page is blank.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm start` | serve `dist/` with the dependency-free `server.js` (port 8080) |
| `npm run typecheck` | `tsc --noEmit` (the code is still plain JS, so this only validates config) |

## 4. Deploying (Firebase)

The live game is https://delve-game-4041.web.app (Firebase project `delve-game-4041`).

```
npm run build
npx -y firebase-tools@latest login          # first time only; sign in with the Google account that owns the project
npx -y firebase-tools@latest deploy --only hosting
```

Security rules are a separate deploy and should only be pushed on purpose:

```
npx -y firebase-tools@latest deploy --only firestore:rules
```

Auth (Email/Password) and the Firestore database were switched on once in the Firebase console. Nothing to repeat on a new computer.

## 5. Running the tests

There is no unit-test framework. The tests are browser pages in `tests/` that write `name:ok|FAIL` results into `document.title`. They are run through a headless browser:

1. Start the dev server: `npm run dev`
2. Start headless Edge with a throwaway profile (adjust the path for Chrome or another install):
   ```
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --remote-debugging-port=9333 --remote-allow-origins=* --user-data-dir=%TEMP%\delve-edge about:blank
   ```
3. Run a page and read its result line:
   ```
   node tests/run-page.mjs http://localhost:5173/tests/smoke.html 40
   ```

Useful pages: `smoke`, `upgrades`, `treelist`, `buyqty`, `relics`, `gearart`, `art`, `loot`, `wiki`, `bugfixes`, `backpack`, `farm`, `pets`, `cloud`, `leaderboard`, `username`, `gate`, `look`, `autodelve`, and `fuzz.html?n=2000&syn=4000&seed=1`. `node tests/lb-rules-model.mjs` checks the leaderboard rules. `CLAUDE.md` describes what each one covers.

Notes:
- Always close the headless browser when you are done (close it through its debug port, not by killing every `msedge.exe`, which would close your own browser).
- `tests/career.html` simulates hours of play. It can take many minutes, and the page is busy while it runs, so give `run-page.mjs` a long time limit.

## 6. The admin tool (browse and edit player saves)

A **local-only** tool, never deployed. It reads every player's cloud save by username and lets you edit gold, gems and items.

1. In the Firebase console go to Project settings, then Service accounts, then **Generate new private key**.
2. Save the file as `admin/serviceAccountKey.json`. It is in `.gitignore`. **Never commit it or share it**: it gives full access to the project. Move it between computers on a USB stick, not by email or chat.
3. Start it:
   ```
   cd admin
   npm install
   npm start
   ```
4. Open http://localhost:5180.

Every save you make keeps the previous version in the `saves_backup` collection. `admin/make-test-account.mjs <email> <password>` creates a verified test account with a maxed-out save (build the save first with `tests/maxsave.html`).

## 7. What does not travel with the repo

- `admin/serviceAccountKey.json` (see above).
- `node_modules/` and `admin/node_modules/` (recreated by `npm install`).
- `dist/` (recreated by `npm run build`).
- Claude Code's private memory notes. They live on one machine only, under `~/.claude/projects/<project>/memory`. `CLAUDE.md` in the repo carries the architecture and gotchas, so a fresh Claude Code session still understands the project. Copy the memory folder across too if you want its notes on how work is shipped.
- Players' data. It lives in Firebase, so signing in with the same account on any computer gives the same cloud save.

## 8. Keeping two computers in step

Pull before you start, push when you finish:

```
git pull
# ... work ...
git add -A
git commit -m "what changed"
git push
```

If both computers changed the same file, Git will tell you at `git pull` and you resolve it there.

## 9. Troubleshooting

- **Blank page:** you opened the file directly. Use `npm run dev`.
- **`npm` or `node` not found:** reopen the terminal after installing Node, or add it to PATH as in step 1.
- **Port 5173 already in use:** another dev server is running. Close it, or stop the process listening on that port.
- **Firebase deploy says you are not logged in:** run the `login` command again.
- **Sign-in or sync problems in the game:** see `CLAUDE.md` (the Cloud saves and Stale ID token sections).
