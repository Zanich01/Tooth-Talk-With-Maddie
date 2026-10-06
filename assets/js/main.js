"use strict";

// Text inputs can match :focus-visible after a pointer click. Track keyboard
// navigation explicitly so pointer focus stays plain on every control.
document.addEventListener("keydown", event => {
  if (event.key === "Tab") document.documentElement.dataset.keyboardNavigation = "true";
});
document.addEventListener("pointerdown", () => {
  delete document.documentElement.dataset.keyboardNavigation;
});

const embeddedChat = new URLSearchParams(window.location.search).get("embed") === "1" && window.location.pathname.endsWith("/questions.html");
if (embeddedChat) document.documentElement.classList.add("chat-embedded");

// Apply the same link behavior to page content, search results, and chat replies.
function configureSiteLink(link) {
  const url = new URL(link.href, window.location.href);
  const external = /^https?:$/.test(url.protocol) && url.origin !== window.location.origin;
  if (external) {
    link.target = "_blank";
    link.relList.add("noopener", "noreferrer");
    if (!link.querySelector(".external-link-note")) {
      const note = document.createElement("span");
      note.className = "external-link-note";
      note.textContent = " (opens in a new tab)";
      link.append(note);
    }
  } else if (/^https?:$/.test(url.protocol)) {
    if (embeddedChat) link.target = "_top";
    else link.removeAttribute("target");
  }
}
function configureLinks(root) {
  if (root.matches?.("a[href]")) configureSiteLink(root);
  root.querySelectorAll?.("a[href]").forEach(configureSiteLink);
}
configureLinks(document);
new MutationObserver(records => {
  for (const record of records) {
    if (record.type === "attributes") configureSiteLink(record.target);
    else for (const node of record.addedNodes) configureLinks(node);
  }
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });

// One launcher on each page. The Q&A page reuses its own conversation.
if (!embeddedChat) {
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "chat-launcher";
  launcher.setAttribute("aria-label", "Open dental question chat");
  launcher.setAttribute("aria-controls", "floating-chat");
  launcher.setAttribute("aria-haspopup", "dialog");
  launcher.setAttribute("aria-expanded", "false");
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 3-2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>Ask a question</span>';
  const dialog = document.createElement("dialog");
  dialog.id = "floating-chat";
  dialog.className = "floating-chat";
  dialog.setAttribute("aria-label", "Dental question chat");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "floating-chat-close";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";
  const content = document.createElement("div");
  content.className = "floating-chat-content";
  dialog.append(close, content);
  const placeCloseButton = () => {
    const newChat = content.querySelector("#new-question");
    if (!newChat) return;
    let actions = newChat.closest(".chat-header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "chat-header-actions";
      newChat.before(actions);
      actions.append(newChat);
    }
    actions.append(close);
  };
  document.body.append(launcher, dialog);
  let chatLoading;
  let placeholder;
  let conversation;
  const chatMobile = window.matchMedia("(max-width: 959px)");
  let savedPagePosition = null;
  const syncPageLock = () => {
    if (dialog.open && chatMobile.matches && !savedPagePosition) {
      savedPagePosition = { x: window.scrollX, y: window.scrollY };
      document.body.style.setProperty("--chat-page-top", `${-savedPagePosition.y}px`);
      document.documentElement.classList.add("chat-page-locked");
    } else if ((!dialog.open || !chatMobile.matches) && savedPagePosition) {
      const position = savedPagePosition;
      savedPagePosition = null;
      document.documentElement.classList.remove("chat-page-locked");
      document.body.style.removeProperty("--chat-page-top");
      window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
    }
  };
  const syncChatViewport = () => {
    syncPageLock();
    if (chatMobile.matches && window.visualViewport) {
      dialog.style.setProperty("--chat-viewport-height", `${window.visualViewport.height}px`);
      dialog.style.setProperty("--chat-viewport-top", `${window.visualViewport.offsetTop}px`);
    } else {
      dialog.style.removeProperty("--chat-viewport-height");
      dialog.style.removeProperty("--chat-viewport-top");
    }
  };
  window.visualViewport?.addEventListener("resize", syncChatViewport);
  window.visualViewport?.addEventListener("scroll", syncChatViewport);
  chatMobile.addEventListener("change", syncChatViewport);
  // Stop a swipe at a chat scroll boundary from reaching the page on iOS.
  let touchY = 0;
  dialog.addEventListener("touchstart", event => {
    if (event.touches.length === 1) touchY = event.touches[0].clientY;
  }, { passive: true });
  dialog.addEventListener("touchmove", event => {
    if (!chatMobile.matches || event.touches.length !== 1) return;
    const nextY = event.touches[0].clientY;
    const delta = nextY - touchY;
    touchY = nextY;
    const scroller = event.target.closest("textarea, .chat-messages");
    const canScroll = scroller && (
      (delta > 0 && scroller.scrollTop > 0) ||
      (delta < 0 && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1)
    );
    if (!canScroll && event.cancelable) event.preventDefault();
  }, { passive: false });
  const loading = document.createElement("p");
  loading.className = "chat-loading";
  loading.setAttribute("role", "status");
  loading.textContent = "Loading your conversation…";
  function closeChat(returnFocus = true) {
    if (dialog.contains(document.activeElement)) document.activeElement.blur();
    dialog.close();
    syncPageLock();
    launcher.setAttribute("aria-expanded", "false");
    if (conversation && placeholder) {
      dialog.prepend(close);
      placeholder.replaceWith(conversation);
      placeholder = null;
    }
    if (returnFocus) launcher.focus({ preventScroll: true });
  }
  launcher.addEventListener("click", () => {
    if (dialog.open) { closeChat(); return; }
    // Keep the composer in the top-level viewport, including on mobile.
    dialog.show();
    syncChatViewport();
    launcher.setAttribute("aria-expanded", "true");
    conversation = document.querySelector("main .chat-workspace");
    if (conversation) {
      placeholder = document.createElement("div");
      conversation.before(placeholder);
      content.append(conversation);
      placeCloseButton();
    } else if (!content.querySelector(".chat-workspace") && !chatLoading) {
      content.append(loading);
      const loadScript = src => new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => { script.remove(); reject(new Error("Chat script unavailable")); };
        document.body.append(script);
      });
      chatLoading = (async () => {
        const response = await fetch("questions.html?v=20261006-product-choice");
        if (!response.ok) throw new Error("Chat unavailable");
        const page = new DOMParser().parseFromString(await response.text(), "text/html");
        const workspace = page.querySelector(".chat-workspace");
        if (!workspace) throw new Error("Chat unavailable");
        if (!window.DentalEngine) await loadScript("assets/js/dental-engine.js?v=20261006-product-choice");
        content.append(document.importNode(workspace, true));
        placeCloseButton();
        await loadScript("assets/js/answer-finder.js?v=20261006-chat-quality");
        loading.remove();
      })().catch(() => {
        dialog.prepend(close);
        content.querySelector(".chat-workspace")?.remove();
        loading.textContent = "Chat could not load. Close and reopen it to try again.";
        chatLoading = null;
      });
    }
    close.focus({ preventScroll: true });
  });
  close.addEventListener("click", closeChat);
  document.addEventListener("click", event => {
    // Suggestions can remove themselves while handling the click. The original
    // event path still identifies that click as coming from inside the chat.
    const path = event.composedPath();
    if (dialog.open && !path.includes(dialog) && !path.includes(launcher)) closeChat(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && dialog.open) { event.preventDefault(); closeChat(); }
  });
} else {
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") window.parent.postMessage("close-dental-chat", window.location.origin);
  });
}

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
// Keep search available without JavaScript; collapse it only on enhanced mobile headers.
if (navigation && menuToggle && searchBar && results) {
  const mobileSearch = window.matchMedia("(max-width: 959px)");
  const searchToggle = document.createElement("button");
  searchToggle.type = "button";
  searchToggle.className = "search-toggle";
  searchToggle.setAttribute("aria-label", "Open search");
  searchToggle.setAttribute("aria-controls", "search-bar results");
  searchToggle.setAttribute("aria-expanded", "false");
  searchToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  menuToggle.before(searchToggle);
  const setSearch = (open, returnFocus = false) => {
    searchToggle.setAttribute("aria-expanded", String(open));
    searchToggle.setAttribute("aria-label", open ? "Close search" : "Open search");
    searchBar.hidden = mobileSearch.matches && !open;
    if (searchBar.hidden) results.hidden = true;
    if (returnFocus) searchToggle.focus();
  };
  searchToggle.addEventListener("click", () => {
    const open = searchToggle.getAttribute("aria-expanded") !== "true";
    setSearch(open);
    if (open) {
      searchBar.focus();
      if (searchBar.value.trim()) searchBar.dispatchEvent(new Event("input"));
    }
  });
  searchBar.addEventListener("keydown", event => {
    if (event.key === "Escape" && mobileSearch.matches) {
      event.preventDefault();
      setSearch(false, true);
    }
  });
  document.addEventListener("click", event => {
    if (mobileSearch.matches && !searchToggle.contains(event.target) &&
        !searchBar.contains(event.target) && !results.contains(event.target)) setSearch(false);
  });
  const syncSearch = () => {
    const returnFocus = mobileSearch.matches && document.activeElement === searchBar;
    searchToggle.hidden = !mobileSearch.matches;
    setSearch(false, returnFocus);
  };
  mobileSearch.addEventListener("change", syncSearch);
  syncSearch();
}
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
    if (!searchBar.contains(event.target) && !results.contains(event.target) && !event.target.closest(".search-toggle")) dismissSearch();
  });
  document.addEventListener("focusin", event => {
    if (!searchBar.contains(event.target) && !results.contains(event.target) && !event.target.closest(".search-toggle")) dismissSearch();
  });
}

// Disclosures close on click-away or Escape; clicks inside stay interactive.
const closeDisclosure = (detail, restoreFocus = false) => {
  detail.open = false;
  if (restoreFocus) detail.querySelector("summary").focus();
};
document.addEventListener("click", event => {
  for (const detail of document.querySelectorAll("details[open]")) {
    if (detail.open && !detail.contains(event.target)) closeDisclosure(detail);
  }
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  for (const detail of document.querySelectorAll("details[open]")) {
    if (detail.open) closeDisclosure(detail, detail.contains(document.activeElement));
  }
});

const filters = document.querySelector(".product-filters");
if (filters) {
  const categories = [...document.querySelectorAll(".product-category")];
  const categoryHeadings = new Map(categories.map(category => [category, category.querySelector("h2").textContent]));
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
      const showingCavityPrevention = value === "cavity-prevention" && category.dataset.category === "gum-care";
      category.querySelector("h2").textContent = showingCavityPrevention ? "Cavity Prevention" : categoryHeadings.get(category);
      category.querySelector(":scope > p").hidden = showingCavityPrevention;
      const cavityIntro = category.querySelector("[data-cavity-intro]");
      if (cavityIntro) cavityIntro.hidden = !showingCavityPrevention;
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

const planner = document.querySelector('.planner-groups');
if (planner) {
  const panel = document.querySelector('#selected-questions');
  const list = document.querySelector('#question-list');
  const status = document.querySelector('#planner-status');
  const update = () => {
    const chosen = [...planner.querySelectorAll('input:checked')];
    list.replaceChildren();
    for (const input of chosen) {
      const item = document.createElement('li');
      item.textContent = input.value;
      list.append(item);
    }
    panel.hidden = false;
    status.textContent = chosen.length ? `${chosen.length} questions selected. Bring this list to your dental team.` : 'Select questions above to build your list.';
    document.querySelector('#print-questions').disabled = !chosen.length;
  };
  planner.addEventListener('change', update);
  document.querySelector('#print-questions').addEventListener('click', () => window.print());
  document.querySelector('#clear-questions').addEventListener('click', () => {
    for (const input of planner.querySelectorAll('input')) input.checked = false;
    update();
  });
  update();
}
