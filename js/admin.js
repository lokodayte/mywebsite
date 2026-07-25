/**
 * Admin panel controller.
 *
 * Auth: a GitHub personal access token is requested on load and kept only
 * in sessionStorage (cleared when the tab closes) — it is never written to
 * a file and is only ever sent to api.github.com.
 *
 * Publishing: edits are held in memory (state.data) and, on "Save
 * changes", written straight to data/content.json in the target repo via
 * the GitHub Contents API (GET for the current SHA, then PUT the updated
 * file). That commit triggers GitHub Pages to rebuild automatically.
 */
(function () {
  "use strict";

  var CONFIG_KEY = "portfolioAdmin.config";
  var TOKEN_KEY = "portfolioAdmin.token"; // sessionStorage only — never localStorage, never a file.
  var CONTENT_PATH = "data/content.json";

  // To skip filling in owner/repo on every first connect on this machine,
  // you may hardcode defaults here (branch is not sensitive; owner/repo
  // are just the public repo location, not a secret):
  var DEFAULT_CONFIG = { owner: "", repo: "", branch: "main" };

  var state = {
    config: null,
    token: null,
    data: null,
    sha: null,
  };

  var dom = {};
  var previewReady = false;
  var previewTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheDom();
    loadConfigIntoForm();

    dom.configForm.addEventListener("submit", onConfigSubmit);
    dom.signOutBtn.addEventListener("click", onSignOut);
    dom.saveBtn.addEventListener("click", onSave);

    var existingToken = sessionStorage.getItem(TOKEN_KEY);
    var cfg = loadConfig();
    if (existingToken && cfg.owner && cfg.repo) {
      state.token = existingToken;
      state.config = cfg;
      attemptBoot();
    }
  }

  function cacheDom() {
    dom.tokenGate = document.getElementById("tokenGate");
    dom.adminApp = document.getElementById("adminApp");
    dom.configForm = document.getElementById("configForm");
    dom.cfgOwner = document.getElementById("cfgOwner");
    dom.cfgRepo = document.getElementById("cfgRepo");
    dom.cfgBranch = document.getElementById("cfgBranch");
    dom.cfgToken = document.getElementById("cfgToken");
    dom.configError = document.getElementById("configError");
    dom.repoLabel = document.getElementById("repoLabel");
    dom.publishStatus = document.getElementById("publishStatus");
    dom.saveBtn = document.getElementById("saveBtn");
    dom.signOutBtn = document.getElementById("signOutBtn");
    dom.sectionNav = document.getElementById("sectionNav");
    dom.editorPanels = document.getElementById("editorPanels");
    dom.previewFrame = document.getElementById("previewFrame");
  }

  // -----------------------------------------------------------------------
  // Config / token persistence
  // -----------------------------------------------------------------------

  function loadConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return Object.assign({}, DEFAULT_CONFIG);
      var parsed = JSON.parse(raw);
      return {
        owner: parsed.owner || DEFAULT_CONFIG.owner,
        repo: parsed.repo || DEFAULT_CONFIG.repo,
        branch: parsed.branch || DEFAULT_CONFIG.branch || "main",
      };
    } catch (e) {
      return Object.assign({}, DEFAULT_CONFIG);
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function loadConfigIntoForm() {
    var cfg = loadConfig();
    dom.cfgOwner.value = cfg.owner;
    dom.cfgRepo.value = cfg.repo;
    dom.cfgBranch.value = cfg.branch || "main";
  }

  function showConfigError(msg) {
    dom.configError.textContent = msg;
    dom.configError.hidden = false;
  }
  function hideConfigError() {
    dom.configError.hidden = true;
    dom.configError.textContent = "";
  }

  function onConfigSubmit(e) {
    e.preventDefault();
    hideConfigError();

    var owner = dom.cfgOwner.value.trim();
    var repo = dom.cfgRepo.value.trim();
    var branch = dom.cfgBranch.value.trim() || "main";
    var token = dom.cfgToken.value.trim();

    if (!owner || !repo || !token) {
      showConfigError("Repo owner, repo name, and token are all required.");
      return;
    }

    state.config = { owner: owner, repo: repo, branch: branch };
    state.token = token;

    var submitBtn = dom.configForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Connecting…";

    loadContentAndBoot()
      .then(function () {
        saveConfig(state.config);
        sessionStorage.setItem(TOKEN_KEY, token);
      })
      .catch(function (err) {
        showConfigError(describeApiError(err, "Could not connect"));
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Connect";
      });
  }

  function attemptBoot() {
    loadContentAndBoot().catch(function (err) {
      sessionStorage.removeItem(TOKEN_KEY);
      showConfigError(describeApiError(err, "Could not reconnect — please sign in again"));
    });
  }

  function onSignOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    location.reload();
  }

  // -----------------------------------------------------------------------
  // GitHub Contents API
  // -----------------------------------------------------------------------

  function ghRequest(pathAndQuery, options) {
    options = options || {};
    var url =
      "https://api.github.com/repos/" +
      encodeURIComponent(state.config.owner) +
      "/" +
      encodeURIComponent(state.config.repo) +
      pathAndQuery;
    var headers = Object.assign(
      {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + state.token,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      options.headers || {}
    );
    return fetch(url, Object.assign({}, options, { headers: headers }));
  }

  function apiError(res, fallbackMsg) {
    return res.json().catch(function () {
      return {};
    }).then(function (body) {
      var err = new Error(fallbackMsg);
      err.status = res.status;
      err.apiMessage = body && body.message;
      return err;
    });
  }

  function getContentFile(path) {
    return ghRequest("/contents/" + path + "?ref=" + encodeURIComponent(state.config.branch), {
      method: "GET",
      cache: "no-store",
    }).then(function (res) {
      if (!res.ok) {
        return apiError(res, "Failed to fetch " + path).then(function (err) {
          throw err;
        });
      }
      return res.json().then(function (body) {
        return { sha: body.sha, base64: body.content };
      });
    });
  }

  function putContentFile(path, base64Content, sha, message) {
    var payload = { message: message, content: base64Content, branch: state.config.branch };
    if (sha) payload.sha = sha;
    return ghRequest("/contents/" + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) {
        return apiError(res, "Failed to write " + path).then(function (err) {
          throw err;
        });
      }
      return res.json();
    });
  }

  function describeApiError(err, fallback) {
    if (err && err.status === 401) return "Invalid or expired token.";
    if (err && err.status === 403)
      return 'Token lacks permission (needs "Contents: Read and write") or the API rate limit was hit.';
    if (err && err.status === 404)
      return "Repository, branch, or file path not found. Check the owner/repo/branch and that the token has access.";
    if (err && err.status === 409)
      return "Conflict: the file changed on GitHub since it was loaded.";
    if (err && err.apiMessage) return fallback + ": " + err.apiMessage;
    return fallback + (err && err.message ? ": " + err.message : ".");
  }

  function loadContentAndBoot() {
    return getContentFile(CONTENT_PATH).then(function (file) {
      state.sha = file.sha;
      state.data = JSON.parse(b64DecodeUnicode(file.base64.replace(/\n/g, "")));
      showApp();
    });
  }

  // -----------------------------------------------------------------------
  // Base64 helpers (UTF-8 safe)
  // -----------------------------------------------------------------------

  function b64EncodeUnicode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
        return String.fromCharCode("0x" + p1);
      })
    );
  }

  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
  }

  function arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
  }

  function isValidLink(value) {
    if (!value) return false;
    return /^(https?:\/\/|mailto:|#|\.?\/?assets\/)/i.test(value.trim());
  }

  function generateId(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
  }

  function arrayMove(arr, from, to) {
    var item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
  }

  // -----------------------------------------------------------------------
  // App shell
  // -----------------------------------------------------------------------

  function showApp() {
    dom.tokenGate.hidden = true;
    dom.adminApp.hidden = false;
    dom.repoLabel.textContent =
      state.config.owner + "/" + state.config.repo + " @ " + state.config.branch;
    buildSectionNav();
    buildAllPanels();
    setupPreview();
    setActiveSection(SECTIONS[0].id);
  }

  var SECTIONS = [
    { id: "hero", label: "Hero", build: buildHeroPanel },
    { id: "about", label: "About", build: buildAboutPanel },
    { id: "projects", label: "Projects", build: buildProjectsPanel },
    { id: "skills", label: "Skills", build: buildSkillsPanel },
    { id: "timeline", label: "Education & Experience", build: buildTimelinePanel },
    { id: "certificates", label: "Certificates", build: buildCertificatesPanel },
    { id: "interests", label: "Interests", build: buildInterestsPanel },
    { id: "contact", label: "Contact", build: buildContactPanel },
  ];

  function buildSectionNav() {
    dom.sectionNav.innerHTML = "";
    SECTIONS.forEach(function (s) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = s.label;
      btn.dataset.section = s.id;
      btn.addEventListener("click", function () {
        setActiveSection(s.id);
      });
      li.appendChild(btn);
      dom.sectionNav.appendChild(li);
    });
  }

  function buildAllPanels() {
    dom.editorPanels.innerHTML = "";
    SECTIONS.forEach(function (s) {
      var panelEl = document.createElement("div");
      panelEl.className = "editor-panel";
      panelEl.id = "panel-" + s.id;
      dom.editorPanels.appendChild(panelEl);
      s.build(panelEl);
    });
  }

  function setActiveSection(id) {
    SECTIONS.forEach(function (s) {
      var panelEl = document.getElementById("panel-" + s.id);
      var navBtn = dom.sectionNav.querySelector('button[data-section="' + s.id + '"]');
      var active = s.id === id;
      if (panelEl) panelEl.classList.toggle("is-active", active);
      if (navBtn) navBtn.classList.toggle("is-active", active);
    });
  }

  // -----------------------------------------------------------------------
  // Live preview
  // -----------------------------------------------------------------------

  function setupPreview() {
    previewReady = false;
    var skeleton =
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\">" +
      '<link rel="stylesheet" href="css/style.css">' +
      // Google Fonts is loaded non-render-blocking (media="print" swapped to
      // "all" on load) so a slow or unreachable fonts.googleapis.com never
      // holds up the preview's first paint — it just falls back to the
      // system font stack until/unless the webfont arrives.
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" ' +
      "rel=\"stylesheet\" media=\"print\" onload=\"this.media='all'\">" +
      "</head><body>" +
      '<header class="site-header"><nav id="nav-root" class="nav container"></nav></header>' +
      '<main id="main">' +
      '<section class="section hero-section"><div id="hero-root" class="container"></div></section>' +
      '<section class="section"><div id="about-root" class="container"></div></section>' +
      '<section class="section"><div id="projects-root" class="container"></div></section>' +
      '<section class="section"><div id="skills-root" class="container"></div></section>' +
      '<section class="section"><div id="timeline-root" class="container"></div></section>' +
      '<section class="section"><div id="certificates-root" class="container"></div></section>' +
      '<section class="section"><div id="interests-root" class="container"></div></section>' +
      '<section class="section"><div id="contact-root" class="container"></div></section>' +
      "</main>" +
      '<footer class="site-footer"><p class="mono">Live preview</p></footer>' +
      "</body></html>";

    dom.previewFrame.srcdoc = skeleton;

    // Don't gate readiness on the iframe's `load` event: that waits for
    // every subresource (including the Google Fonts stylesheet), which can
    // hang or fail on a restricted network and would leave the preview
    // blank forever. Poll until the skeleton markup has actually parsed
    // instead — that's all renderAll() needs.
    var readyCheck = setInterval(function () {
      var doc = dom.previewFrame.contentDocument;
      if (doc && doc.readyState !== "loading" && doc.getElementById("hero-root")) {
        clearInterval(readyCheck);
        previewReady = true;
        updatePreview();
      }
    }, 50);
  }

  function schedulePreviewUpdate() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 150);
  }

  function updatePreview() {
    if (!previewReady || !state.data || !dom.previewFrame.contentDocument) return;
    try {
      Render.renderAll(state.data, dom.previewFrame.contentDocument);
    } catch (e) {
      console.error("Preview render failed:", e);
    }
  }

  // -----------------------------------------------------------------------
  // Save / publish
  // -----------------------------------------------------------------------

  function setPublishStatus(kind, text) {
    dom.publishStatus.textContent = text;
    dom.publishStatus.className = "publish-status mono" + (kind ? " publish-status--" + kind : "");
  }

  function onSave() {
    if (!state.data) return;
    setPublishStatus("busy", "Saving…");
    dom.saveBtn.disabled = true;

    var json = JSON.stringify(state.data, null, 2) + "\n";
    var base64 = b64EncodeUnicode(json);
    var message = "Update content via admin panel — " + new Date().toISOString();

    putContentFile(CONTENT_PATH, base64, state.sha, message)
      .then(function (result) {
        state.sha = result.content.sha;
        setPublishStatus("ok", "Saved ✓ " + new Date().toLocaleTimeString());
      })
      .catch(function (err) {
        if (err && err.status === 409) {
          return getContentFile(CONTENT_PATH)
            .then(function (fresh) {
              state.sha = fresh.sha;
              setPublishStatus(
                "error",
                'Content changed on GitHub since you loaded it. Latest version fetched — click "Save changes" again to publish your edits on top of it.'
              );
            })
            .catch(function (err2) {
              setPublishStatus("error", describeApiError(err2, "Conflict — could not refresh latest version"));
            });
        }
        setPublishStatus("error", describeApiError(err, "Save failed"));
      })
      .finally(function () {
        dom.saveBtn.disabled = false;
      });
  }

  // -----------------------------------------------------------------------
  // Generic panel helpers
  // -----------------------------------------------------------------------

  function panelHeading(container, title, desc) {
    var h = document.createElement("h2");
    h.className = "editor-panel__heading";
    h.textContent = title;
    container.appendChild(h);
    if (desc) {
      var p = document.createElement("p");
      p.className = "editor-panel__desc";
      p.textContent = desc;
      container.appendChild(p);
    }
  }

  function subheading(container, text) {
    var h = document.createElement("h3");
    h.className = "subheading";
    h.textContent = text;
    container.appendChild(h);
  }

  function bindText(container, opts) {
    var inputEl = opts.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    if (opts.type !== "textarea") inputEl.type = opts.type || "text";
    inputEl.value = opts.value || "";
    if (opts.placeholder) inputEl.placeholder = opts.placeholder;
    var wrap = document.createElement("label");
    wrap.className = "field";
    var span = document.createElement("span");
    span.className = "field__label";
    span.textContent = opts.label;
    wrap.appendChild(span);
    wrap.appendChild(inputEl);
    if (opts.hint) {
      var hint = document.createElement("span");
      hint.className = "field__hint";
      hint.textContent = opts.hint;
      wrap.appendChild(hint);
    }
    inputEl.addEventListener("input", function () {
      opts.onInput(inputEl.value);
      schedulePreviewUpdate();
    });
    container.appendChild(wrap);
    return inputEl;
  }

  function makeActionBtn(text, ariaLabel, handler, extraClass) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--ghost btn--sm" + (extraClass ? " " + extraClass : "");
    b.textContent = text;
    b.setAttribute("aria-label", ariaLabel);
    b.addEventListener("click", handler);
    return b;
  }

  function confirmDialog(message) {
    return new Promise(function (resolve) {
      var tpl = document.getElementById("tpl-confirm-dialog");
      var node = tpl.content.cloneNode(true);
      node.querySelector(".confirm-box__msg").textContent = message;
      var cancelBtn = node.querySelector(".confirm-box__cancel");
      var okBtn = node.querySelector(".confirm-box__ok");
      document.body.appendChild(node);
      var overlayEl = document.body.lastElementChild;

      function cleanup(result) {
        overlayEl.remove();
        resolve(result);
      }

      cancelBtn.addEventListener("click", function () {
        cleanup(false);
      });
      okBtn.addEventListener("click", function () {
        cleanup(true);
      });
      overlayEl.addEventListener("click", function (e) {
        if (e.target === overlayEl) cleanup(false);
      });
      okBtn.focus();
    });
  }

  // ---- String list editor (plain-string arrays: paragraphs, tags, interests) --

  function createStringListEditor(opts) {
    var container = opts.container;
    var getItems = opts.getItems;
    var noun = opts.itemNounSingular || "item";
    var wrap = document.createElement("div");
    wrap.className = "list-editor";
    var itemsEl = document.createElement("div");
    itemsEl.className = "list-editor__items";
    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn--secondary btn--sm";
    addBtn.textContent = "+ Add " + noun;
    wrap.appendChild(itemsEl);
    wrap.appendChild(addBtn);
    container.appendChild(wrap);

    function renderList() {
      var items = getItems();
      itemsEl.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("p");
        empty.className = "list-editor__empty";
        empty.textContent = "No " + noun + " items yet.";
        itemsEl.appendChild(empty);
      }
      items.forEach(function (value, idx) {
        var row = document.createElement("div");
        row.className = "list-item";
        var inputEl = document.createElement(opts.multiline ? "textarea" : "input");
        if (!opts.multiline) inputEl.type = "text";
        inputEl.value = value;
        if (opts.placeholder) inputEl.placeholder = opts.placeholder;
        inputEl.style.flex = "1";
        inputEl.addEventListener("input", function () {
          items[idx] = inputEl.value;
          schedulePreviewUpdate();
        });
        row.appendChild(inputEl);

        var actions = document.createElement("div");
        actions.className = "list-item__actions";
        if (idx > 0) {
          actions.appendChild(
            makeActionBtn("↑", "Move up", function () {
              arrayMove(items, idx, idx - 1);
              renderList();
              schedulePreviewUpdate();
            })
          );
        }
        if (idx < items.length - 1) {
          actions.appendChild(
            makeActionBtn("↓", "Move down", function () {
              arrayMove(items, idx, idx + 1);
              renderList();
              schedulePreviewUpdate();
            })
          );
        }
        actions.appendChild(
          makeActionBtn(
            "Delete",
            "Delete",
            function () {
              confirmDialog("Delete this " + noun + "?").then(function (ok) {
                if (!ok) return;
                items.splice(idx, 1);
                renderList();
                schedulePreviewUpdate();
              });
            },
            "btn--danger"
          )
        );
        row.appendChild(actions);
        itemsEl.appendChild(row);
      });
    }

    addBtn.addEventListener("click", function () {
      getItems().push("");
      renderList();
      var inputs = itemsEl.querySelectorAll("input, textarea");
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    renderList();
    return { refresh: renderList };
  }

  // ---- Object list editor (Projects, Certificates, Timeline, Skills, ctas...) --

  function createObjectListEditor(opts) {
    var container = opts.container;
    var getItems = opts.getItems;
    var fields = opts.fields;
    var noun = opts.itemNounSingular || "item";
    var wrap = document.createElement("div");
    wrap.className = "list-editor";
    var itemsEl = document.createElement("div");
    itemsEl.className = "list-editor__items";
    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn--secondary btn--sm";
    addBtn.textContent = "+ Add " + noun;
    var formHost = document.createElement("div");
    wrap.appendChild(itemsEl);
    wrap.appendChild(addBtn);
    wrap.appendChild(formHost);
    container.appendChild(wrap);

    function renderList() {
      var items = getItems();
      itemsEl.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("p");
        empty.className = "list-editor__empty";
        empty.textContent = "No " + noun + " items yet.";
        itemsEl.appendChild(empty);
      }
      items.forEach(function (item, idx) {
        var row = document.createElement("div");
        row.className = "list-item";
        var label = document.createElement("div");
        label.className = "list-item__label";
        var main = document.createElement("span");
        main.textContent = opts.labelFn(item) || "(untitled)";
        label.appendChild(main);
        if (opts.subLabelFn) {
          var small = document.createElement("small");
          small.textContent = opts.subLabelFn(item) || "";
          label.appendChild(small);
        }
        row.appendChild(label);

        var actions = document.createElement("div");
        actions.className = "list-item__actions";
        if (idx > 0) {
          actions.appendChild(
            makeActionBtn("↑", "Move up", function () {
              arrayMove(items, idx, idx - 1);
              renderList();
              schedulePreviewUpdate();
            })
          );
        }
        if (idx < items.length - 1) {
          actions.appendChild(
            makeActionBtn("↓", "Move down", function () {
              arrayMove(items, idx, idx + 1);
              renderList();
              schedulePreviewUpdate();
            })
          );
        }
        actions.appendChild(
          makeActionBtn("Edit", "Edit", function () {
            openForm(idx);
          })
        );
        actions.appendChild(
          makeActionBtn(
            "Delete",
            "Delete",
            function () {
              confirmDialog('Delete "' + (opts.labelFn(item) || noun) + '"? This cannot be undone.').then(
                function (ok) {
                  if (!ok) return;
                  items.splice(idx, 1);
                  renderList();
                  schedulePreviewUpdate();
                }
              );
            },
            "btn--danger"
          )
        );
        row.appendChild(actions);
        itemsEl.appendChild(row);
      });
    }

    function openForm(idx) {
      formHost.innerHTML = "";
      var items = getItems();
      var source = idx === -1 ? (opts.defaultItem ? opts.defaultItem() : {}) : items[idx];
      var formEl = document.createElement("div");
      formEl.className = "item-form";
      var inputs = {};

      fields.forEach(function (f) {
        var value = source[f.key];
        var inputEl;
        if (f.type === "textarea") {
          inputEl = document.createElement("textarea");
          inputEl.value = value || "";
        } else if (f.type === "select") {
          inputEl = document.createElement("select");
          (f.options || []).forEach(function (o) {
            var opt = document.createElement("option");
            opt.value = o.value;
            opt.textContent = o.label;
            if (value === o.value) opt.selected = true;
            inputEl.appendChild(opt);
          });
        } else {
          inputEl = document.createElement("input");
          inputEl.type = "text";
          inputEl.value = f.type === "tags" ? (Array.isArray(value) ? value.join(", ") : "") : value || "";
        }
        if (f.placeholder) inputEl.placeholder = f.placeholder;

        var fieldWrap = document.createElement("label");
        fieldWrap.className = "field";
        var span = document.createElement("span");
        span.className = "field__label";
        span.textContent = f.label + (f.required ? " *" : "");
        fieldWrap.appendChild(span);
        fieldWrap.appendChild(inputEl);
        var errEl = document.createElement("span");
        errEl.className = "field__error";
        errEl.hidden = true;
        fieldWrap.appendChild(errEl);
        formEl.appendChild(fieldWrap);
        inputs[f.key] = { el: inputEl, errEl: errEl, field: f };
      });

      var actions = document.createElement("div");
      actions.className = "item-form__actions";
      var saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn btn--primary btn--sm";
      saveBtn.textContent = idx === -1 ? "Add " + noun : "Save";
      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn--secondary btn--sm";
      cancelBtn.textContent = "Cancel";
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      formEl.appendChild(actions);
      formHost.appendChild(formEl);

      var firstKey = fields[0] && fields[0].key;
      if (firstKey && inputs[firstKey]) inputs[firstKey].el.focus();

      cancelBtn.addEventListener("click", function () {
        formHost.innerHTML = "";
      });

      saveBtn.addEventListener("click", function () {
        var valid = true;
        var result = idx === -1 ? {} : Object.assign({}, items[idx]);

        fields.forEach(function (f) {
          var rec = inputs[f.key];
          var val = rec.el.value.trim();
          rec.errEl.hidden = true;
          rec.el.classList.remove("has-error");

          if (f.required && !val) {
            valid = false;
            rec.errEl.textContent = f.label + " is required.";
            rec.errEl.hidden = false;
            rec.el.classList.add("has-error");
            return;
          }
          if (f.type === "url" && val && !isValidLink(val)) {
            valid = false;
            rec.errEl.textContent = "Enter a valid URL (https://…), mailto:, #anchor, or assets/ path.";
            rec.errEl.hidden = false;
            rec.el.classList.add("has-error");
            return;
          }
          if (f.type === "tags") {
            result[f.key] = val
              ? val
                  .split(",")
                  .map(function (s) {
                    return s.trim();
                  })
                  .filter(Boolean)
              : [];
          } else {
            result[f.key] = val;
          }
        });

        if (!valid) return;

        if (idx === -1) {
          result.id = generateId(noun.replace(/\s+/g, "-").toLowerCase());
          items.push(result);
        } else {
          items[idx] = result;
        }
        formHost.innerHTML = "";
        renderList();
        schedulePreviewUpdate();
      });
    }

    addBtn.addEventListener("click", function () {
      openForm(-1);
    });

    renderList();
    return { refresh: renderList };
  }

  // ---- Asset uploader (photo / résumé) -----------------------------------

  function buildAssetUploader(container, opts) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var labelEl = document.createElement("span");
    labelEl.className = "field__label";
    labelEl.textContent = opts.label;
    wrap.appendChild(labelEl);

    var row = document.createElement("div");
    row.className = "asset-upload";
    var previewEl;
    if (opts.isImage) {
      previewEl = document.createElement("img");
      previewEl.className = "asset-upload__preview";
      previewEl.alt = "";
      previewEl.src = opts.getPath() || "";
      row.appendChild(previewEl);
    }
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = opts.accept || "";
    row.appendChild(fileInput);
    wrap.appendChild(row);

    var pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.placeholder = "assets/filename.ext";
    pathInput.value = opts.getPath() || "";
    wrap.appendChild(pathInput);

    var statusEl = document.createElement("span");
    statusEl.className = "asset-upload__status";
    wrap.appendChild(statusEl);

    container.appendChild(wrap);

    pathInput.addEventListener("input", function () {
      var val = pathInput.value.trim();
      opts.setPath(val);
      if (previewEl) previewEl.src = val;
      schedulePreviewUpdate();
    });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = "Uploading…";
      statusEl.className = "asset-upload__status publish-status--busy";

      file
        .arrayBuffer()
        .then(function (buffer) {
          var base64 = arrayBufferToBase64(buffer);
          var path = "assets/" + Date.now() + "-" + sanitizeFilename(file.name);
          return putContentFile(path, base64, null, "Upload asset via admin panel — " + new Date().toISOString()).then(
            function () {
              return path;
            }
          );
        })
        .then(function (path) {
          opts.setPath(path);
          pathInput.value = path;
          if (previewEl) previewEl.src = path;
          statusEl.textContent = 'Uploaded ✓ — click "Save changes" to publish this reference.';
          statusEl.className = "asset-upload__status publish-status--ok";
          schedulePreviewUpdate();
        })
        .catch(function (err) {
          statusEl.textContent = describeApiError(err, "Upload failed");
          statusEl.className = "asset-upload__status publish-status--error";
        });
    });
  }

  // -----------------------------------------------------------------------
  // Section panel builders
  // -----------------------------------------------------------------------

  function buildHeroPanel(container) {
    var h = state.data.hero;
    panelHeading(container, "Hero", "The first thing a visitor sees.");
    bindText(container, {
      label: "Name",
      value: h.name,
      onInput: function (v) {
        h.name = v;
      },
    });
    bindText(container, {
      label: "Role / title",
      value: h.role,
      onInput: function (v) {
        h.role = v;
      },
    });
    bindText(container, {
      label: "Tagline",
      value: h.tagline,
      onInput: function (v) {
        h.tagline = v;
      },
    });
    bindText(container, {
      label: "Intro paragraph",
      type: "textarea",
      value: h.intro,
      onInput: function (v) {
        h.intro = v;
      },
    });
    bindText(container, {
      label: "Availability status",
      value: h.status,
      placeholder: "e.g. Available for internships",
      onInput: function (v) {
        h.status = v;
      },
    });

    subheading(container, "Terminal typing lines");
    createStringListEditor({
      container: container,
      getItems: function () {
        return h.typingStrings;
      },
      itemNounSingular: "line",
      placeholder: "e.g. nmap -sV target.local",
    });

    subheading(container, "Call-to-action buttons");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return h.ctas;
      },
      itemNounSingular: "button",
      labelFn: function (i) {
        return i.label;
      },
      subLabelFn: function (i) {
        return i.href;
      },
      defaultItem: function () {
        return { style: "secondary" };
      },
      fields: [
        { key: "label", label: "Button text", required: true },
        { key: "href", label: "Link (URL or #section)", type: "url", required: true },
        {
          key: "style",
          label: "Style",
          type: "select",
          options: [
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" },
          ],
        },
      ],
    });
  }

  function buildAboutPanel(container) {
    var a = state.data.about;
    panelHeading(container, "About", "Bio, stats, and photo.");
    bindText(container, {
      label: "Section heading",
      value: a.heading,
      onInput: function (v) {
        a.heading = v;
      },
    });

    subheading(container, "Bio paragraphs");
    createStringListEditor({
      container: container,
      getItems: function () {
        return a.paragraphs;
      },
      itemNounSingular: "paragraph",
      multiline: true,
    });

    subheading(container, "Photo");
    buildAssetUploader(container, {
      label: "Profile photo",
      accept: "image/*",
      isImage: true,
      getPath: function () {
        return a.photo;
      },
      setPath: function (p) {
        a.photo = p;
      },
    });

    subheading(container, "Quick stats");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return a.stats;
      },
      itemNounSingular: "stat",
      labelFn: function (i) {
        return i.value + " — " + i.label;
      },
      fields: [
        { key: "value", label: "Value", required: true, placeholder: "e.g. 20+" },
        { key: "label", label: "Label", required: true, placeholder: "e.g. CTFs completed" },
      ],
    });
  }

  function buildProjectsPanel(container) {
    panelHeading(container, "Projects", "Shown as a card grid.");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return state.data.projects;
      },
      itemNounSingular: "project",
      labelFn: function (i) {
        return i.title;
      },
      subLabelFn: function (i) {
        return (i.status || "").toUpperCase();
      },
      defaultItem: function () {
        return { status: "source" };
      },
      fields: [
        { key: "title", label: "Title", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "live", label: "Live" },
            { value: "demo", label: "Demo" },
            { value: "source", label: "Source" },
          ],
        },
        { key: "initials", label: "Logo initials", placeholder: "e.g. NS" },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "tech", label: "Tech tags (comma separated)", type: "tags" },
        { key: "link", label: "Project / repo link", type: "url", required: true },
      ],
    });
  }

  function buildSkillsPanel(container) {
    panelHeading(container, "Skills", "Grouped tag lists.");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return state.data.skills;
      },
      itemNounSingular: "skill group",
      labelFn: function (i) {
        return i.group;
      },
      subLabelFn: function (i) {
        return (i.items || []).join(", ");
      },
      fields: [
        { key: "group", label: "Group name", required: true, placeholder: "e.g. Security & Networking" },
        { key: "items", label: "Skills (comma separated)", type: "tags", required: true },
      ],
    });
  }

  function buildTimelinePanel(container) {
    panelHeading(container, "Education & Experience", "Rendered as a single chronological log — use the arrows to reorder.");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return state.data.timeline;
      },
      itemNounSingular: "entry",
      labelFn: function (i) {
        return i.title;
      },
      subLabelFn: function (i) {
        return i.start + " – " + i.end + " · " + i.org;
      },
      fields: [
        { key: "start", label: "Start (e.g. 2023-08)", required: true, placeholder: "YYYY-MM" },
        { key: "end", label: "End (e.g. 2024-05 or Present)", required: true, placeholder: "YYYY-MM or Present" },
        { key: "title", label: "Title", required: true },
        { key: "org", label: "Organization", required: true },
        { key: "description", label: "Description", type: "textarea", required: true },
      ],
    });
  }

  function buildCertificatesPanel(container) {
    panelHeading(container, "Certificates", "Shown as cards with a credential link.");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return state.data.certificates;
      },
      itemNounSingular: "certificate",
      labelFn: function (i) {
        return i.name;
      },
      subLabelFn: function (i) {
        return i.issuer + " · " + i.date;
      },
      fields: [
        { key: "name", label: "Certificate name", required: true },
        { key: "issuer", label: "Issuer", required: true },
        { key: "date", label: "Date", required: true, placeholder: "YYYY-MM" },
        { key: "link", label: "View credential link", type: "url" },
      ],
    });
  }

  function buildInterestsPanel(container) {
    panelHeading(container, "Interests", "Shown as a pill row.");
    createStringListEditor({
      container: container,
      getItems: function () {
        return state.data.interests;
      },
      itemNounSingular: "interest",
    });
  }

  function buildContactPanel(container) {
    var c = state.data.contact;
    panelHeading(container, "Contact", "Email, résumé, and social links.");
    bindText(container, {
      label: "Email",
      type: "email",
      value: c.email,
      onInput: function (v) {
        c.email = v;
      },
    });

    subheading(container, "Résumé");
    buildAssetUploader(container, {
      label: "Résumé PDF",
      accept: "application/pdf",
      isImage: false,
      getPath: function () {
        return c.resume;
      },
      setPath: function (p) {
        c.resume = p;
      },
    });

    subheading(container, "Social links");
    createObjectListEditor({
      container: container,
      getItems: function () {
        return c.socials;
      },
      itemNounSingular: "link",
      labelFn: function (i) {
        return i.label;
      },
      subLabelFn: function (i) {
        return i.href;
      },
      fields: [
        { key: "label", label: "Label", required: true, placeholder: "e.g. GitHub" },
        { key: "href", label: "URL", type: "url", required: true },
      ],
    });
  }
})();
