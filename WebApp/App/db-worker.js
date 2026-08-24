// Load MessagePack library from CDN
importScripts('https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.0.0-beta2/dist.es5+umd/msgpack.min.js');

self.addEventListener('message', async (e) => {
    const { type, url, nocache } = e.data;
    if (type === 'load') {
        try {
            // 1. Fetching
            self.postMessage({ type: 'progress', stage: 'fetching' });
            const fetchUrl = url + (nocache ? '?nocache=' + Date.now() : '');
            const response = await fetch(fetchUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // 2. Decompressing
            self.postMessage({ type: 'progress', stage: 'decompressing' });
            const ds = new DecompressionStream('gzip');
            const decompressed = response.body.pipeThrough(ds);
            const arrayBuffer = await new Response(decompressed).arrayBuffer();
            const rawData = new Uint8Array(arrayBuffer);

            // 3. Parsing MessagePack
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
