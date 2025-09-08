# Sock Management Portal (Source)

This package contains the source code for **Sock Management Portal** (React + Electron).

## What you received
- `package.json` - scripts & electron-builder config
- `main.js` - Electron main process
- `public/index.html` - static HTML
- `src/` - React source (App.js, index.js, styles.css)
- `README.md` - this file

## Run in development (requires Node.js)
1. Install Node.js (>=16). Download: https://nodejs.org/
2. Open terminal in this folder and run:
```bash
npm install
npm run start
# In another terminal (optional) to run Electron against the built app:
npm run build
npm run electron-start
```

## Build Windows .exe (on a Windows machine)
1. Install Node.js (>=16).
2. In terminal:
```bash
npm install
npm run build
# then create Windows distributable:
npm run dist
```
This uses `electron-builder` and will produce artifacts in the `dist/` folder (installer `.exe` and portable `.exe`).

## Notes & Tips
- The app stores data in `localStorage` (browser). For production Electron builds you may consider moving to a SQLite file. If you want, I can modify it to use a local SQLite database so data is kept in a single file (`data.db`).
- If you need automated build (CI), include the provided `.github/workflows/build-windows.yml` to run on push and produce artifacts.

## If you want me to produce the actual Windows `.exe`
I cannot directly build and send a signed Windows installer from this chat environment. But you can:
- Run the `npm run dist` commands on any Windows machine with Node.js installed.
- Or I can provide a GitHub Actions workflow to auto-build on push and upload artifacts. See `.github/workflows/build-windows.yml`.

