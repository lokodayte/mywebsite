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

  function renderCertificates(data) {
    const certs = Array.isArray(data && data.certificates) ? data.certificates : [];
    if (!certs.length) {
      return `
        <h2 class="section-heading"><span class="section-heading__tag">06</span>Certificates</h2>
        <p class="empty-state">No certificates published yet.</p>
      `;
    }
    const cardsHtml = certs
      .map(
        (c) => `
        <article class="card cert-card">
          <h3 class="cert-card__name">${escapeHtml(c.name || "")}</h3>
          <p class="cert-card__meta">${escapeHtml(c.issuer || "")} &middot; <span class="mono">${escapeHtml(
          c.date || ""
        )}</span></p>
          ${
            c.file
              ? `<a class="cert-card__link" ${fileLinkAttrs(c.file)}>View credential <span aria-hidden="true">&rarr;</span></a>`
              : ""
          }
        </article>`
      )
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">06</span>Certificates</h2>
      <div class="card-grid card-grid--certs">${cardsHtml}</div>
    `;
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
