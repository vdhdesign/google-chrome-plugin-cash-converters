const PROCESSED_ATTR = "data-cc-buy-now-processed";
const BUY_NOW_AVAILABLE_ATTR = "data-cc-buy-now-available";
const SETTINGS_KEY = "buyNowOnlyEnabled";
const PREFETCH_MARGIN = "600px 0px";
const FLUSH_DELAY_MS = 50;
const SCAN_DEBOUNCE_MS = 100;

const pendingQueue = new Map();
let flushTimer = null;
let scanTimer = null;
let buyNowOnlyEnabled = false;

function findDetailUrl(section, listingId) {
  const productLink = section.querySelector(
    `.img-container a[href*="/Listing/Details/${listingId}/"], h1.title a[href*="/Listing/Details/${listingId}/"]`
  );
  if (productLink) {
    return productLink.href;
  }

  const fallback = section.querySelector(
    `a[href*="/Listing/Details/${listingId}/"]:not(.btn)`
  );
  return fallback?.href ?? null;
}

function getListingFromSection(section) {
  const listingId = section.getAttribute("data-listingid");
  const priceEl = section.querySelector(".awe-rt-CurrentPrice");
  const url = findDetailUrl(section, listingId);

  if (!listingId || !priceEl || !url) {
    return null;
  }

  return { section, listingId, priceEl, url };
}

function isBuyNowAvailable(price) {
  if (price == null || price === "") {
    return false;
  }

  return parseFloat(price) > 0;
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  buyNowOnlyEnabled = stored[SETTINGS_KEY] ?? false;
}

function applyBuyNowOnlyFilter(section, available) {
  if (buyNowOnlyEnabled && !available) {
    section.classList.add("cc-no-buy-now");
  } else {
    section.classList.remove("cc-no-buy-now");
  }
}

function refreshBuyNowOnlyFilter() {
  for (const section of document.querySelectorAll("[data-listingid]")) {
    const available = section.getAttribute(BUY_NOW_AVAILABLE_ATTR);
    if (available == null) {
      section.classList.remove("cc-no-buy-now");
      continue;
    }

    applyBuyNowOnlyFilter(section, available === "true");
  }
}

function renderBuyNowStatus(section, priceEl, price) {
  if (priceEl.previousElementSibling?.classList.contains("cc-buy-now-price")) {
    return;
  }

  const available = isBuyNowAvailable(price);
  const buyNowEl = document.createElement("span");
  buyNowEl.className = "cc-buy-now-price";

  if (available) {
    buyNowEl.textContent = `$${price} Buy Now`;
  } else {
    buyNowEl.classList.add("cc-buy-now-unavailable");
    buyNowEl.textContent = "Buy Now Not Available";
  }

  priceEl.parentNode.insertBefore(buyNowEl, priceEl);
  section.setAttribute(BUY_NOW_AVAILABLE_ATTR, available ? "true" : "false");
  applyBuyNowOnlyFilter(section, available);
}

function renderLoading(priceEl) {
  if (priceEl.previousElementSibling?.classList.contains("cc-buy-now-price")) {
    return;
  }

  const loadingEl = document.createElement("span");
  loadingEl.className = "cc-buy-now-price cc-buy-now-loading";
  loadingEl.textContent = "Loading Buy Now…";
  priceEl.parentNode.insertBefore(loadingEl, priceEl);
}

function clearLoading(priceEl) {
  const previous = priceEl.previousElementSibling;
  if (previous?.classList.contains("cc-buy-now-loading")) {
    previous.remove();
  }
}

async function processListings(listings) {
  if (listings.length === 0) {
    return;
  }

  for (const listing of listings) {
    renderLoading(listing.priceEl);
  }

  const items = listings.map(({ listingId, url }) => ({ listingId, url }));

  let prices = {};
  try {
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_BUY_NOW_PRICES",
      items,
    });
    prices = response?.prices ?? {};
  } catch {
    prices = {};
  }

  for (const listing of listings) {
    clearLoading(listing.priceEl);

    const price = prices[listing.listingId] ?? null;
    renderBuyNowStatus(listing.section, listing.priceEl, price);

    listing.section.setAttribute(PROCESSED_ATTR, "done");
  }
}

function scheduleFlush() {
  if (flushTimer) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    const listings = [...pendingQueue.values()];
    pendingQueue.clear();
    void processListings(listings);
  }, FLUSH_DELAY_MS);
}

function queueListing(listing) {
  if (pendingQueue.has(listing.listingId)) {
    return;
  }

  listing.section.setAttribute(PROCESSED_ATTR, "pending");
  pendingQueue.set(listing.listingId, listing);
  scheduleFlush();
}

const intersectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      intersectionObserver.unobserve(entry.target);

      const listing = getListingFromSection(entry.target);
      if (!listing) {
        continue;
      }

      queueListing(listing);
    }
  },
  {
    root: null,
    rootMargin: PREFETCH_MARGIN,
    threshold: 0,
  }
);

function observeSection(section) {
  if (section.hasAttribute(PROCESSED_ATTR)) {
    return;
  }

  if (!getListingFromSection(section)) {
    return;
  }

  intersectionObserver.observe(section);
}

function scanForListings() {
  for (const section of document.querySelectorAll("[data-listingid]")) {
    observeSection(section);
  }
}

function scheduleScan() {
  if (scanTimer) {
    return;
  }

  scanTimer = setTimeout(() => {
    scanTimer = null;
    scanForListings();
  }, SCAN_DEBOUNCE_MS);
}

void loadSettings().then(() => {
  scanForListings();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY]) {
    return;
  }

  buyNowOnlyEnabled = changes[SETTINGS_KEY].newValue ?? false;
  refreshBuyNowOnlyFilter();
});

const mutationObserver = new MutationObserver(() => {
  scheduleScan();
});

mutationObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
