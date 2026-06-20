// Glide Book interactivity. No framework, no dependencies.
//
// Wires the per-chapter behaviour that the static HTML doesn't carry on
// its own: reading-progress bar, scroll-spy for the right TOC, copy
// buttons on code blocks, sidebar section collapse/expand, chapter
// filter, read-tracking via localStorage (with checkmark indicators on
// the sidebar and the index cards), mobile sidebar drawer, and the
// "was this page helpful?" feedback toggle.
//
// Idempotent — safe to re-run, used as a `defer` script so it executes
// once after the document parses.

(function () {
  "use strict";

  const STORAGE_KEY = "glide-book-read-v1";

  function readSet() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch (_) {
      return new Set();
    }
  }

  function writeSet(set) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch (_) {
      // Quota / private-mode — silently skip; progress is non-critical.
    }
  }

  // ---------------------------------------------------------------- progress

  function setupProgressBar() {
    const bar = document.getElementById("doc-progress-bar");
    if (!bar) return;
    let ticking = false;
    function update() {
      const h = document.documentElement;
      const sc = h.scrollTop || document.body.scrollTop || 0;
      const mx = h.scrollHeight - h.clientHeight;
      bar.style.width = (mx > 0 ? (sc / mx) * 100 : 0) + "%";
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  // ----------------------------------------------------------- right-toc spy

  function setupScrollSpy() {
    const links = document.querySelectorAll(".doc-toc a");
    if (!links.length) return;
    const heads = [];
    links.forEach(function (a) {
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) heads.push({ el: el, link: a });
    });
    if (!heads.length) return;

    // Threshold clears the 72px sticky header plus the headings'
    // scroll-margin-top (90px) so the entry that just slid under the
    // header is the one highlighted.
    const THRESHOLD = 100;
    let ticking = false;
    function spy() {
      // Viewport-relative measurement: pick the LAST heading whose top
      // has crossed above the threshold. offsetTop is relative to the
      // offsetParent (positioned .doc-main/.doc-article), not the
      // document, so it can't be compared against window scroll here.
      let act = heads[0];
      for (let i = 0; i < heads.length; i++) {
        if (heads[i].el.getBoundingClientRect().top <= THRESHOLD) {
          act = heads[i];
        }
      }
      links.forEach(function (a) {
        a.classList.remove("active");
      });
      act.link.classList.add("active");
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(spy);
          ticking = true;
        }
      },
      { passive: true }
    );
    spy();
  }

  // ------------------------------------------------------------ copy buttons

  function setupCopyButtons() {
    document.querySelectorAll(".code-frame").forEach(function (frame) {
      const pre = frame.querySelector("pre.code");
      if (!pre) return;
      // Idempotent: skip frames that already have a copy button so a
      // re-run of the IIFE doesn't stack duplicate buttons.
      if (frame.querySelector(".code-copy")) return;
      // The copy target is the <code> inside <pre>. The button is a
      // sibling of <pre> (appended to the frame), so pre.innerText holds
      // only the source — no "Copy" label and no gutter (the markup has
      // no line-number gutter; the frame bar lives outside the <pre>).
      const codeEl = pre.querySelector("code") || pre;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.setAttribute("aria-label", "Copy code");
      btn.innerHTML =
        '<span class="code-copy-icon" aria-hidden="true">⧉</span>' +
        '<span class="code-copy-label">Copy</span>';
      btn.addEventListener("click", function () {
        const text = codeEl.innerText;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(function () {
          btn.classList.add("copied");
          const lbl = btn.querySelector(".code-copy-label");
          if (lbl) lbl.textContent = "Copied";
          setTimeout(function () {
            btn.classList.remove("copied");
            if (lbl) lbl.textContent = "Copy";
          }, 1400);
        });
      });
      frame.appendChild(btn);
    });
  }

  // ------------------------------------------------------------- sidebar nav

  function setupSidebar() {
    const sidebar = document.querySelector(".doc-sidebar");
    if (!sidebar) return;

    // Collapsible sections — start with only the active section open.
    sidebar.querySelectorAll(".doc-nav-section").forEach(function (sec) {
      const toggle = sec.querySelector(".doc-nav-section-toggle");
      if (!toggle) return;
      const hasActive = !!sec.querySelector(".doc-nav-item.active");
      if (!hasActive) sec.classList.add("collapsed");
      toggle.addEventListener("click", function () {
        sec.classList.toggle("collapsed");
      });
    });

    // The default collapsed state, so the filter can restore it after
    // expanding everything to show matches across sections.
    function isDefaultCollapsed(sec) {
      return !sec.querySelector(".doc-nav-item.active");
    }

    // Filter — type to narrow chapters. Matches title + chapter number.
    const filter = sidebar.querySelector(".doc-nav-filter");
    if (filter) {
      filter.addEventListener("input", function () {
        const q = filter.value.trim().toLowerCase();
        sidebar.querySelectorAll(".doc-nav-section").forEach(function (sec) {
          let visible = 0;
          sec
            .querySelectorAll(".doc-nav-item")
            .forEach(function (li) {
              const t = (li.getAttribute("data-search") || li.textContent)
                .toLowerCase();
              const match = q === "" || t.indexOf(q) !== -1;
              li.style.display = match ? "" : "none";
              if (match) visible++;
            });
          sec.style.display = visible || q === "" ? "" : "none";
          // While filtering, expand every section so matches are visible
          // regardless of section. When the query is cleared, restore the
          // default collapsed state (only the active section stays open).
          if (q !== "") {
            sec.classList.remove("collapsed");
          } else if (isDefaultCollapsed(sec)) {
            sec.classList.add("collapsed");
          }
        });
      });
      filter.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") {
          filter.value = "";
          filter.dispatchEvent(new Event("input"));
          filter.blur();
        }
      });
    }

    // Hydrate read state from localStorage. Anything in the set gets a
    // visual checkmark; the counter updates accordingly.
    const read = readSet();
    sidebar.querySelectorAll(".doc-nav-item").forEach(function (li) {
      const slug = li.getAttribute("data-slug");
      if (slug && read.has(slug)) li.setAttribute("data-read", "1");
    });

    updateProgressCounter(sidebar, read);
  }

  function updateProgressCounter(sidebar, read) {
    const counter = sidebar.querySelector(".doc-nav-progress-count");
    const bar = sidebar.querySelector(".doc-nav-progress-bar");
    const items = sidebar.querySelectorAll(".doc-nav-item");
    if (!counter || !bar) return;
    const total = items.length;
    let done = 0;
    items.forEach(function (li) {
      const slug = li.getAttribute("data-slug");
      if (slug && read.has(slug)) done++;
    });
    counter.textContent = done + " / " + total;
    bar.style.width = total > 0 ? (done / total) * 100 + "%" : "0%";
  }

  // ---------------------------------------------------------- mark-as-read

  function setupReadTracking() {
    // The current chapter's slug is in the doc-shell data attribute so the
    // tracker doesn't need to parse the URL.
    const shell = document.querySelector(".doc-shell");
    if (!shell) return;
    const slug = shell.getAttribute("data-slug");
    if (!slug) return;

    let marked = false;
    function check() {
      if (marked) return;
      const h = document.documentElement;
      const sc = h.scrollTop || document.body.scrollTop || 0;
      const mx = h.scrollHeight - h.clientHeight;
      // 85% threshold — caller has demonstrably reached the end.
      if (mx > 0 && sc / mx > 0.85) {
        marked = true;
        const set = readSet();
        set.add(slug);
        writeSet(set);
        // Reflect in this page's sidebar immediately.
        const sidebar = document.querySelector(".doc-sidebar");
        if (sidebar) {
          const li = sidebar.querySelector(
            '.doc-nav-item[data-slug="' + slug + '"]'
          );
          if (li) li.setAttribute("data-read", "1");
          updateProgressCounter(sidebar, set);
        }
      }
    }
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  // -------------------------------------------------------- index-card marks

  function setupIndexCards() {
    const cards = document.querySelectorAll(".book-card[data-slug]");
    if (!cards.length) return;
    const read = readSet();
    cards.forEach(function (card) {
      const slug = card.getAttribute("data-slug");
      if (slug && read.has(slug)) card.setAttribute("data-read", "1");
    });

    // Index-page progress strip — show "N / M chapters read" if present.
    const strip = document.querySelector(".book-progress-strip");
    if (strip) {
      const total = cards.length;
      let done = 0;
      cards.forEach(function (c) {
        if (c.getAttribute("data-read") === "1") done++;
      });
      const text = strip.querySelector(".book-progress-count");
      const bar = strip.querySelector(".book-progress-fill");
      if (text) text.textContent = done + " of " + total;
      if (bar) bar.style.width = total > 0 ? (done / total) * 100 + "%" : "0%";
    }
  }

  // ----------------------------------------------------------- mobile drawer

  function setupMobileDrawer() {
    const btn = document.querySelector(".doc-mobile-toggle");
    const sidebar = document.querySelector(".doc-sidebar");
    const backdrop = document.querySelector(".doc-mobile-backdrop");
    if (!btn || !sidebar || !backdrop) return;

    function close() {
      document.body.classList.remove("doc-mobile-open");
      btn.setAttribute("aria-expanded", "false");
    }
    function open() {
      document.body.classList.add("doc-mobile-open");
      btn.setAttribute("aria-expanded", "true");
    }
    btn.addEventListener("click", function () {
      const isOpen = document.body.classList.contains("doc-mobile-open");
      if (isOpen) close();
      else open();
    });
    backdrop.addEventListener("click", close);
    sidebar.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    window.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") close();
    });
  }

  // ---------------------------------------------------------------- feedback

  function setupFeedback() {
    document.querySelectorAll(".doc-fb-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        const parent = b.closest(".doc-fb-buttons");
        if (parent)
          parent.querySelectorAll(".doc-fb-btn").forEach(function (x) {
            x.classList.remove("selected");
          });
        b.classList.add("selected");
        const f = b.closest(".doc-feedback");
        if (f && !f.querySelector(".doc-fb-thanks")) {
          const msg = document.createElement("p");
          msg.className = "doc-fb-thanks";
          msg.textContent = "Thanks for the feedback.";
          f.appendChild(msg);
        }
      });
    });
  }

  // -------------------------------------------------------------- bootstrap

  setupProgressBar();
  setupScrollSpy();
  setupCopyButtons();
  setupSidebar();
  setupReadTracking();
  setupIndexCards();
  setupMobileDrawer();
  setupFeedback();

  // Debug hook: ?open opens the mobile drawer on load. Lets us
  // screenshot the drawer state without a live click.
  if (window.location.search.indexOf("open") !== -1) {
    document.body.classList.add("doc-mobile-open");
  }
})();
