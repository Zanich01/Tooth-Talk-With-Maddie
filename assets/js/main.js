"use strict";

// Progressive enhancement: navigation remains visible without JavaScript.
const navigation = document.querySelector(".navbar");
const menuToggle = document.querySelector(".menu-toggle");
const navigationLinks = document.querySelector("#nav-links");
if (navigation && menuToggle && navigationLinks) {
  const mobileMenu = window.matchMedia("(max-width: 959px)");
  const setMenu = (open, returnFocus = false) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector(".menu-label").textContent = open ? "Close" : "Menu";
    navigationLinks.hidden = mobileMenu.matches && !open;
    if (returnFocus) menuToggle.focus();
  };
  const syncMenu = () => {
    const focusWasInLinks = navigationLinks.contains(document.activeElement);
    menuToggle.hidden = !mobileMenu.matches;
    setMenu(false, mobileMenu.matches && focusWasInLinks);
  };
  menuToggle.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false, true);
    }
  });
  document.addEventListener("click", event => {
    if (!menuToggle.contains(event.target) && !navigationLinks.contains(event.target)) setMenu(false);
  });
  document.addEventListener("focusin", event => {
    if (!menuToggle.contains(event.target) && !navigationLinks.contains(event.target)) setMenu(false);
  });
  navigationLinks.addEventListener("click", event => {
    if (event.target.closest("a")) setMenu(false);
  });
  mobileMenu.addEventListener("change", syncMenu);
  syncMenu();
}

// All page links and data paths are relative so subdirectory hosting works.
const searchBar = document.querySelector("#search-bar");
const results = document.querySelector("#results");
const topButton = document.querySelector("#topBtn");
const catalogCache = new Map();
function loadCatalog(path) {
  if (!catalogCache.has(path)) {
    const request = fetch(path).then(response => {
      if (!response.ok) throw new Error("Search data unavailable");
      return response.json();
    }).catch(error => { catalogCache.delete(path); throw error; });
    catalogCache.set(path, request);
  }
  return catalogCache.get(path);
}

let searchVersion = 0;
function dismissSearch() {
  searchVersion++;
  results.hidden = true;
  searchBar.setAttribute("aria-expanded", "false");
}
function renderMatches(title, entries, external) {
  if (!entries.length) return;
  const heading = document.createElement("h2");
  heading.textContent = title;
  results.append(heading);
  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = external ? "product" : "topic-result";
    const link = document.createElement("a");
    link.href = entry.url;
    link.textContent = entry.name;
    if (external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const image = document.createElement("img");
      image.src = entry.image;
      image.alt = "";
      image.width = 64;
      image.height = 80;
      image.loading = "lazy";
      card.append(image);
    }
    const info = document.createElement("div");
    info.className = "product-info";
    const detail = document.createElement("p");
    detail.textContent = entry.description || entry.category;
    info.append(link, detail);
    card.append(info);
    results.append(card);
  }
}
async function searchSite() {
  const version = ++searchVersion;
  const query = searchBar.value.trim().toLowerCase();
  results.replaceChildren();
  results.hidden = !query;
  searchBar.setAttribute("aria-expanded", String(Boolean(query)));
  if (!query) return;
  results.textContent = "Searching topics and products…";
  const responses = await Promise.allSettled([
    loadCatalog("data/topics.json"), loadCatalog("data/products.json")
  ]);
  if (version !== searchVersion) return;
  const words = query.split(/\s+/);
  const matches = responses.map(response => response.status === "fulfilled"
    ? response.value.filter(entry => {
      const searchable = [entry.name, entry.category, entry.description, entry.keywords].join(" ").toLowerCase();
      return words.every(word => searchable.includes(word));
    }) : []);
  results.replaceChildren();
  const count = matches[0].length + matches[1].length;
  const summary = document.createElement("p");
  summary.textContent = count ? `${count} result${count === 1 ? "" : "s"} found`
    : "No results found. Try gums, cavities, dry mouth, or whitening.";
  results.append(summary);
  if (responses.some(response => response.status === "rejected")) {
    const error = document.createElement("p");
    error.textContent = "Some search results could not load. Try again or use the navigation links.";
    results.append(error);
  }
  renderMatches("Explore dental health", matches[0], false);
  renderMatches("Oral care products", matches[1], true);
}
if (searchBar && results) {
  searchBar.setAttribute("aria-expanded", "false");
  searchBar.addEventListener("input", searchSite);
  searchBar.addEventListener("focus", searchSite);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (results.contains(document.activeElement)) searchBar.focus();
      dismissSearch();
    }
  });
  document.addEventListener("click", event => {
    if (!searchBar.contains(event.target) && !results.contains(event.target)) dismissSearch();
  });
  document.addEventListener("focusin", event => {
    if (!searchBar.contains(event.target) && !results.contains(event.target)) dismissSearch();
  });
}

// Disclosures close on click-away or Escape; clicks inside stay interactive.
const disclosures = [...document.querySelectorAll(".routine-card, .faq-list details, .comparison-card, .buying-help")];
const closeDisclosure = (detail, restoreFocus = false) => {
  detail.open = false;
  if (restoreFocus) detail.querySelector("summary").focus();
};
document.addEventListener("click", event => {
  for (const detail of disclosures) {
    if (detail.open && !detail.contains(event.target)) closeDisclosure(detail);
  }
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  for (const detail of disclosures) {
    if (detail.open) closeDisclosure(detail, detail.contains(document.activeElement));
  }
});

const filters = document.querySelector(".product-filters");
if (filters) {
  const categories = [...document.querySelectorAll(".product-category")];
  const status = document.querySelector("#filter-status");
  filters.hidden = false;
  status.hidden = false;
  const applyFilter = value => {
    let count = 0;
    for (const category of categories) {
      const cards = [...category.querySelectorAll(".product-item")];
      for (const card of cards) {
        const needs = (card.dataset.needs || category.dataset.category).split(" ");
        card.hidden = value !== "all" && !needs.includes(value);
        if (!card.hidden) count++;
      }
      category.hidden = cards.every(card => card.hidden);
    }
    for (const button of filters.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.filter === value));
    }
    status.textContent = `${count} products shown`;
  };
  filters.addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (button) applyFilter(button.dataset.filter);
  });
  applyFilter("all");
}

if (topButton) {
  const updateTopButton = () => { topButton.hidden = window.scrollY < 200; };
  window.addEventListener("scroll", updateTopButton, { passive: true });
  topButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const heading = document.querySelector("main h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
    }
  });
  updateTopButton();
}
