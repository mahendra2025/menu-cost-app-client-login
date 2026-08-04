import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

function googleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} dish recipe food`)}`;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getAdminCookieName(),
  )?.value;

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json(
      { error: 'Admin login required' },
      { status: 401 },
    );
  }

  const query = new URL(request.url)
    .searchParams.get('q')
    ?.normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || '';

  if (!query) {
    return NextResponse.json(
      { error: 'Dish name is required' },
      { status: 400 },
    );
  }

  const searchUrl = googleSearchUrl(query);
  const apiKey =
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim();
  const engineId =
    process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID?.trim();

  if (!apiKey || !engineId) {
    return NextResponse.json({
      configured: false,
      searchUrl,
      results: [],
    });
  }

  try {
    const parameters = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: `${query} dish recipe food`,
      num: '5',
      safe: 'active',
      gl: 'in',
    });
    const response = await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?${parameters.toString()}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = await response.json() as {
      error?: { message?: string };
      items?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }>;
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
          'Google search failed',
      );
    }

    const results = (data.items || [])
      .flatMap((item) => {
        const link = String(item.link || '');

        if (!/^https?:\/\//i.test(link)) return [];

        return [{
          title: String(item.title || 'Google result').slice(0, 180),
          link,
          snippet: String(item.snippet || '').slice(0, 500),
        }];
      })
      .slice(0, 5);

    return NextResponse.json({
      configured: true,
      searchUrl,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Google search failed',
        searchUrl,
      },
      { status: 502 },
    );
  }
}
