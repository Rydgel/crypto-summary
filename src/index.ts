import { Router, Request } from 'itty-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ApiResponse {
    data: ApiData[];
}

interface ApiData {
    name: string;
    symbol: number;
    price?: number;
    market_cap?: number;
    percent_change_24h?: number;
    volume_24h?: number;
}

const router = Router();

router.get('/summary/:ticker', async (request: Request, event: FetchEvent) => {
    const cacheKey = request.url;
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
        const ticker = request?.params?.ticker.toUpperCase();
        const url = `https://api.lunarcrush.com/v2?data=assets&symbol=${ticker}&data_point=1&interval=day&key=hwmxqk8qcjf7ygckyu0cb37xwh07rr`;
        const api_response = await fetch(url);
        const summary = await create_summary(api_response);

        response = new Response(summary);
        response.headers.append("Cache-Control", "s-maxage=3600");
        event.waitUntil(cache.put(cacheKey, response.clone()));
    }
    
    return response;
});

router.all('*', () => new Response('404, not found!', { status: 404 }));

async function create_summary(response: Response): Promise<string> {
    const resp = await response.json<ApiResponse>();
    const data = resp?.data[0];
    const date = format(new Date(), "d LLLL yyy", { locale: fr });
    const name = data.name;
    const symbol = data.symbol;
    const price = data.price?.toFixed(2) ?? 0.00;
    const price_change = data.percent_change_24h?.toFixed(2) ?? 0.00;
    const delta = price_change > 0 ? "augmentation" : "baisse";
    const volume = data.volume_24h?.toFixed(0) ?? 0.00;
    const market_cap = data.market_cap?.toFixed(0) ?? 0.00;

    return `Aujourd'hui, le ${date}, le cours du ${name} (${symbol}) est à ${price} USD, soit une ${delta} de ${price_change}% sur 24h. La crypto monnaie ${symbol} a un volume échangé de ${volume} $ sur 24h, avec un market cap de ${market_cap} $.`;
}

addEventListener('fetch', (e) => {
    e.respondWith(router.handle(e.request, e));
});
