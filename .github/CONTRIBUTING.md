# Contributing to Free Fire Catalog

Thank you for your interest in contributing! This project consists of three main parts:

- **WEBP icons** – item images
- **Database** – the item data in MessagePack format
- **WebApp** – the frontend code (HTML, CSS, JS, Service Worker)

Please read the following guidelines before submitting any changes.

---

## 1. General Guidelines

- **Be respectful** – Follow the [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
- **Open an issue first** – For significant changes or new features, please open an issue to discuss before starting work.
- **Keep it clean** – Follow the existing code style and project structure.
- **Test your changes** – Ensure the app still works after your modifications.
- **Document your changes** – Update the README if necessary.

---

## 2. Contributing Icons

### Where to place icons

All item icons are stored in the `Item-webp/` folder at the root of the repository. Each icon is named after its item ID (e.g., `101000001.webp`).

### How to add or update an icon

1. **Locate the missing or outdated icon.**
2. **Create or download a WEBP image** – ideally **218x218 px**.
3. **Name it exactly as the item ID** – e.g., `907092607.webp`.
4. **Place it in the `Item-webp/` folder**.
5. **Commit and push** – open a pull request.

> **Note:** The app uses the CDN URL `https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/Item-webp/{itemID}.webp`. After your PR is merged, the CDN cache will automatically update (may take a few minutes).

---

## 3. Contributing to the Database

### Database format

The database is a **MessagePack** file (`database.msgpack.gz`). It is a gzipped binary representation of a JSON array of items. Each item object should have at least first 3 keys listed here-

```json
{
  "itemID": 123456789,
  "name": "Item Name",
  "icon": "icon_name",
  "type": "Bundles",
  "rarity": "PURPLE",
  "tag": "OB54",
  "description": "Item description"
}
```

Additional fields are allowed.

### How to update the database

1. **Modify the source JSON** – either by editing the raw data or using your own script.
2. **Update the `updated_on` field** – the first element of the array should be an object with `updated_on` set to the current date in `YYYY-MM-DD` format (e.g., `"updated_on": "2026-08-13"`).
3. **Convert JSON to MessagePack** – using a tool like conventro.com or the msgpack CLI.
4. **Compress with GZIP** – use maximum compression to reduce file size.
5. **Replace `database.msgpack.gz`** at the root of the repository.
6. **Commit and push** – open a pull request.

> **Important:** After the PR is merged, purge the jsDelivr cache using the purge tool to ensure users get the latest version immediately.

---

## 4. Contributing to the WebApp

### Project structure

```
WebApp/
├── App/                    # Web application files
│   ├── index.html
│   ├── script.js
│   ├── sw.js
│   ├── db-worker.js
│   ├── manifest.json
│   ├── robots.txt
│   ├── sitemap.xml
│   └── icons/              # App icons (SVG, PNG)
└── Online/                 # Dynamic files loaded via CDN
    ├── whats_new.json      # Changelog for WebApp
    └── author.jpg          # Author avatar
```

### Code style

- Use modern JavaScript (ES6+).
- Follow the existing indentation and naming conventions.
- Write comments for non-obvious logic.
- Keep CSS variables in `:root` for theming.

### How to contribute changes

1. **Fork the repository.**
2. **Create a new branch** for your feature/fix.
3. **Make your changes** – test locally.
4. **Commit with a clear message.**
5. **Push to your fork.**
6. **Open a pull request** against the main branch.

### Updating WebApp version / changelog

When you change the WebApp in a way that should trigger a Service Worker update:

1. Bump the version in `sw.js`:
   ```js
   const CACHE_NAME = 'ff-catalog-app-vX.Y.Z';
   ```
2. Update `WebApp/Online/whats_new.json` – add a new entry with the version and a list of changes.
3. Purge the CDN cache for `whats_new.json` after the PR is merged.

---

## 5. Reporting Issues

- Use the GitHub Issues tab.
- Provide a clear description and steps to reproduce.
- Include screenshots if applicable.
- Label the issue appropriately (`bug`, `enhancement`, `help wanted`, etc.).

---

## 6. Pull Request Process

1. Ensure your changes are self-contained and do not break existing functionality.
2. Update documentation if you change configurable behavior.
3. Wait for review – maintainer(s) will provide feedback.
4. Once approved, your PR will be merged.

Thank you for helping make Free Fire Catalog better! 🚀
