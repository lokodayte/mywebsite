/**
 * Shared rendering module.
 * Loaded as a plain script (not an ES module) so the exact same `Render`
 * object can be used by the public site (js/main.js) and by the admin
 * panel's live preview (js/admin.js), without duplicating markup logic.
 */
(function (global) {
  "use strict";

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isSafeUrl(url) {
    if (typeof url !== "string") return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (/^(https?:|mailto:)/i.test(trimmed)) return true;
    if (/^[#/]/.test(trimmed)) return true;
    // Any other URL scheme (javascript:, data:, vbscript:, ...) is rejected —
    // a scheme is letters/digits/+/-/. followed by ':' before the first '/'.
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
    // Everything else is a bare relative path (e.g. "assets/resume.pdf",
    // "./x", "../x") and is safe to use as-is.
    return true;
  }

  function externalLinkAttrs(url) {
    if (!isSafeUrl(url)) return 'href="#"';
    const isExternal = /^https?:/i.test(url.trim());
    const safeHref = escapeHtml(url);
    return isExternal
      ? `href="${safeHref}" target="_blank" rel="noopener noreferrer"`
      : `href="${safeHref}"`;
  }

  // For links that should always open in a new tab regardless of whether the
  // URL is absolute or a same-origin repo-relative path — e.g. a PDF served
  // straight from this repo's assets/ folder. Unlike externalLinkAttrs, this
  // must never be used for in-page anchors (e.g. "#projects"), which need to
  // stay in the same tab.
  function fileLinkAttrs(url) {
    if (!isSafeUrl(url)) return 'href="#"';
    return `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`;
  }

  function statusLabel(status) {
    switch (status) {
      case "live":
        return "Live";
      case "demo":
        return "Demo";
      case "source":
        return "Source";
      default:
        return escapeHtml(status || "");
    }
  }

  // ---- Section renderers -------------------------------------------------

  function getInitials(name) {
    return name
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  // Rounded-square monogram badge, matching the "soft slate" palette. Colors
  // reference the page's own CSS custom properties (not hardcoded hex) so it
  // always matches whatever theme is active — this only works because the
  // SVG is inlined into the document, not a standalone file (see
  // favicon.svg, which can't read page CSS and hardcodes the same colors).
  function logoSvg(initials, size, extraClass) {
    const classAttr = extraClass ? ` class="${extraClass}"` : "";
    return `<svg${classAttr} width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="64" height="64" rx="14" fill="var(--accent)" />
        <text x="32" y="41" font-family="var(--font-heading)" font-size="24" fill="var(--gold)" text-anchor="middle">${escapeHtml(
          initials || "//"
        )}</text>
      </svg>`;
  }

  function renderNav(data) {
    const name = data && data.hero && data.hero.name ? data.hero.name : "Portfolio";
    const initials = getInitials(name);
    return `
      <a class="nav-brand" href="#hero" aria-label="${escapeHtml(name)} — home">
        ${logoSvg(initials, 36, "nav-brand__mark")}
        <span class="nav-brand__name">${escapeHtml(name)}</span>
      </a>
      <ul class="nav-links">
        <li><a href="#about">About</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#research">Research</a></li>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#timeline">Experience</a></li>
        <li><a href="#certificates">Certificates</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    `;
  }

  function renderFooterMark(data) {
    const name = data && data.hero && data.hero.name ? data.hero.name : "Portfolio";
    return logoSvg(getInitials(name), 24, "footer-mark");
  }

  function renderHero(data) {
    const hero = (data && data.hero) || {};
    const ctas = Array.isArray(hero.ctas) ? hero.ctas : [];
    const highlights = Array.isArray(hero.highlights) ? hero.highlights : [];

    const ctaHtml = ctas
      .map(
        (cta) => `
        <a class="btn btn--${cta.style === "primary" ? "primary" : "secondary"}"
           ${externalLinkAttrs(cta.href)}>${escapeHtml(cta.label)}</a>`
      )
      .join("");

    const highlightsHtml = highlights
      .map(
        (h) => `
        <li class="snapshot-card__row">
          <span class="snapshot-card__label">${escapeHtml(h.label)}</span>
          <span class="snapshot-card__value">${escapeHtml(h.value)}</span>
        </li>`
      )
      .join("");

    return `
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="status-pill" role="status">
            <span class="status-pill__dot" aria-hidden="true"></span>
            ${escapeHtml(hero.status || "")}
          </p>
          <h1 class="hero-name">${escapeHtml(hero.name || "")}</h1>
          <p class="hero-role">${escapeHtml(hero.role || "")}</p>
          <p class="hero-tagline">${escapeHtml(hero.tagline || "")}</p>
          <p class="hero-intro">${escapeHtml(hero.intro || "")}</p>
          <div class="hero-ctas">${ctaHtml}</div>
        </div>
        <div class="snapshot-card">
          <p class="snapshot-card__eyebrow">Snapshot</p>
          <ul class="snapshot-card__list">${highlightsHtml}</ul>
        </div>
      </div>
    `;
  }

  function renderAbout(data) {
    const about = (data && data.about) || {};
    const paragraphs = Array.isArray(about.paragraphs) ? about.paragraphs : [];
    const stats = Array.isArray(about.stats) ? about.stats : [];

    const paragraphsHtml = paragraphs
      .map((p) => `<p class="about-paragraph">${escapeHtml(p)}</p>`)
      .join("");

    const statsHtml = stats
      .map(
        (s) => `
        <div class="stat-card">
          <span class="stat-card__value">${escapeHtml(s.value)}</span>
          <span class="stat-card__label">${escapeHtml(s.label)}</span>
        </div>`
      )
      .join("");

    const photo = about.photo
      ? `<img class="about-photo__img" src="${escapeHtml(about.photo)}" alt="Portrait photo of ${escapeHtml(
          (data && data.hero && data.hero.name) || ""
        )}" loading="lazy" />`
      : `<div class="about-photo__placeholder" role="img" aria-label="No photo provided">No photo yet</div>`;

    return `
      <h2 class="section-heading"><span class="section-heading__tag">01</span>${escapeHtml(
        about.heading || "About"
      )}</h2>
      <div class="about-grid">
        <div class="about-photo">${photo}</div>
        <div class="about-text">
          ${paragraphsHtml}
          <div class="stat-grid">${statsHtml}</div>
        </div>
      </div>
    `;
  }

  function renderProjects(data) {
    const projects = Array.isArray(data && data.projects) ? data.projects : [];
    if (!projects.length) {
      return `
        <h2 class="section-heading"><span class="section-heading__tag">02</span>Projects</h2>
        <p class="empty-state">No projects published yet.</p>
      `;
    }

    const cards = projects
      .map((p) => {
        const tech = Array.isArray(p.tech) ? p.tech : [];
        const techHtml = tech.map((t) => `<li class="tag">${escapeHtml(t)}</li>`).join("");
        return `
        <article class="card project-card">
          <div class="project-card__top">
            <span class="project-card__logo" aria-hidden="true">${escapeHtml(p.initials || "??")}</span>
            <span class="badge badge--${escapeHtml(p.status || "source")}">${statusLabel(p.status)}</span>
          </div>
          <h3 class="project-card__title">${escapeHtml(p.title || "")}</h3>
          <p class="project-card__desc">${escapeHtml(p.description || "")}</p>
          <ul class="tag-list">${techHtml}</ul>
          ${
            p.link
              ? `<a class="project-card__link" ${externalLinkAttrs(p.link)}>View project <span aria-hidden="true">&rarr;</span></a>`
              : ""
          }
        </article>`;
      })
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">02</span>Projects</h2>
      <div class="card-grid">${cards}</div>
    `;
  }

  function renderResearch(data) {
    const papers = Array.isArray(data && data.research) ? data.research : [];
    if (!papers.length) {
      return `
        <h2 class="section-heading"><span class="section-heading__tag">03</span>Research</h2>
        <p class="empty-state">No research papers published yet.</p>
      `;
    }

    const cards = papers
      .map((r) => {
        const tags = Array.isArray(r.tags) ? r.tags : [];
        const tagsHtml = tags.map((t) => `<li class="tag">${escapeHtml(t)}</li>`).join("");
        return `
        <article class="card research-card">
          <h3 class="research-card__title">${escapeHtml(r.title || "")}</h3>
          <p class="research-card__context">${escapeHtml(r.context || "")}</p>
          <p class="research-card__desc">${escapeHtml(r.description || "")}</p>
          <ul class="tag-list">${tagsHtml}</ul>
          ${
            r.file
              ? `<a class="research-card__link" ${fileLinkAttrs(r.file)}>Read paper <span aria-hidden="true">&rarr;</span></a>`
              : ""
          }
        </article>`;
      })
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">03</span>Research</h2>
      <div class="card-grid card-grid--research">${cards}</div>
    `;
  }

  function renderSkills(data) {
    const groups = Array.isArray(data && data.skills) ? data.skills : [];
    const groupsHtml = groups
      .map((g) => {
        const items = Array.isArray(g.items) ? g.items : [];
        const itemsHtml = items.map((i) => `<li class="tag tag--skill">${escapeHtml(i)}</li>`).join("");
        return `
        <div class="skill-group">
          <h3 class="skill-group__title">${escapeHtml(g.group || "")}</h3>
          <ul class="tag-list">${itemsHtml}</ul>
        </div>`;
      })
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">04</span>Skills</h2>
      <div class="skill-groups">${groupsHtml}</div>
    `;
  }

  function renderTimeline(data) {
    const entries = Array.isArray(data && data.timeline) ? data.timeline : [];
    const sorted = entries.slice();

    const itemsHtml = sorted
      .map(
        (e) => `
        <li class="timeline-entry">
          <div class="timeline-entry__marker" aria-hidden="true"></div>
          <div class="timeline-entry__body">
            <p class="timeline-entry__date">${escapeHtml(e.start || "")} &ndash; ${escapeHtml(e.end || "")}</p>
            <h3 class="timeline-entry__title">${escapeHtml(e.title || "")}</h3>
            <p class="timeline-entry__org">${escapeHtml(e.org || "")}</p>
            <p class="timeline-entry__desc">${escapeHtml(e.description || "")}</p>
          </div>
        </li>`
      )
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">05</span>Education &amp; Experience</h2>
      <ol class="timeline-list">${itemsHtml}</ol>
    `;
  }

  function isImageFile(path) {
    return /\.(png|jpe?g)$/i.test(path || "");
  }

  function pdfThumbIcon() {
    return `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 2.5h8l4 4v15H6z" />
        <path d="M14 2.5v4h4" />
      </svg>`;
  }

  function renderCertificates(data) {
    const certs = Array.isArray(data && data.certificates) ? data.certificates : [];
    if (!certs.length) {
      return `
        <h2 class="section-heading"><span class="section-heading__tag">06</span>Certificates</h2>
        <p class="empty-state">No certificates published yet.</p>
      `;
    }

    const categories = [];
    certs.forEach((c) => {
      const cat = (c.category || "").trim();
      if (cat && categories.indexOf(cat) === -1) categories.push(cat);
    });

    const filtersHtml = categories.length
      ? `
      <div class="cert-filters" role="group" aria-label="Filter certificates by category">
        <button type="button" class="filter-pill is-active" data-category="all">All</button>
        ${categories
          .map(
            (cat) =>
              `<button type="button" class="filter-pill" data-category="${escapeHtml(cat)}">${escapeHtml(
                cat
              )}</button>`
          )
          .join("")}
      </div>`
      : "";

    const cardsHtml = certs
      .map((c) => {
        const hasFile = !!c.file;
        let thumbHtml = "";
        if (hasFile && isImageFile(c.file)) {
          thumbHtml = `<div class="cert-card__thumb"><img class="cert-card__thumb-img" src="${escapeHtml(
            c.file
          )}" alt="" loading="lazy" /></div>`;
        } else if (hasFile) {
          thumbHtml = `<div class="cert-card__thumb cert-card__thumb--pdf">${pdfThumbIcon()}</div>`;
        }
        const catAttr = c.category ? ` data-category="${escapeHtml(c.category)}"` : "";
        const fileAttr = hasFile ? ` data-file="${escapeHtml(c.file)}"` : "";

        return `
        <article class="card cert-card${hasFile ? " cert-card--clickable" : ""}"${catAttr}${fileAttr}>
          ${thumbHtml}
          <h3 class="cert-card__name">${escapeHtml(c.name || "")}</h3>
          <p class="cert-card__meta">${escapeHtml(c.issuer || "")} &middot; <span class="mono">${escapeHtml(
          c.date || ""
        )}</span></p>
          ${
            hasFile
              ? `<button type="button" class="cert-card__link" data-file="${escapeHtml(
                  c.file
                )}">View credential <span aria-hidden="true">&rarr;</span></button>`
              : ""
          }
        </article>`;
      })
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">06</span>Certificates</h2>
      ${filtersHtml}
      <div class="card-grid card-grid--certs" id="certGrid">${cardsHtml}</div>
      <div class="cert-showmore-row">
        <button type="button" class="btn btn--secondary" id="certShowMore" aria-controls="certGrid" aria-expanded="false" hidden></button>
      </div>
      <div class="lightbox" id="certLightbox" hidden>
        <div class="lightbox__overlay" data-lightbox-close></div>
        <div class="lightbox__content" role="dialog" aria-modal="true" aria-label="Certificate preview">
          <button type="button" class="lightbox__close" data-lightbox-close aria-label="Close">&times;</button>
          <div class="lightbox__body"></div>
          <a class="lightbox__external" target="_blank" rel="noopener noreferrer">Open in new tab <span aria-hidden="true">&#8599;</span></a>
        </div>
      </div>
    `;
  }

  // ---- Certificate filter pills + lightbox (shared by index.html and the
  // admin preview iframe — wired up automatically inside renderAll) --------

  const lastFocusedByDoc = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  // How many cards show by default per filter view before "Show more" is
  // needed. Kept as UI state per-document (not written back into the data
  // in any way) so switching category pills or re-rendering the page never
  // touches data/content.json — this is purely a display concern.
  const CERT_DEFAULT_VISIBLE = 6;
  const certViewStateByDoc = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function getCertViewState(doc) {
    if (!certViewStateByDoc) return { category: "all", expanded: false };
    let state = certViewStateByDoc.get(doc);
    if (!state) {
      state = { category: "all", expanded: false };
      certViewStateByDoc.set(doc, state);
    }
    return state;
  }

  function prefersReducedMotion(doc) {
    const view = doc && doc.defaultView;
    return !!(view && view.matchMedia && view.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // Applies both the category filter and the show-more collapse in one
  // pass, reading whatever state is currently stored for this document —
  // called after every render and after every pill/button click, so the
  // two behaviors always agree on what should be visible instead of two
  // separate code paths fighting over the same cards.
  function applyCertVisibility(doc) {
    const grid = doc.getElementById("certGrid");
    const moreBtn = doc.getElementById("certShowMore");
    if (!grid) return;
    const state = getCertViewState(doc);
    const cards = Array.prototype.slice.call(grid.querySelectorAll(".cert-card"));
    const matching = cards.filter(
      (card) => state.category === "all" || card.getAttribute("data-category") === state.category
    );
    const reduceMotion = prefersReducedMotion(doc);

    cards.forEach((card) => {
      card.hidden = true;
      card.classList.remove("cert-card--enter");
    });
    matching.forEach((card, index) => {
      const shouldShow = state.expanded || index < CERT_DEFAULT_VISIBLE;
      if (!shouldShow) return;
      const wasHidden = card.hidden;
      card.hidden = false;
      // Fade in only cards that are newly appearing (e.g. via "Show more"),
      // not ones that were already visible — and skip entirely under
      // reduced motion.
      if (wasHidden && !reduceMotion) {
        card.classList.add("cert-card--enter");
        void card.offsetWidth; // force layout so the opacity:0 start is registered
        const win = doc.defaultView;
        if (win && win.requestAnimationFrame) {
          win.requestAnimationFrame(() => card.classList.remove("cert-card--enter"));
        } else {
          card.classList.remove("cert-card--enter");
        }
      }
    });

    const remaining = matching.length - CERT_DEFAULT_VISIBLE;
    if (moreBtn) {
      if (remaining > 0) {
        moreBtn.hidden = false;
        moreBtn.textContent = state.expanded ? "Show less" : `Show more (+${remaining})`;
        moreBtn.setAttribute("aria-expanded", state.expanded ? "true" : "false");
      } else {
        moreBtn.hidden = true;
      }
    }
  }

  function openLightbox(doc, filePath, triggerEl) {
    const lightbox = doc.getElementById("certLightbox");
    if (!lightbox || !filePath) return;
    const body = lightbox.querySelector(".lightbox__body");
    const externalLink = lightbox.querySelector(".lightbox__external");
    if (body) {
      body.innerHTML = isImageFile(filePath)
        ? `<img class="lightbox__image" src="${escapeHtml(filePath)}" alt="Certificate credential" />`
        : `<iframe class="lightbox__frame" src="${escapeHtml(filePath)}" title="Certificate credential document"></iframe>`;
    }
    if (externalLink) externalLink.setAttribute("href", filePath);
    if (lastFocusedByDoc) lastFocusedByDoc.set(doc, triggerEl || doc.activeElement);
    lightbox.hidden = false;
    const closeBtn = lightbox.querySelector(".lightbox__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox(doc) {
    const lightbox = doc.getElementById("certLightbox");
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    const body = lightbox.querySelector(".lightbox__body");
    if (body) body.innerHTML = "";
    const lastFocused = lastFocusedByDoc ? lastFocusedByDoc.get(doc) : null;
    if (lastFocused && typeof lastFocused.focus === "function") {
      try {
        lastFocused.focus();
      } catch (e) {
        // Element may no longer be in the document (e.g. content re-rendered
        // while the lightbox was open) — nothing sensible to do about it.
      }
    }
  }

  function wireCertificateInteractions(doc) {
    const grid = doc.getElementById("certGrid");
    const lightbox = doc.getElementById("certLightbox");
    const filters = doc.querySelector(".cert-filters");
    const moreBtn = doc.getElementById("certShowMore");
    const state = getCertViewState(doc);

    if (filters && grid) {
      const pills = Array.prototype.slice.call(filters.querySelectorAll(".filter-pill"));
      pills.forEach((pill) => {
        // Keep the active pill in sync with restored state (e.g. after an
        // admin-preview re-render triggered by an unrelated edit).
        pill.classList.toggle("is-active", pill.getAttribute("data-category") === state.category);
        pill.addEventListener("click", () => {
          pills.forEach((p) => p.classList.remove("is-active"));
          pill.classList.add("is-active");
          // Switching categories always resets back to the collapsed
          // default count for the newly selected view.
          state.category = pill.getAttribute("data-category");
          state.expanded = false;
          applyCertVisibility(doc);
        });
      });
    }

    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        state.expanded = !state.expanded;
        applyCertVisibility(doc);
      });
    }

    applyCertVisibility(doc);

    if (grid) {
      grid.addEventListener("click", (e) => {
        const card = e.target.closest(".cert-card--clickable");
        if (!card) return;
        const file = card.getAttribute("data-file");
        if (file) openLightbox(doc, file, e.target);
      });
    }

    if (lightbox) {
      Array.prototype.forEach.call(lightbox.querySelectorAll("[data-lightbox-close]"), (el) => {
        el.addEventListener("click", () => closeLightbox(doc));
      });

      // Wired exactly once per document (guarded by a flag on the document
      // itself) so repeated re-renders — the admin preview re-renders on
      // every keystroke — never pile up duplicate listeners.
      if (!doc.__certLightboxKeyWired) {
        doc.__certLightboxKeyWired = true;
        doc.addEventListener("keydown", (e) => {
          const lb = doc.getElementById("certLightbox");
          if (!lb || lb.hidden) return;
          if (e.key === "Escape") {
            closeLightbox(doc);
            return;
          }
          if (e.key === "Tab") {
            // Includes <iframe> — it's a PDF's own natural tab stop, so it
            // must be part of the trap or Tab/Shift+Tab can walk straight
            // out of the modal whenever a PDF (rather than an image) is
            // being previewed.
            const focusable = lb.querySelectorAll("button, a[href], iframe");
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && doc.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && doc.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        });
      }
    }
  }

  function renderInterests(data) {
    const interests = Array.isArray(data && data.interests) ? data.interests : [];
    const pills = interests.map((i) => `<li class="pill">${escapeHtml(i)}</li>`).join("");
    return `
      <h2 class="section-heading"><span class="section-heading__tag">07</span>Interests</h2>
      <ul class="pill-row">${pills}</ul>
    `;
  }

  function renderContact(data) {
    const contact = (data && data.contact) || {};
    const socials = Array.isArray(contact.socials) ? contact.socials : [];
    const socialsHtml = socials
      .map(
        (s) => `<a class="contact-link" ${externalLinkAttrs(s.href)}>${escapeHtml(s.label)}</a>`
      )
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">08</span>Contact</h2>
      <div class="contact-grid">
        <div class="contact-block">
          ${
            contact.email
              ? `<a class="btn btn--primary" href="mailto:${escapeHtml(contact.email)}">${escapeHtml(
                  contact.email
                )}</a>`
              : ""
          }
          ${
            contact.resume
              ? `<a class="btn btn--secondary" ${externalLinkAttrs(contact.resume)} download>Download Résumé</a>`
              : ""
          }
        </div>
        <div class="contact-block contact-block--socials">${socialsHtml}</div>
      </div>
    `;
  }

  function renderAll(data, doc) {
    doc = doc || global.document;
    const map = {
      "nav-root": renderNav,
      "hero-root": renderHero,
      "about-root": renderAbout,
      "projects-root": renderProjects,
      "research-root": renderResearch,
      "skills-root": renderSkills,
      "timeline-root": renderTimeline,
      "certificates-root": renderCertificates,
      "interests-root": renderInterests,
      "contact-root": renderContact,
      "footer-mark-root": renderFooterMark,
    };
    Object.keys(map).forEach((id) => {
      const el = doc.getElementById(id);
      if (el) el.innerHTML = map[id](data);
    });

    if (doc.title !== undefined && data && data.hero && data.hero.name) {
      doc.title = `${data.hero.name} — ${data.hero.role || "Portfolio"}`;
    }

    // Re-wire filter pills + lightbox against the freshly-rendered DOM. This
    // runs on every renderAll call (including every admin-preview update),
    // which is what keeps the preview's filtering/lightbox behavior
    // identical to the real site without any separate wiring step.
    wireCertificateInteractions(doc);
  }

  global.Render = {
    escapeHtml,
    renderNav,
    renderHero,
    renderAbout,
    renderProjects,
    renderResearch,
    renderSkills,
    renderTimeline,
    renderCertificates,
    renderInterests,
    renderContact,
    renderAll,
  };
})(typeof window !== "undefined" ? window : this);
