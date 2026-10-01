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
    if (!navigation.contains(event.target)) setMenu(false);
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
let productsPromise;

function loadProducts() {
  if (!productsPromise) {
    productsPromise = fetch("data/products.json")
      .then(response => {
        if (!response.ok) throw new Error("Product data unavailable");
        return response.json();
      })
      .catch(error => {
        productsPromise = undefined;
        throw error;
      });
  }
  return productsPromise;
}

function productLink(product) {
  const link = document.createElement("a");
  link.href = product.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

let searchVersion = 0;
async function searchProducts() {
  const version = ++searchVersion;
  const query = searchBar.value.trim().toLowerCase();
  results.replaceChildren();
  results.hidden = !query;
  if (!query) return;
  results.textContent = "Loading products…";

  try {
    const products = await loadProducts();
    // Ignore old requests after typing, clearing, or dismissing the search.
    if (version !== searchVersion) return;
    const matches = products.filter(product =>
      `${product.name} ${product.category}`.toLowerCase().includes(query)
    );
    results.replaceChildren();
    const summary = document.createElement("p");
    summary.textContent = matches.length
      ? `${matches.length} product${matches.length === 1 ? "" : "s"} found`
      : "No products found. Try a product name, gum disease, dry mouth, bad breath, or whitening.";
    results.append(summary);
    for (const product of matches) {
      const card = document.createElement("article");
      card.className = "product";
      const imageLink = productLink(product);
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      imageLink.append(image);
      const info = document.createElement("div");
      info.className = "product-info";
      const name = productLink(product);
      name.textContent = product.name;
      const category = document.createElement("p");
      category.textContent = product.category;
      info.append(name, category);
      card.append(imageLink, info);
      results.append(card);
    }
  } catch {
    if (version === searchVersion) {
      results.textContent = "Products could not be loaded. Try searching again, or visit Product Recommendations.";
    }
  }
}

function dismissSearch() {
  searchVersion++;
  results.hidden = true;
}

if (searchBar && results) {
  searchBar.addEventListener("input", searchProducts);
  searchBar.addEventListener("focus", searchProducts);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (results.contains(document.activeElement)) searchBar.focus();
      dismissSearch();
    }
  });
  document.addEventListener("click", event => {
    if (!searchBar.contains(event.target) && !results.contains(event.target)) dismissSearch();
  });
}

if (topButton) {
  const updateTopButton = () => { topButton.hidden = window.scrollY < 200; };
  window.addEventListener("scroll", updateTopButton, { passive: true });
  topButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector(".skip-link")?.focus({ preventScroll: true });
  });
  updateTopButton();
}
