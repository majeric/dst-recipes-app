# DST Ingredient → Recipes Finder

A React web app that lets you type an ingredient from **Don't Starve Together** and see matching recipes from the **Crock Pot Recipe Table** (pulled live from the DST wiki).

## Quick start (local)

```bash
npm ci
npm run dev
# open http://localhost:5173
```

## Production build

```bash
npm run build
npm run preview
# open http://localhost:8080
```

## Docker (Nginx)

```bash
docker build -t dst-recipes-app .
docker run -p 8080:8080 dst-recipes-app
# open http://localhost:8080
```

Or with Compose:

```bash
docker compose up --build
```

## GitHub Container Registry

Push this repository to GitHub (default branch `main`). The included workflow builds and publishes the image to `ghcr.io/<your-username>/dst-recipes-app:latest` on each push to `main`.

## Notes

- Recipe data is fetched live from the DST wiki (`wiki.gg`) via MediaWiki `action=parse` and parsed client-side.
- Ingredient icons are pulled dynamically from the DST Fandom wiki via its MediaWiki image API.
- Table structure on the wiki can change. The parser is resilient, but if a breaking change happens you’ll see a notice in the UI.