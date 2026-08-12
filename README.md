# 🎮 Free Fire Item Icons & Database  

Get **Free Fire item icons and database**  

---

## 🚀 API Endpoint  

Use the following URL format to get icons:  
`https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-inventory@main/PNG/{item_ID}.png`  
Replace **`{item_ID}`** with the actual Free Fire item ID.  

---

### 📥 Response Example
![Free Fire Item Icon](https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-inventory@main/PNG/907092607.png)

### ⚠️ Database Info
The database is from this project:
https://ff-item.netlify.app/data.msgpack.gz

N.B. MSGPACK (best for speed) can be converted to JSON for readability. Our webview already features loaded database to json conversion in settings menu's download database option. 

After editing data.json, convert it to data.msgpack using such tools online: https://conventro.com/convert/json-to-msgpack

Before pushing data.msgpack to github, make sure to compress it to database.msgpack.gz with max compression for loading speed.
