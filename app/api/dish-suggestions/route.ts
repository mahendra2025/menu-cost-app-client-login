import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../lib/clientAuth';
import { prisma } from '../../../lib/prisma';

function normalizeName(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function suggestionKey(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const tenantId = readClientSessionToken(
      cookieStore.get(
        getClientCookieName(),
      )?.value,
    );

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;
    const sourceFileName = normalizeName(
      body.sourceFileName,
    ).slice(0, 180);
    const supplied = Array.isArray(
      body.candidates,
    )
      ? body.candidates.slice(0, 100)
      : [];
    const unique = new Map<
      string,
      {
        name: string;
        categoryHint: string;
      }
    >();

    for (const value of supplied) {
      if (
        !value ||
        typeof value !== 'object'
      ) {
        continue;
      }

      const row = value as Record<
        string,
        unknown
      >;
      const name = normalizeName(
        row.name,
      ).slice(0, 120);
      const normalizedName =
        suggestionKey(name);
      const categoryHint =
        normalizeName(
          row.categoryHint,
        ).slice(0, 60) || 'Other';
      const wordCount =
        normalizedName
          .split(' ')
          .filter(Boolean).length;

      if (
        !normalizedName ||
        wordCount > 8
      ) {
        continue;
      }

      unique.set(normalizedName, {
        name,
        categoryHint,
      });
    }

    for (const [
      normalizedName,
      candidate,
    ] of unique) {
      await prisma
        .pendingDishSuggestion
        .upsert({
          where: {
            normalizedName,
          },
          create: {
            name: candidate.name,
            normalizedName,
            categoryHint:
              candidate.categoryHint,
            tenantId,
            sourceFileName,
          },
          update: {
            name: candidate.name,
            categoryHint:
              candidate.categoryHint,
            tenantId,
            sourceFileName,
            occurrences: {
              increment: 1,
            },
          },
        });
    }

    return NextResponse.json({
      ok: true,
      queued: unique.size,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to queue new dishes',
      },
      { status: 500 },
    );
  }
}
