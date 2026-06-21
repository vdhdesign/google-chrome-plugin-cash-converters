const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CONCURRENT = 6;
const memoryCache = new Map();

function parseBuyNowPrice(html) {
  const jsMatch = html.match(/buyNowPriceForJS\s*=\s*"([\d.]+)"/);
  if (jsMatch?.[1]) {
    return jsMatch[1];
  }

  const domMatch = html.match(
    /class="awe-rt-BuyNowPrice"[^>]*>\s*\$\s*<span class="NumberPart">([\d.]+)<\/span>/
  );
  if (domMatch?.[1]) {
    return domMatch[1];
  }

  return null;
}

async function getCachedPrice(listingId) {
  const memoryEntry = memoryCache.get(listingId);
  if (memoryEntry && Date.now() - memoryEntry.fetchedAt < CACHE_TTL_MS) {
    return memoryEntry.price;
  }

  const key = `buyNow:${listingId}`;
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    memoryCache.set(listingId, entry);
    return entry.price;
  }

  return undefined;
}

async function setCachedPrice(listingId, price) {
  const entry = { price, fetchedAt: Date.now() };
  memoryCache.set(listingId, entry);
  await chrome.storage.local.set({ [`buyNow:${listingId}`]: entry });
}

async function fetchBuyNowPrice(url) {
  const response = await fetch(url, {
    credentials: "omit",
    headers: {
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseBuyNowPrice(html);
}

async function fetchWithConcurrency(items, limit) {
  const results = {};
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;

      try {
        const cached = await getCachedPrice(current.listingId);
        if (cached !== undefined) {
          results[current.listingId] = cached;
          continue;
        }

        const price = await fetchBuyNowPrice(current.url);
        await setCachedPrice(current.listingId, price);
        results[current.listingId] = price;
      } catch {
        results[current.listingId] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "FETCH_BUY_NOW_PRICES") {
    return false;
  }

  fetchWithConcurrency(message.items, MAX_CONCURRENT)
    .then((prices) => sendResponse({ prices }))
    .catch(() => sendResponse({ prices: {} }));

  return true;
});
