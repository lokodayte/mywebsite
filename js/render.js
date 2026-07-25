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
    return /^(https?:|mailto:|\/|\.\/|\.\.\/|#)/i.test(url.trim());
  }

  function externalLinkAttrs(url) {
    if (!isSafeUrl(url)) return 'href="#"';
    const isExternal = /^https?:/i.test(url.trim());
    const safeHref = escapeHtml(url);
    return isExternal
      ? `href="${safeHref}" target="_blank" rel="noopener noreferrer"`
      : `href="${safeHref}"`;
  }

  function statusLabel(status) {
    switch (status) {
      case "live":
        return "LIVE";
      case "demo":
        return "DEMO";
      case "source":
        return "SOURCE";
      default:
        return escapeHtml(status || "").toUpperCase();
    }
  }

  // ---- Section renderers -------------------------------------------------

  function renderNav(data) {
    const name = data && data.hero && data.hero.name ? data.hero.name : "Portfolio";
    const initials = name
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return `
      <a class="nav-brand" href="#hero" aria-label="${escapeHtml(name)} — home">
        <span class="nav-brand__mark">${escapeHtml(initials || "//")}</span>
        <span class="nav-brand__name">${escapeHtml(name)}</span>
      </a>
      <ul class="nav-links">
        <li><a href="#about">About</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#timeline">Log</a></li>
        <li><a href="#certificates">Certs</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    `;
  }

  function renderHero(data) {
    const hero = (data && data.hero) || {};
    const ctas = Array.isArray(hero.ctas) ? hero.ctas : [];
    const firstTyping =
      Array.isArray(hero.typingStrings) && hero.typingStrings.length
        ? hero.typingStrings[0]
        : "";

    const ctaHtml = ctas
      .map(
        (cta) => `
        <a class="btn btn--${cta.style === "primary" ? "primary" : "secondary"}"
           ${externalLinkAttrs(cta.href)}>${escapeHtml(cta.label)}</a>`
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
        <div class="terminal-panel" aria-hidden="true">
          <div class="terminal-panel__bar">
            <span class="terminal-dot terminal-dot--red"></span>
            <span class="terminal-dot terminal-dot--amber"></span>
            <span class="terminal-dot terminal-dot--teal"></span>
            <span class="terminal-panel__title">profile.log</span>
          </div>
          <div class="terminal-panel__body">
            <p class="terminal-line">
              <span class="terminal-prompt">guest@portfolio:~$</span>
              <span id="heroTyping" class="typing-text">${escapeHtml(firstTyping)}</span
              ><span class="typing-cursor"></span>
            </p>
          </div>
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
      : `<div class="about-photo__placeholder" role="img" aria-label="No photo provided">NO_IMAGE</div>`;

    return `
      <h2 class="section-heading"><span class="section-heading__tag">01_</span>${escapeHtml(
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
        <h2 class="section-heading"><span class="section-heading__tag">02_</span>Projects</h2>
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
      <h2 class="section-heading"><span class="section-heading__tag">02_</span>Projects</h2>
      <div class="card-grid">${cards}</div>
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
      <h2 class="section-heading"><span class="section-heading__tag">03_</span>Skills</h2>
      <div class="skill-groups">${groupsHtml}</div>
    `;
  }

  function renderTimeline(data) {
    const entries = Array.isArray(data && data.timeline) ? data.timeline : [];
    const sorted = entries.slice();

    const itemsHtml = sorted
      .map(
        (e) => `
        <li class="log-entry">
          <div class="log-entry__marker" aria-hidden="true"></div>
          <div class="log-entry__body">
            <p class="log-entry__date">${escapeHtml(e.start || "")} &ndash; ${escapeHtml(e.end || "")}</p>
            <h3 class="log-entry__title">${escapeHtml(e.title || "")}</h3>
            <p class="log-entry__org">${escapeHtml(e.org || "")}</p>
            <p class="log-entry__desc">${escapeHtml(e.description || "")}</p>
          </div>
        </li>`
      )
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">04_</span>Education &amp; Experience</h2>
      <ol class="log-timeline">${itemsHtml}</ol>
    `;
  }

  function renderCertificates(data) {
    const certs = Array.isArray(data && data.certificates) ? data.certificates : [];
    if (!certs.length) {
      return `
        <h2 class="section-heading"><span class="section-heading__tag">05_</span>Certificates</h2>
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
            c.link
              ? `<a class="cert-card__link" ${externalLinkAttrs(c.link)}>View credential <span aria-hidden="true">&rarr;</span></a>`
              : ""
          }
        </article>`
      )
      .join("");

    return `
      <h2 class="section-heading"><span class="section-heading__tag">05_</span>Certificates</h2>
      <div class="card-grid card-grid--certs">${cardsHtml}</div>
    `;
  }

  function renderInterests(data) {
    const interests = Array.isArray(data && data.interests) ? data.interests : [];
    const pills = interests.map((i) => `<li class="pill">${escapeHtml(i)}</li>`).join("");
    return `
      <h2 class="section-heading"><span class="section-heading__tag">06_</span>Interests</h2>
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
      <h2 class="section-heading"><span class="section-heading__tag">07_</span>Contact</h2>
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
      "skills-root": renderSkills,
      "timeline-root": renderTimeline,
      "certificates-root": renderCertificates,
      "interests-root": renderInterests,
      "contact-root": renderContact,
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
    renderSkills,
    renderTimeline,
    renderCertificates,
    renderInterests,
    renderContact,
    renderAll,
  };
})(typeof window !== "undefined" ? window : this);
