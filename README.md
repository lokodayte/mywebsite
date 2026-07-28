# Portfolio Site — Boris Sargsyan

A static, light "soft slate"-themed personal portfolio for Boris Sargsyan, a cybersecurity student, built for GitHub Pages with **no backend, no database, and no build step** — plain HTML, CSS, and JS.

All content lives in [`data/content.json`](data/content.json) and is rendered into the page at load time. You can edit that file directly, or use the browser-based admin panel at [`admin.html`](admin.html) to edit, add, and delete content without ever touching code.

## Project structure

```
index.html          Public site shell — fetches data/content.json and renders it
admin.html           Browser-based content editor (see below)
css/style.css         Shared design system used by both the public site and admin preview
css/admin.css          Admin-panel-only layout/styles
js/render.js           Shared rendering functions (renderHero, renderProjects, ...) used by
                        both index.html and admin.html's live preview
js/main.js             Public site: fetch + render + nav/scroll + gentle scroll-reveal
js/admin.js             Admin panel: auth, GitHub API calls, forms, live preview
data/content.json        All editable site content
assets/                    Uploaded/placeholder images and résumé PDF
assets/research/            Research paper PDFs referenced by the Research section
```

## Option 1: Edit content directly

Open `data/content.json` and edit the fields — it's a plain JSON object with a section per key (`hero`, `about`, `projects`, `research`, `skills`, `timeline`, `certificates`, `interests`, `contact`). Commit and push; GitHub Pages rebuilds automatically. `index.html` never contains portfolio content directly — everything is rendered from this file by `js/render.js`.

## Option 2: Edit through the admin panel

`admin.html` is a full editing UI: text fields for hero/about/contact copy, and add/edit/delete list editors for projects, research papers, certificates, timeline entries, skills groups, and interests, with a live preview pane rendered using the exact same `js/render.js` functions as the real site.

### Research section

The Research section showcases IB research papers as PDFs hosted directly in this repo under `assets/research/` — no links out to an external site. Each entry has a title, a context line (e.g. "IB Extended Essay — Computer Science"), a description, tags, and a `file` path pointing at the PDF.

In the admin panel's **Research** tab, adding or editing a paper includes a PDF file picker: choosing a file uploads it immediately (base64-encoded, via the same GitHub Contents API pattern used everywhere else in the admin panel) to `assets/research/<slugified-filename>.pdf`, and fills in the entry's `file` field with that path once the commit succeeds. Re-uploading a file with the same name overwrites the existing PDF (the panel fetches its current SHA first). You still need to click **Save changes** afterward to publish the entry referencing it.

**Manual step required:** the two seeded research entries reference `assets/research/extended-essay-home-router-security.pdf` and `assets/research/math-ia-password-bruteforce.pdf`, but the actual PDF files are not included in this repo — only a placeholder `assets/research/.gitkeep` marks where they go. Add the real PDFs either by committing them directly to that path via git, or by re-uploading them through the admin panel's Research editor once it's live (matching filenames so they land at the same paths, or updating each entry's `file` field to match wherever they end up).

It has **no backend of its own** — instead, "Save changes" commits the updated `data/content.json` straight to your GitHub repository using the [GitHub Contents API](https://docs.github.com/en/rest/repos/contents), directly from your browser. That commit triggers a normal GitHub Pages rebuild, the same as if you'd edited the file and pushed yourself.

### Generating a GitHub token

The admin panel needs a **fine-grained personal access token**, scoped to this repository only:

1. On GitHub, go to **Settings → Developer settings → Fine-grained tokens → Generate new token**.
2. Under **Repository access**, choose **Only select repositories** and select this repository.
3. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**. No other permission is required.
4. Generate the token and paste it into the admin panel when prompted.

The token is kept only in the browser tab's `sessionStorage` — it is cleared when the tab closes, is never written to any file, and is never sent anywhere except `api.github.com`.

### How publishing works

1. On "Save changes", the admin panel `GET`s the current `data/content.json` from the repo to read its latest commit SHA.
2. It `PUT`s your edited JSON (base64-encoded) back to the same path with that SHA and an auto-generated commit message.
3. If someone else changed the file in the meantime, GitHub rejects the write (409 conflict); the panel refetches the latest SHA and asks you to click "Save changes" again to publish your edits on top of it.

Uploading a photo or résumé PDF works the same way — the file is base64-encoded and committed to `assets/`, then `data/content.json` is updated in-memory to point at the new path (click "Save changes" to publish that reference).

### `admin.html` is public but harmless without a token

Like every file in this repository, `admin.html` is reachable by anyone who knows the URL — GitHub Pages does not support page-level access control. **This is safe by design**: the page cannot read or write anything in your repository unless the person using it has a real GitHub token with write access to it. Without a valid token, it's just a form that goes nowhere.

That said, there's no reason to advertise it — **don't link to `/admin.html` from the public site navigation**. It isn't linked anywhere in `index.html`.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick the branch (e.g. `main`) and folder `/ (root)`, then save.
5. GitHub will publish the site at `https://<owner>.github.io/<repo>/` (or your configured custom domain) within a minute or two, and will rebuild automatically on every push — including pushes made by the admin panel.

## Customizing the design

Colors, fonts, and spacing are defined as CSS custom properties at the top of `css/style.css` — change the values there to re-theme the whole site (and the admin preview, which shares the same stylesheet). The current theme ("soft slate") uses a tinted blue-gray page background, white card surfaces, navy as the primary accent, and a muted gold used sparingly for the availability status badge — headings are set in Fraunces, body copy in Inter, and small mono labels in IBM Plex Mono.
