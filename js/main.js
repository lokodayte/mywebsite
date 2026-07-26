/**
 * Public site controller: fetches data/content.json, renders every section
 * via the shared Render functions, then wires up nav/scroll and a gentle
 * reveal-on-scroll effect.
 */
(function () {
  "use strict";

  var loadingState = document.getElementById("loadingState");
  var errorState = document.getElementById("errorState");
  var footerYear = document.getElementById("footerYear");

  if (footerYear) footerYear.textContent = new Date().getFullYear();

  fetch("data/content.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      Render.renderAll(data, document);
      if (loadingState) loadingState.hidden = true;
      initNav();
      initScrollSpy();
      initScrollReveal();
    })
    .catch(function (err) {
      console.error("Failed to load content.json:", err);
      if (loadingState) loadingState.hidden = true;
      if (errorState) errorState.hidden = false;
    });

  function initNav() {
    var links = document.querySelectorAll('.nav-links a[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        var targetId = link.getAttribute("href").slice(1);
        var target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
        history.pushState(null, "", "#" + targetId);
      });
    });
  }

  function initScrollSpy() {
    var sections = document.querySelectorAll("main .section");
    var navLinks = document.querySelectorAll(".nav-links a");
    if (!sections.length || !navLinks.length || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            var isActive = link.getAttribute("href") === "#" + id;
            link.classList.toggle("is-active", isActive);
            if (isActive) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Gentle one-time fade/slide as each section enters the viewport. Sections
  // are fully visible by default (see css/style.css) — this only opts a
  // section into the brief "hidden, about to animate in" state right before
  // it's revealed, so a JS error never leaves content permanently invisible.
  // Skipped entirely under reduced motion.
  //
  // Deliberately not IntersectionObserver-based: that API only fires when a
  // section is caught mid-transit through the viewport across a rendered
  // frame, so a very fast scroll, an instant "End"-key jump, or a
  // full-page/print capture can skip a section's transition window entirely
  // and leave it invisible forever. Re-checking each pending section's actual
  // position after every scroll/resize event instead is correct at any
  // scroll speed, since it reveals anything now at-or-above the fold rather
  // than depending on having witnessed it cross a threshold.
  function initScrollReveal() {
    var sections = document.querySelectorAll("main .section");
    if (!sections.length || prefersReducedMotion()) return;

    var pending = Array.prototype.slice.call(sections);
    pending.forEach(function (section) {
      section.classList.add("reveal-pending");
    });
    var ticking = false;

    function revealVisible() {
      var vh = window.innerHeight;
      pending = pending.filter(function (section) {
        if (section.getBoundingClientRect().top < vh * 0.9) {
          section.classList.add("is-visible");
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(revealVisible);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    revealVisible();
  }
})();
