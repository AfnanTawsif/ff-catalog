![Netlify](https://img.shields.io/badge/dynamic/regex?url=https://raw.githubusercontent.com/AfnanTawsif/ff-catalog/main/WebApp/App/sw.js&search=const%20CACHE_NAME%20%3D%20'ff-catalog-app-(v%5Cd%2B%5C.%5Cd%2B%5C.%5Cd%2B)'&replace=%241&label=Netlify&color=blue&logo=netlify&logoColor=white)
[![Database](https://img.shields.io/badge/Database-2026--08--24-2e7d32?logo=databricks&logoColor=white)](https://github.com/AfnanTawsif/ff-catalog/blob/main/database.msgpack.gz)
[![GitHub Stars](https://img.shields.io/github/stars/AfnanTawsif/ff-catalog?style=social)](https://github.com/AfnanTawsif/ff-catalog)

## 🎮 Free Fire Catalog
![Free Fire Catalog Banner](./WebApp/App/icons/banner.jpg)

**A fast, feature-rich Free Fire item catalog for searching, filtering, and browsing thousands of items with offline capability.**

🔗 **Live Website:** [https://ff-catalog.netlify.app/](https://ff-catalog.netlify.app/)  

📲 **Tip:** For the best experience, tap **⋮ → Install app** in your browser.

---

## 📊 Current Database Status

| **Database Version** | **Total Items** |
|----------------------|-----------------|
|     2026-08-24       |      33456      |

The app checks for a new database every 24 hours, and you can force a sync anytime using the **Sync** button from **Settings -> App**

---

## 🚀 WebApp Overview

**🏎️ Blazing Performance**
  - 'Reduce visual effects' option for best performance on weak devices.
  - Uses WEBP instead of PNG for faster loads.
  - Uses msgpack instead of json for maximum reading speed.
  - Lazy-loads images & animations only for items on current page.
  - Uses a **Web Worker** to parse the MessagePack database off the main thread – no UI jank.
  - Decompression (`DecompressionStream`) is hardware-accelerated in modern browsers.

**💾 Smart Storage & Caching**
  - Icon images are cached in the browser's Cache API (to save client bandwidth upon revisit) and **automatically cleaned** when the storage limit (configurable) is exceeded.
  - The entire app (HTML, JS, CSS, SW) is cached by the Service Worker, enabling **offline access** (except new updates sync).
  - Database is stored in IndexedDB for fast subsequent loads.

**📡 Bandwidth & Server-Cost Friendly**
  - All static assets (icons, database) are served via **jsDelivr CDN**, leveraging global edge caching.
  - The app itself is hosted on Netlify, but because almost everything runs on the client, your Netlify credits are barely consumed.
  - Service Worker updates pull new versions only when `sw.js` changes – no unnecessary network requests.

**🎨 Beautiful & Responsive UI**
  - Glass-morphism design with animated gradients. (can be turned off in settings)
  - Fully responsive – works on phones, tablets, and desktops.
  - Dark theme to reduce eye strain.

**⌨️ Shortcuts**
  - Swipe left/right or press left/right arrow for page navigation.
  - Alt+S to trigger 'jump to page' (search) box on pagination bar.

**⭐ Favorites System**
  - Star any item to add it to your personal favorites list.
  - Import/export favorites as JSON – share your collection.
  - Toggle **Favorites only** view to focus on your curated list.

**🔍 Advanced Search & Filters**
  - Search by name, ID, description, or icon filename.
  - Filter by type, rarity, and in-game version tag (OBXX).
  - Multi-page layout with pagination bar as overlay for fast navigation.

**⚙️ Rich Settings**
  - Customize search scope, click action, download naming, icon storage limit, and more.
  - Analyze database statistics, duplicated items, missing filters, and missing icons.
  - One-click update check and version changelog.

**📱 PWA & Shareable**
  - Installable as a Progressive Web App on mobile devices.
  - Each item has a unique URL (`?item=ID`) – share any item directly.
    
**🧑‍💻 Support for Users**
  - Comprehensive tutorial for new users.
  - Technical support via socials.

**🛠️ Developer Friendly**
  - Exposed API for fetching item icons (see below).
  - Source code is clean, well-commented, and easy to fork.
  - All configuration is centralized in `script.js` – no need to hunt through the code.

---

## 🖼️ Icon API – Use in Your Own Projects

You can directly embed any Free Fire item icon using the following URL pattern:

```text
https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/Item-webp/{itemID}.webp
```

Replace `{itemID}` with the numeric item ID (e.g., `907092607`).

**Example:**

![Example Icon](https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/Item-webp/907092607.webp)

`https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/Item-webp/907092607.webp`

All images are served with optimal caching headers via jsDelivr.

---

## 📦 Database & WEBP Source

The database and icons are maintained separately from the WebApp code.

**Database**:
  [`https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/database.msgpack.gz`](https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/database.msgpack.gz)
  - Original source: [SOURCES.md](./SOURCES.md)

**WEBP Icons:**
  [`https://github.com/AfnanTawsif/ff-catalog/tree/main/Item-webp`](https://github.com/AfnanTawsif/ff-catalog/tree/main/Item-webp)
  - Original source: [SOURCES.md](./SOURCES.md)

The database and icons are **updated regularly** – either when new items are added in the source repository or when I manually curate missing assets.

---

## 🛠️ Development – Customize Your Own Version

Want to run your own instance or contribute? Here’s everything you need:

### 1. Fork the Repository

Start by forking [https://github.com/AfnanTawsif/ff-catalog](https://github.com/AfnanTawsif/ff-catalog) and cloning it locally.

### 2. License & Open Source Requirement

**This project is licensed under the GNU General Public License v3.0 (GPLv3).**

If you create a modified version or derivative work of this project (including forked versions, custom deployments, or any public instance based on this codebase), you **must**:

- Release your modified source code publicly under the same GPLv3 license.
- Provide a copy of the GPLv3 license with your distribution.
- Clearly state the changes you made from the original project.
- Make the source code accessible to all users of your modified version.

For full license details, see the [`LICENSE`](./LICENSE) file in the repository root.

### 3. Project Structure

```text
ff-catalog/
├── WebApp/
│   ├── App/                         # Web application files
│   │   ├── index.html
│   │   ├── script.js
│   │   ├── sw.js
│   │   ├── db-worker.js
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── icons/                   # App icons (SVG, PNG, WEBP)
│   └── Online/                      # Dynamic files loaded via CDN
│       ├── whats_new.json           # Changelog for WebApp
│       ├── hayato.webp              # hayato flash image for tutorial
│       ├── tutorial.md              # Loads in tutorial menu
│       ├── tutorial<number>.webp    # Images used inside tutorial.md
│       └── author.jpg               # Author avatar
├── Item-webp/                       # All item icons (WEBP, named by item ID)
├── database.msgpack.gz               # Compressed database
├── README.md                         # This file
├── SOURCES.md                        # Sources & Credits for database & icons
└── LICENSE                           # MIT License
```

### 4. Configuration – `script.js`

All external URLs and author info are centralized in the `CONFIG` object at the top of `script.js`.

Example:

```js
const CONFIG = {
    WEBSITE_URL: '',                       // Your live site URL
    CDN_BASE_URL: '.../Item-webp/',              // Base for item icons
    DATABASE_URL: '.../database.msgpack.gz',
    FALLBACK_IMAGE_URL: 'icons/error.svg',
    GITHUB_REPO_URL: '...',                // Your repo URL
    GITHUB_API_TREE_URL: '.../git/trees/main?recursive=1',
    WHATS_NEW_URL: '.../whats_new.json',
    AUTHOR_IMAGE_URL: '.../author.jpg',
    CONTACT: { ... }
};
```

Update these to point to your own fork and CDN endpoints.

### 5. Updating Icons

Place new item icon WEBPs in the `Item-webp/` folder, named with the item ID (e.g., `123456789.webp`).

If you need to generate app icons for the WebApp (PWA), use [maskable.app](https://maskable.app/) to create `icon-192.png`, `icon-512.png`, etc., and place them in `WebApp/App/icons/`.

### 6. Updating the Database

The database is in MessagePack format (`.msgpack`) for max speed, then gzipped (`.gz`) for faster downloads.

To update: edit the JSON source (you can generate a json version of the database from `settings > app` inside the webapp), add new entries, modify updated_on value, convert the final json to `.msgpack` using tools like [conventro.com](https://conventro.com/convert/json-to-msgpack), then compress with maximum GZIP.

Example of json format:
```json
[
  {
    "updated_on": "2026-07-14"
  },
  {
    "icon": "Icon_face_female01_head",
    "itemID": 101000001,
    "name": "Nulla",
    "description": "Nobody knows how she got onto Bermuda, except that she was here before everyone else. Extremely good at adapting to the environment, she is like a chameleon that survives and thrives.",
    "rarity": "NONE",
    "type": "Characters"
  },
  {
    "icon": "Icon_OptionalBundle_default",
    "itemID": 170030004,
    "name": "Choice Loot Crate",
    "description": "Choose wisely",
    "tag": "OB30",
    "rarity": "BLUE",
    "type": "Choice Crates"
  },
]
```

**Important:** After updating `database.msgpack.gz`, purge the jsDelivr cache to make sure users get the latest update immediately.  To purge your cdn link, visit: 

 [jsDelivr purging tool](https://www.jsdelivr.com/tools/purge)

### 7. Updating WebApp Version / Changelog

Bump the version in `sw.js`:

```js
const CACHE_NAME = 'ff-catalog-app-vX.Y.Z';
```

This triggers the Service Worker update and notifies users. Otherwise users will be stuck at old cached version of the WebApp.

Update `WebApp/Online/whats_new.json` with the new version and changes.

Then purge the jsDelivr cache for `whats_new.json`.

### 8. Updating Author Image

Replace `WebApp/Online/author.jpg` with your own picture.

Purge the CDN cache after updating. Note that author image is cached for 24 hours (just like database) to save bandwidth.

### 11. Updating Tutorial

Update `WebApp/Online/tutorial.md` and purge the cache.

Note that tutorial.md tries to load from online first (just like `what's_new json`) then falls back to cache. But images used inside tutorial.md use cache first loading and cdn is kept as fallback. So if you want to update the images inside it, you must use new names to make sure all browsers load the fresh image from online. 

### 10. Deploy

Commit and push to your repository.

If using Netlify, connect your repo and set the publish directory to `WebApp/App`.

The app will be live at your Netlify URL.

### 11. Auto-Update Behavior

The WebApp checks for a new Service Worker version on every page reload. If a new `sw.js` is detected, it updates in the background and shows the changelog.

The database is re-fetched every 24 hours (or forced via the **Sync** button) to ensure you always have the latest items.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are always welcome!

Whether you want to add missing item icons, update the database, or enhance the WebApp, please read our **[Contributing Guidelines](.github/CONTRIBUTING.md)** before submitting a Pull Request.

Special thanks to all contributors who help keep this catalog updated!

---

## ❤️ Credits

- **Database & icons:** Projects inside [SOURCES.md](./SOURCES.md)
- **Built with:** ☕ pure caffeine and late-night commits.


If you find this useful, don’t forget to ⭐ star the repository.
