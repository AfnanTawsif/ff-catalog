// Load MessagePack library from CDN
importScripts('https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.0.0-beta2/dist.es5+umd/msgpack.min.js');

self.addEventListener('message', async (e) => {
    const { type, rawData } = e.data;
    if (type === 'parse') {
        try {
            // rawData is a Uint8Array already fetched by the main thread
            self.postMessage({ type: 'progress', stage: 'parsing' });
            const decoded = self.MessagePack.decode(rawData);
            let items = [];
            let updatedOn = "Unknown";

            if (Array.isArray(decoded)) {
                if (decoded.length > 0 &&
                    typeof decoded[0] === 'object' &&
                    decoded[0] !== null &&
                    (decoded[0].updated_on || decoded[0].version || decoded[0]._metadata)) {
                    updatedOn = decoded[0].updated_on || decoded[0].version || "Unknown";
                    items = decoded.slice(1);
                } else {
                    items = decoded;
                }
            } else if (typeof decoded === 'object' && decoded !== null) {
                items = decoded.items || decoded.data || [];
                updatedOn = decoded.updated_on || "Unknown";
            } else {
                items = [];
            }

            self.postMessage({
                type: 'success',
                rawData,
                items,
                updatedOn
            });
        } catch (err) {
            self.postMessage({
                type: 'error',
                message: err.message
            });
        }
    }
});