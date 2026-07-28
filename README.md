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
favicon.svg                Standalone SVG favicon (same navy/gold monogram as the nav logo)
assets/                    Uploaded/placeholder images and résumé PDF
assets/research/            Research paper PDFs referenced by the Research section
assets/certificates/         Certificate credential files (PDF or image) referenced by Certificates
```

## Option 1: Edit content directly

Open `data/content.json` and edit the fields — it's a plain JSON object with a section per key (`hero`, `about`, `projects`, `research`, `skills`, `timeline`, `certificates`, `interests`, `contact`). Commit and push; GitHub Pages rebuilds automatically. `index.html` never contains portfolio content directly — everything is rendered from this file by `js/render.js`.

## Option 2: Edit through the admin panel

`admin.html` is a full editing UI: text fields for hero/about/contact copy, and add/edit/delete list editors for projects, research papers, certificates, timeline entries, skills groups, and interests, with a live preview pane rendered using the exact same `js/render.js` functions as the real site.

### Research section

The Research section showcases IB research papers as PDFs hosted directly in this repo under `assets/research/` — no links out to an external site. Each entry has a title, a context line (e.g. "IB Extended Essay — Computer Science"), a description, tags, and a `file` path pointing at the PDF.

In the admin panel's **Research** tab, adding or editing a paper includes a PDF file picker: choosing a file uploads it immediately (base64-encoded, via the same GitHub Contents API pattern used everywhere else in the admin panel) to `assets/research/<slugified-filename>.pdf`, and fills in the entry's `file` field with that path once the commit succeeds. Re-uploading a file with the same name overwrites the existing PDF (the panel fetches its current SHA first). You still need to click **Save changes** afterward to publish the entry referencing it.

### Certificates section

Each certificate can have a credential file — a PDF or an image (`.png`/`.jpg`/`.jpeg`) — hosted directly in this repo under `assets/certificates/`, the same way research papers work. In the admin panel's **Certificates** tab, the add/edit form has the same kind of file picker: choosing a file uploads it to `assets/certificates/<slugified-filename>.<ext>` and fills in the entry's `file` field once the commit succeeds. If a certificate already has a file attached, its current path is shown and you can either choose a new file to replace it or click **Remove file** to detach it. A certificate with no file simply doesn't show a "View credential" button on the public site — no external links needed.

Each certificate also has a `category` (e.g. "Cybersecurity", "Programming", "Drone & Hardware"), which powers a row of filter pills above the certificate grid — "All" plus one pill per unique category found in the data, generated automatically, so adding a new category is just a matter of typing it into a certificate's Category field (a text input with a dropdown of categories already in use, so you can either reuse one or type a new one). Clicking a pill filters the grid instantly, no page reload.

Certificate cards also show a thumbnail: an actual image preview if the file is `.png`/`.jpg`/`.jpeg`, or a simple document icon if it's a PDF. Clicking anywhere on a card with a file — the thumbnail, the card itself, or the "View credential" button — opens a lightbox overlay with a larger preview (the full image, or the PDF embedded in an `<iframe>` with an "Open in new tab" fallback link). The lightbox closes on Escape, on clicking outside it, or via its close button, and returns focus to whatever you clicked to open it. This filtering and lightbox behavior is wired up automatically inside `Render.renderAll()` in `js/render.js`, so it works identically in the admin panel's live preview as on the real site — there's no separate code path to keep in sync.

**Manual step required:** the seeded "Network Ethical Hacking for Beginners Using Kali Linux" certificate references `assets/certificates/network-ethical-hacking-udemy.pdf`, but that file isn't included in this repo yet — only a placeholder `assets/certificates/.gitkeep` marks where certificate files go. Upload the real file through the admin panel's Certificates editor (edit that entry, choose the file, save), or commit it directly via git.

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

Uploading a photo or résumé PDF works the same way — the file is base64-encoded and committed to `assets/`, then `data/content.json` is updated in-memory to point at the new path (click "Save changes" to publish that reference). Research papers and certificate files share one common upload helper (`uploadFileToRepo` in `js/admin.js`) rather than duplicating this logic per section.

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

The nav logo and footer mark are inline SVGs generated by `js/render.js` (`logoSvg()`), so they always use the live `--accent`/`--gold` CSS variables and the current initials from `data/content.json`'s `hero.name` — edit those variables in `css/style.css` and the logo updates everywhere automatically. `favicon.svg` is a separate standalone file (favicons can't read page CSS), so if you change the palette or initials, update its hardcoded colors/text to match.
