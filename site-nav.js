(() => {
  const directory = document.querySelector(".site-directory");
  if (!directory) return;
  const nav = directory.querySelector("nav");
  const toggle = directory.querySelector(".directory-toggle");
  const toggleLabel = toggle.querySelector("span");
  const links = [...nav.querySelectorAll("a[data-nav-page]")];
  const page = document.body.dataset.navPage;
  const pageLinks = links.filter((link) => link.dataset.navPage === page);
  const pageLink = pageLinks.find((link) => !link.dataset.navTarget);
  const sections = pageLinks
    .filter((link) => link.dataset.navTarget)
    .map((link) => ({ link, target: document.getElementById(link.dataset.navTarget) }))
    .filter(({ target }) => target);
  const narrow = window.matchMedia("(max-width: 767px)");

  document.body.classList.add("nav-ready");
  toggle.hidden = false;
  pageLink?.classList.add("is-current-page");

  function setMenu(open) {
    directory.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "收起目录" : "目录";
  }

  function markCurrent(active) {
    links.forEach((link) => {
      const current = link === active;
      link.classList.toggle("is-current", current);
      if (current) link.setAttribute("aria-current", link.dataset.navTarget ? "location" : "page");
      else link.removeAttribute("aria-current");
    });
  }

  function updateCurrent() {
    let active = pageLink;
    const readingLine = Math.min(160, window.innerHeight * 0.25);
    for (const { link, target } of sections) {
      if (target.getClientRects().length && target.getBoundingClientRect().top <= readingLine) active = link;
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = sections.at(-1)?.link || active;
    }
    if (active) markCurrent(active);
  }

  let scrollFrame = 0;
  function queueCurrent() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateCurrent();
    });
  }

  function followHash(hash, focus = false) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, "")); } catch { return; }
    if (!id) {
      window.scrollTo({ top: 0, behavior: "instant" });
      queueCurrent();
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    const detail = target.closest("details");
    for (let current = detail; current; current = current.parentElement?.closest("details")) current.open = true;
    const destination = detail || target;
    requestAnimationFrame(() => {
      destination.scrollIntoView({ block: "start", behavior: "instant" });
      if (focus) {
        const heading = destination.matches("details") ? destination.querySelector("summary") : destination;
        if (!heading.hasAttribute("tabindex") && !heading.matches("summary, a, button")) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      queueCurrent();
    });
  }

  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-nav-page]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    setMenu(false);
    if (url.pathname !== window.location.pathname) return;
    event.preventDefault();
    if (url.href !== window.location.href) history.pushState(null, "", url.href);
    followHash(url.hash, event.detail === 0);
  });
  document.addEventListener("click", (event) => {
    if (!directory.contains(event.target)) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && directory.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  narrow.addEventListener("change", () => { setMenu(false); queueCurrent(); });
  window.addEventListener("scroll", queueCurrent, { passive: true });
  window.addEventListener("resize", queueCurrent, { passive: true });
  document.addEventListener("toggle", queueCurrent, true);
  window.addEventListener("hashchange", () => followHash(window.location.hash));
  window.addEventListener("load", queueCurrent, { once: true });
  followHash(window.location.hash);
  updateCurrent();
})();
