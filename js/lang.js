// Language preference + first-visit auto-detection for glide-lang.org.
//
// Every page exists in two languages: English at the canonical path, and
// Portuguese under `/pt/` (site pages) or `/book/pt/` (the book). The EN|PT
// switcher in the nav links to the counterpart page; clicking it records an
// explicit choice in localStorage. On a first visit with NO stored choice,
// a Portuguese-preferring browser is redirected once to the PT page. After
// any explicit choice, detection no longer overrides the user.
//
// Loaded early (non-deferred) in <head> so the redirect happens before paint.
(function () {
  var KEY = "glide-lang";

  function isPt(p) {
    return p === "/pt" || p.indexOf("/pt/") === 0 || p.indexOf("/book/pt") === 0;
  }
  function toPt(p) {
    if (isPt(p)) return p;
    if (p.indexOf("/book/") === 0) return "/book/pt/" + p.slice(6);
    if (p === "/" || p === "") return "/pt/";
    return "/pt" + p;
  }

  // Record the explicit choice whenever a switcher option is clicked.
  // Delegated on document so it works no matter when the nav renders.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a.lang-opt") : null;
    if (!a) return;
    var hl = (a.getAttribute("hreflang") || "").toLowerCase();
    try { localStorage.setItem(KEY, hl.indexOf("pt") === 0 ? "pt" : "en"); } catch (_) {}
  });

  // First-visit detection only: never override an explicit choice, and
  // never touch a page that's already Portuguese (avoids redirect loops).
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (_) {}
  if (stored) return;

  var path = location.pathname;
  if (isPt(path)) return;

  var langs = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ""];
  var prefersPt = (langs[0] || "").toLowerCase().indexOf("pt") === 0;
  if (prefersPt) {
    location.replace(toPt(path) + location.search + location.hash);
  }
})();
