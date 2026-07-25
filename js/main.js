/**
 * Public site controller: fetches data/content.json, renders every section
 * via the shared Render functions, then wires up nav/scroll and the hero
 * typing effect.
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
      initTypingEffect(data);
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

  function initTypingEffect(data) {
    var target = document.getElementById("heroTyping");
    var strings =
      data && data.hero && Array.isArray(data.hero.typingStrings) ? data.hero.typingStrings : [];
    if (!target || strings.length === 0) return;

    if (prefersReducedMotion()) {
      target.textContent = strings[0];
      return;
    }

    var stringIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var typeDelay = 60;
    var deleteDelay = 30;
    var holdDelay = 1400;
    var betweenDelay = 400;

    function tick() {
      var current = strings[stringIndex];

      if (!deleting) {
        charIndex++;
        target.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, holdDelay);
          return;
        }
        setTimeout(tick, typeDelay);
      } else {
        charIndex--;
        target.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          stringIndex = (stringIndex + 1) % strings.length;
          setTimeout(tick, betweenDelay);
          return;
        }
        setTimeout(tick, deleteDelay);
      }
    }

    setTimeout(tick, typeDelay);
  }
})();
