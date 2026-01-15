const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class StockScraper {
    constructor() {
        this.cache = {
            adobe: { data: null, timestamp: 0 },
            shutterstock: { data: null, timestamp: 0 },
            envato: { data: null, timestamp: 0 }
        };
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async getAdobeStockTrends() {
        if (this._isCached('adobe')) return this.cache.adobe.data;

        // ADOBE STOCK FOCUS - 20 categories with 25 items each = ~500 Adobe items
        const categories = [
            'technology', 'business', 'nature', 'abstract', 'lifestyle',
            'food', 'travel', 'health', 'education', 'sports',
            'music', 'fashion', 'architecture', 'animals', 'holidays',
            'science', 'art', 'people', 'backgrounds', 'textures'
        ];
        let allItems = [];

        try {
            const promises = categories.map(async (cat) => {
                const url = `https://stock.adobe.com/search?k=${cat}&order=relevance&safe_search=1&limit=30`;
                try {
                    const response = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept-Language': 'en-US,en;q=0.9'
                        }
                    });
                    const html = await response.text();

                    const imgRegex = /<img[^>]+src="([^">]+)"[^>]+alt="([^">]+)"/g;
                    let match;
                    const items = [];
                    const seen = new Set();
                    let count = 0;

                    // INCREASED to 25 items per category for Adobe Stock focus
                    while ((match = imgRegex.exec(html)) !== null && count < 25) {
                        const src = match[1];
                        const alt = match[2];

                        if (!src.includes('ft.com') && !src.includes('adobe')) continue;
                        if (alt.length < 5 || alt.includes("Adobe")) continue;
                        if (seen.has(src)) continue;

                        seen.add(src);
                        items.push({
                            title: alt.replace(/stock photo/gi, '').trim(),
                            image: src,
                            source: 'Adobe Stock',
                            category: cat.charAt(0).toUpperCase() + cat.slice(1),
                            url: url,
                            description: `${cat} stock image from Adobe Stock`
                        });
                        count++;
                    }
                    return items;
                } catch (e) {
                    console.error(`Adobe category ${cat} failed`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            allItems = results.flat();
            console.log(`[Adobe] Fetched ${allItems.length} items from ${categories.length} categories`);

            this._setCache('adobe', allItems);
            return allItems;
        } catch (error) {
            console.error('Adobe Stock Scrape Error:', error);
            return [];
        }
    }

    async getUnsplashTrends() {
        if (this._isCached('shutterstock')) return this.cache.shutterstock.data;

        try {
            // REDUCED Unsplash to 8 focused topics with 10 items each = ~80 items
            const topics = [
                'current-events', 'wallpapers', '3d-renders', 'textures-patterns',
                'nature', 'business-work', 'arts-culture', 'travel'
            ];

            const promises = topics.map(async (topic) => {
                // REDUCED to 10 items per topic
                const url = `https://unsplash.com/napi/topics/${topic}/photos?page=1&per_page=10`;
                try {
                    const response = await fetch(url);
                    const data = await response.json();

                    return data.map(photo => ({
                        title: photo.description || photo.alt_description || 'Trending Visual',
                        image: photo.urls.small,
                        source: 'Unsplash Market',
                        category: topic.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                        url: photo.links.html,
                        description: photo.description || photo.alt_description || `${topic} image from Unsplash`,
                        tags: photo.tags?.map(t => t.title).join(', ') || ''
                    }));
                } catch (e) {
                    console.error(`Unsplash topic ${topic} failed`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            const items = results.flat();
            console.log(`[Unsplash] Fetched ${items.length} items from ${topics.length} topics`);

            this._setCache('shutterstock', items);
            return items;
        } catch (e) {
            console.error("Unsplash scrape error:", e);
            return [];
        }
    }

    async getEnvatoTrends() {
        if (this._isCached('envato')) return this.cache.envato.data;

        try {
            const url = 'https://elements.envato.com/photos/popular';
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const html = await response.text();

            const items = [];
            const imgRegex = /<img[^>]+src="([^"]+envatousercontent[^"]+)"[^>]+alt="([^"]+)"/g;
            let match;
            let count = 0;
            const seen = new Set();

            // REDUCED to 20 items for balanced contribution
            while ((match = imgRegex.exec(html)) !== null && count < 20) {
                const src = match[1];
                const alt = match[2];

                if (seen.has(src)) continue;
                seen.add(src);

                items.push({
                    title: alt || 'Envato Trending Asset',
                    image: src,
                    source: 'Envato Elements',
                    category: 'Popular',
                    url: url,
                    description: `Popular asset: ${alt || 'Trending visual from Envato'}`
                });
                count++;
            }

            console.log(`[Envato] Fetched ${items.length} items`);
            this._setCache('envato', items);
            return items;
        } catch (e) {
            console.error("Envato scrape error:", e);
            return [];
        }
    }

    async getCombinedTrends() {
        // Fetch from all sources in parallel
        const [adobe, unsplash, envato] = await Promise.all([
            this.getAdobeStockTrends(),
            this.getUnsplashTrends(),
            this.getEnvatoTrends()
        ]);

        // Combine with Adobe Stock prioritized (appears first more often due to higher count)
        const combined = [...adobe, ...unsplash, ...envato];
        console.log(`[StockScraper] Total: ${combined.length} items (Adobe: ${adobe.length}, Unsplash: ${unsplash.length}, Envato: ${envato.length})`);
        console.log(`[StockScraper] Ratio - Adobe: ${Math.round(adobe.length / combined.length * 100)}%, Unsplash: ${Math.round(unsplash.length / combined.length * 100)}%, Envato: ${Math.round(envato.length / combined.length * 100)}%`);
        return this._shuffle(combined);
    }

    _isCached(key) {
        const cached = this.cache[key];
        if (!cached.data) return false;
        const age = Date.now() - cached.timestamp;
        return age < this.cacheDuration;
    }

    _setCache(key, data) {
        this.cache[key] = {
            data: data,
            timestamp: Date.now()
        };
    }

    _shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

module.exports = new StockScraper();
