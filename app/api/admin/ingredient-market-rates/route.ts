import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';

const DEFAULT_RESOURCE_ID =
  '9ef84268-d588-465a-a308-a864a43d0070';

const MARKET_PRIORITY = [
  'Silvassa',
  'Vapi',
  'Valsad',
  'Navsari',
  'Surat',
];

const SUPPLIER_CATEGORIES = new Set([
  'Dairy',
  'Oils & Fats',
  'Sauces & Condiments',
  'Bakery & Packaged',
  'Beverages',
]);

const COMMODITY_ALIASES: Record<string, string[]> = {
  onion: ['onion'],
  tomato: ['tomato'],
  potato: ['potato'],
  capsicum: ['capsicum'],
  cauliflower: ['cauliflower'],
  cabbage: ['cabbage'],
  carrot: ['carrot'],
  beetroot: ['beetroot'],
  cucumber: ['cucumbar', 'cucumber'],
  lemon: ['lemon'],
  garlic: ['garlic'],
  ginger: ['ginger'],
  'green chilli': ['green chilli'],
  coriander: ['coriander leaves', 'coriander'],
  banana: ['banana'],
  apple: ['apple'],
  orange: ['orange'],
  mango: ['mango'],
  pineapple: ['pineapple'],
  watermelon: ['water melon', 'watermelon'],
  pomegranate: ['pomegranate'],
  rice: ['rice'],
  wheat: ['wheat'],
  maize: ['maize'],
  bajra: ['bajra pearl millet'],
  'toor dal': ['arhar dal tur dal', 'arhar tur red gram'],
  'moong dal': ['green gram dal moong dal', 'green gram moong'],
  'urad dal': ['black gram dal urd dal', 'black gram urad'],
  'chana dal': ['bengal gram dal chana dal'],
  'masoor dal': ['lentil masur'],
  cumin: ['cummin seed jeera', 'cumin seed'],
  coriander_seed: ['coriander seed'],
  turmeric: ['turmeric'],
  groundnut: ['ground nut seed', 'groundnut'],
};

type SubmittedRate = {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
};

type MarketRecord = {
  commodity: string;
  market: string;
  arrivalDate: string;
  modalPrice: number;
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json(
      { error: 'Admin login required' },
      { status: 401 },
    );
  }

  return null;
}

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseDate(value: string) {
  const parts = value.split(/[/-]/).map(Number);

  if (parts.length !== 3) return 0;

  if (String(parts[0]).length === 4) {
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  return Date.UTC(parts[2], parts[1] - 1, parts[0]);
}

function todayInIndia() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function displayToday() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function readRecords(value: unknown): MarketRecord[] {
  if (!value || typeof value !== 'object') return [];

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.records)) return [];

  return payload.records.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    const row = value as Record<string, unknown>;
    const commodity = String(row.commodity || '').trim();
    const market = String(row.market || '').trim();
    const arrivalDate = String(
      row.arrival_date || row.arrivalDate || '',
    ).trim();
    const modalPrice = Number(
      row.modal_price || row.modalPrice,
    );

    if (!commodity || !market || !(modalPrice > 0)) return [];

    return [{
      commodity,
      market,
      arrivalDate,
      modalPrice,
    }];
  });
}

async function fetchMarket(
  market: string,
  apiKey: string,
  resourceId: string,
) {
  const params = new URLSearchParams({
    'api-key': apiKey,
    format: 'json',
    limit: '1000',
    offset: '0',
  });

  params.set('filters[market]', market);

  const response = await fetch(
    `https://api.data.gov.in/resource/${resourceId}?${params.toString()}`,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    },
  );

  if (!response.ok) {
    throw new Error(`AGMARKNET request failed for ${market}`);
  }

  return readRecords(await response.json());
}

function ingredientCandidates(name: string) {
  const normalizedName = normalize(name);
  const aliases =
    COMMODITY_ALIASES[normalizedName] ||
    COMMODITY_ALIASES[normalizedName.replace(/\s+/g, '_')];

  return aliases?.map(normalize) || [normalizedName];
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const apiKey =
      process.env.DATA_GOV_IN_API_KEY ||
      process.env.DATA_GOV_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'DATA_GOV_IN_API_KEY is not configured. Add it in .env and Dokploy environment variables.',
          setupRequired: true,
        },
        { status: 503 },
      );
    }

    const resourceId =
      process.env.DATA_GOV_IN_AGMARKNET_RESOURCE_ID ||
      DEFAULT_RESOURCE_ID;

    const body = await request.json() as Record<string, unknown>;

    const rates: SubmittedRate[] = Array.isArray(body.rates)
      ? body.rates.flatMap((value) => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [];
          }

          const row = value as Record<string, unknown>;
          const name = String(row.name || '').trim();
          const unit = String(row.unit || '').trim();

          if (!name || !unit) return [];

          return [{
            id: String(row.id || '').trim(),
            name,
            category: String(row.category || 'Other').trim(),
            rate: Math.max(0, Number(row.rate) || 0),
            unit,
          }];
        })
      : [];

    const results = await Promise.allSettled(
      MARKET_PRIORITY.map((market) =>
        fetchMarket(market, apiKey, resourceId),
      ),
    );

    const records = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    );

    if (!records.length) {
      return NextResponse.json(
        {
          error:
            'No wholesale records were returned for Silvassa or nearby fallback markets.',
        },
        { status: 502 },
      );
    }

    records.sort((left, right) => {
      const dateOrder =
        parseDate(right.arrivalDate) -
        parseDate(left.arrivalDate);

      if (dateOrder) return dateOrder;

      return (
        MARKET_PRIORITY.indexOf(left.market) -
        MARKET_PRIORITY.indexOf(right.market)
      );
    });

    const proposals = [];
    const unmatched: string[] = [];
    const supplierRequired: string[] = [];

    for (const ingredient of rates) {
      if (SUPPLIER_CATEGORIES.has(ingredient.category)) {
        supplierRequired.push(ingredient.name);
        continue;
      }

      if (!['kg', 'gram'].includes(ingredient.unit)) {
        unmatched.push(ingredient.name);
        continue;
      }

      const candidates = ingredientCandidates(ingredient.name);

      let matched: MarketRecord | undefined;
      let confidence: 'HIGH' | 'REVIEW' = 'HIGH';

      matched = records.find((record) =>
        candidates.includes(normalize(record.commodity)),
      );

      if (!matched) {
        matched = records.find((record) => {
          const commodity = normalize(record.commodity);

          return candidates.some((candidate) =>
            commodity.includes(candidate) ||
            candidate.includes(commodity),
          );
        });

        confidence = 'REVIEW';
      }

      if (!matched) {
        unmatched.push(ingredient.name);
        continue;
      }

      const perKgRate = matched.modalPrice / 100;
      const proposedRate =
        ingredient.unit === 'gram'
          ? perKgRate / 1000
          : perKgRate;

      const roundedRate =
        Math.round(proposedRate * 100) / 100;

      const changePercent =
        ingredient.rate > 0
          ? ((roundedRate - ingredient.rate) / ingredient.rate) * 100
          : 100;

      proposals.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        currentRate: ingredient.rate,
        proposedRate: roundedRate,
        changePercent:
          Math.round(changePercent * 100) / 100,
        commodity: matched.commodity,
        market: matched.market,
        arrivalDate: matched.arrivalDate,
        source: 'AGMARKNET',
        confidence,
      });
    }

    const today = todayInIndia();
    const todayMatches = proposals.filter(
      (proposal) => proposal.arrivalDate === today,
    ).length;

    return NextResponse.json({
      city: 'Silvassa',
      marketType: 'Wholesale',
      rateDate: displayToday(),
      source: 'AGMARKNET + Suppliers',
      marketsChecked: MARKET_PRIORITY,
      proposals,
      unmatched,
      supplierRequired,
      warning:
        proposals.length && !todayMatches
          ? 'Today’s records were unavailable for matched commodities. The newest available nearby-market records are shown.'
          : '',
    });
  } catch (error) {
    console.error('Market-rate lookup failed:', error);

    return NextResponse.json(
      { error: 'Failed to fetch current wholesale market rates' },
      { status: 500 },
    );
  }
}
