# Cash Converters Buy Now Price

A Chrome extension that shows buy-now prices on [Cash Converters New Zealand](https://shop.cashconverters.co.nz) listing pages.

Cash Converters listing pages show the current auction price, but buy-now prices are only visible on individual item pages. This extension fetches those prices and displays them inline on search and category results, so you can compare items without opening every listing.

This project is not affiliated with or endorsed by Cash Converters.

## Features

- **Buy Now prices on listing pages** — shows the buy-now price next to each item's current price
- **Unavailable state** — clearly marks items that do not have buy-now available
- **Buy now only filter** — optionally grey out listings without a buy-now price
- **Lazy loading** — prices are fetched as listings scroll into view, with a short cache to reduce repeated requests

## Install (development)

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this project folder.

The extension only runs on `https://shop.cashconverters.co.nz/*`.

## Usage

1. Browse listings on [shop.cashconverters.co.nz](https://shop.cashconverters.co.nz).
2. Buy-now prices appear next to each item's current price as listings load.
3. Click the extension icon to open settings.
4. Enable **Items with buy now only** to grey out listings without a buy-now price.

## How it works

- A content script scans listing pages for item sections and observes them as they enter the viewport.
- The background service worker fetches each item's public detail page from Cash Converters and extracts the buy-now price.
- Prices and your filter preference are cached locally in Chrome storage. Buy-now prices expire after ten minutes. Nothing is sent to external servers.

## Privacy

See [PRIVACY.md](PRIVACY.md) for details on what data the extension handles.

## Project structure

```
├── manifest.json    Extension manifest (Manifest V3)
├── background.js    Fetches and caches buy-now prices
├── content.js       Injects prices and filter on listing pages
├── popup.html/js    Extension popup settings
├── styles.css       In-page price and filter styles
└── icons/           Extension icons
```

## License

No license specified. All rights reserved unless otherwise noted.
