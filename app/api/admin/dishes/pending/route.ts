import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';
import { prisma } from '../../../../../lib/prisma';

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

function cleanText(value: unknown, maxLength = 120) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanAliases(value: unknown) {
  const supplied = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  return Array.from(
    new Map(
      supplied
        .map((alias) => cleanText(alias, 120))
        .filter(Boolean)
        .map((alias) => [
          alias.toLocaleLowerCase('en-IN'),
          alias,
        ]),
    ).values(),
  ).slice(0, 60);
}

function addAlias(
  aliases: string[],
  alias: string,
  canonicalName: string,
) {
  const candidate = cleanText(alias, 120);

  if (
    !candidate ||
    candidate.toLocaleLowerCase('en-IN') ===
      canonicalName.toLocaleLowerCase('en-IN')
  ) {
    return aliases;
  }

  return cleanAliases([...aliases, candidate]);
}

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const url = new URL(request.url);
    const status = cleanText(
      url.searchParams.get('status') || 'PENDING',
      30,
    ).toUpperCase();

    const where = status === 'ALL'
      ? {}
      : { status };

    const [items, pendingCount] = await Promise.all([
      prisma.pendingDishSuggestion.findMany({
        where,
        orderBy: [
          { occurrences: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: 200,
        select: {
          id: true,
          name: true,
          normalizedName: true,
          categoryHint: true,
          tenantId: true,
          sourceFileName: true,
          occurrences: true,
          status: true,
          canonicalName: true,
          suggestedCategory: true,
          suggestedSubcategory: true,
          matchedDishName: true,
          recommendation: true,
          adminNotes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.pendingDishSuggestion.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return NextResponse.json({
      items,
      pendingCount,
    });
  } catch (error) {
    console.error('Pending dish GET failed:', error);

    return NextResponse.json(
      { error: 'Failed to load unknown dishes.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json() as Record<string, unknown>;
    const id = cleanText(body.id, 80);
    const action = cleanText(body.action, 30).toUpperCase();
    const adminNotes = cleanText(body.adminNotes, 500);

    if (!id) {
      return NextResponse.json(
        { error: 'Unknown dish id is required.' },
        { status: 400 },
      );
    }

    const pending = await prisma.pendingDishSuggestion.findUnique({
      where: { id },
    });

    if (!pending) {
      return NextResponse.json(
        { error: 'Unknown dish was not found.' },
        { status: 404 },
      );
    }

    if (action === 'IGNORE') {
      const saved = await prisma.pendingDishSuggestion.update({
        where: { id },
        data: {
          status: 'IGNORED',
          recommendation: 'IGNORE',
          adminNotes,
          analyzedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        action,
        suggestion: saved,
      });
    }

    if (action === 'MATCH_EXISTING') {
      const targetDishName = cleanText(body.targetDishName, 120);

      if (!targetDishName) {
        return NextResponse.json(
          { error: 'Choose an existing Dish Master item first.' },
          { status: 400 },
        );
      }

      const target = await prisma.dishMasterItem.findFirst({
        where: {
          name: {
            equals: targetDishName,
            mode: 'insensitive',
          },
        },
      });

      if (!target) {
        return NextResponse.json(
          { error: 'Existing dish was not found.' },
          { status: 404 },
        );
      }

      const existingAliases = Array.isArray(target.aliases)
        ? target.aliases
            .map((alias) => cleanText(alias, 120))
            .filter(Boolean)
        : [];
      const aliases = addAlias(
        existingAliases,
        pending.name,
        target.name,
      );

      const result = await prisma.$transaction(async (tx) => {
        const dish = await tx.dishMasterItem.update({
          where: { id: target.id },
          data: { aliases },
        });

        const suggestion = await tx.pendingDishSuggestion.update({
          where: { id },
          data: {
            status: 'MATCHED',
            canonicalName: target.name,
            matchedDishName: target.name,
            suggestedCategory: target.category,
            suggestedSubcategory: target.subcategory,
            recommendation: 'MATCH_EXISTING',
            adminNotes,
            analyzedAt: new Date(),
          },
        });

        return { dish, suggestion };
      });

      return NextResponse.json({
        ok: true,
        action,
        ...result,
      });
    }

    if (action === 'ADD_NEW') {
      const name = cleanText(body.name || pending.name, 120);
      const category = cleanText(
        body.category || pending.categoryHint || 'Other',
        60,
      ) || 'Other';
      const subcategory = cleanText(body.subcategory, 60);
      const rate = Number(body.rate);
      const servingQuantity = Number(body.servingQuantity || 1);
      const servingUnit = cleanText(body.servingUnit || 'serving', 40) || 'serving';

      if (
        !name ||
        !Number.isFinite(rate) ||
        rate <= 0 ||
        !Number.isFinite(servingQuantity) ||
        servingQuantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'Dish name, cost, serving quantity and serving unit are required.',
          },
          { status: 400 },
        );
      }

      const duplicate = await prisma.dishMasterItem.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              `“${duplicate.name}” already exists. Use Match Existing instead.`,
          },
          { status: 409 },
        );
      }

      let aliases = cleanAliases(body.aliases);
      aliases = addAlias(aliases, pending.name, name);

      const result = await prisma.$transaction(async (tx) => {
        const dish = await tx.dishMasterItem.create({
          data: {
            name,
            category,
            subcategory,
            rate,
            servingQuantity,
            servingUnit,
            aliases,
          },
        });

        const suggestion = await tx.pendingDishSuggestion.update({
          where: { id },
          data: {
            status: 'APPROVED',
            canonicalName: name,
            matchedDishName: name,
            suggestedCategory: category,
            suggestedSubcategory: subcategory,
            recommendation: 'ADD_NEW',
            adminNotes,
            analyzedAt: new Date(),
          },
        });

        return { dish, suggestion };
      });

      return NextResponse.json({
        ok: true,
        action,
        ...result,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported review action.' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Pending dish review failed:', error);

    return NextResponse.json(
      { error: 'Failed to review unknown dish.' },
      { status: 500 },
    );
  }
}
