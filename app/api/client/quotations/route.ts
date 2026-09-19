import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const VALID_STATUSES = new Set([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
]);

function clean(value: unknown, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function intValue(value: unknown) {
  return Math.round(numberValue(value));
}

function cleanTerms(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => clean(item, 300))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanPublicSnapshot(value: unknown): Prisma.InputJsonValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const row = value as Record<string, unknown>;
  const profile =
    row.profile &&
    typeof row.profile === 'object' &&
    !Array.isArray(row.profile)
      ? row.profile as Record<string, unknown>
      : {};

  const event =
    row.event &&
    typeof row.event === 'object' &&
    !Array.isArray(row.event)
      ? row.event as Record<string, unknown>
      : {};

  const menu = Array.isArray(row.menu)
    ? row.menu
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return null;
          }

          const dish = item as Record<string, unknown>;

          return {
            name: clean(dish.name, 160),
            category: clean(dish.category, 100),
            dayLabel: clean(dish.dayLabel, 100),
            mealLabel: clean(dish.mealLabel, 100),
            serviceId: clean(dish.serviceId, 100),
            servicePax: intValue(dish.servicePax),
          };
        })
        .filter((item) => item?.name)
        .slice(0, 500)
    : [];

  const groceryRow =
    row.grocery &&
    typeof row.grocery === 'object' &&
    !Array.isArray(row.grocery)
      ? row.grocery as Record<string, unknown>
      : {};

  const groceryItems =
    Array.isArray(
      groceryRow.combinedItems,
    )
      ? groceryRow.combinedItems
          .map((item) => {
            if (
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item)
            ) {
              return null;
            }

            const grocery =
              item as Record<
                string,
                unknown
              >;

            return {
              name: clean(
                grocery.name,
                160,
              ),
              quantity:
                numberValue(
                  grocery.quantity,
                ),
              unit: clean(
                grocery.unit,
                30,
              ),
              dishes:
                Array.isArray(
                  grocery.dishes,
                )
                  ? grocery.dishes
                      .map(
                        (dish) =>
                          clean(
                            dish,
                            160,
                          ),
                      )
                      .filter(
                        Boolean,
                      )
                      .slice(
                        0,
                        40,
                      )
                  : [],
            };
          })
          .filter(
            (item) =>
              item?.name,
          )
          .slice(
            0,
            600,
          )
      : [];

  const unmatchedDishes =
    Array.isArray(
      groceryRow.unmatchedDishes,
    )
      ? groceryRow.unmatchedDishes
          .map(
            (dish) =>
              clean(
                dish,
                160,
              ),
          )
          .filter(
            Boolean,
          )
          .slice(
            0,
            200,
          )
      : [];

  const manpower =
    Array.isArray(
      row.manpower,
    )
      ? row.manpower
          .map((item) => {
            if (
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item)
            ) {
              return null;
            }

            const staff =
              item as Record<
                string,
                unknown
              >;

            return {
              role: clean(
                staff.role,
                120,
              ),
              quantity:
                numberValue(
                  staff.quantity,
                ),
              dayLabel:
                clean(
                  staff.dayLabel,
                  100,
                ),
              mealLabel:
                clean(
                  staff.mealLabel,
                  100,
                ),
            };
          })
          .filter(
            (item) =>
              item?.role &&
              Number(
                item.quantity,
              ) > 0,
          )
          .slice(
            0,
            300,
          )
      : [];

  const disposable =
    Array.isArray(
      row.disposable,
    )
      ? row.disposable
          .map((item) => {
            if (
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item)
            ) {
              return null;
            }

            const disposableItem =
              item as Record<
                string,
                unknown
              >;

            return {
              name: clean(
                disposableItem.name,
                120,
              ),
              quantity:
                numberValue(
                  disposableItem.quantity,
                ),
            };
          })
          .filter(
            (item) =>
              item?.name &&
              Number(
                item.quantity,
              ) > 0,
          )
          .slice(
            0,
            200,
          )
      : [];

  const operations =
    row.operations &&
    typeof row.operations === 'object' &&
    !Array.isArray(row.operations)
      ? row.operations as Record<string, unknown>
      : {};

  const operationFunctions =
    Array.isArray(
      operations.functions,
    )
      ? operations.functions
          .map((item) => {
            if (
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item)
            ) {
              return null;
            }

            const operation =
              item as Record<
                string,
                unknown
              >;

            const gas =
              operation.gas &&
              typeof operation.gas === 'object' &&
              !Array.isArray(operation.gas)
                ? operation.gas as Record<string, unknown>
                : {};

            const transport =
              operation.transport &&
              typeof operation.transport === 'object' &&
              !Array.isArray(operation.transport)
                ? operation.transport as Record<string, unknown>
                : {};

            return {
              dayLabel:
                clean(
                  operation.dayLabel,
                  100,
                ),
              mealLabel:
                clean(
                  operation.mealLabel,
                  100,
                ),
              pax:
                intValue(
                  operation.pax,
                ),
              gas: {
                mode:
                  clean(
                    gas.mode,
                    20,
                  ),
                usedKg:
                  numberValue(
                    gas.usedKg,
                  ),
                cylindersUsed:
                  numberValue(
                    gas.cylindersUsed,
                  ),
              },
              transport: {
                vehicleLabel:
                  clean(
                    transport.vehicleLabel,
                    80,
                  ),
                vehicles:
                  numberValue(
                    transport.vehicles,
                  ),
                tripsPerVehicle:
                  numberValue(
                    transport.tripsPerVehicle,
                  ),
              },
            };
          })
          .filter(Boolean)
          .slice(
            0,
            100,
          )
      : [];

  const sharedTransport =
    operations.sharedTransport &&
    typeof operations.sharedTransport === 'object' &&
    !Array.isArray(operations.sharedTransport)
      ? operations.sharedTransport as Record<string, unknown>
      : {};

  return {
    profile: {
      businessName: clean(profile.businessName, 180),
      ownerName: clean(profile.ownerName, 160),
      phone: clean(profile.phone, 40),
      city: clean(profile.city, 100),
      logoText: clean(profile.logoText, 8),
    },
    event: {
      clientName: clean(event.clientName, 180),
      eventName: clean(event.eventName, 180),
      eventDate: clean(event.eventDate, 60),
      functionType: clean(event.functionType, 120),
      city: clean(event.city, 100),
      venue: clean(event.venue, 220),
      pax: intValue(event.pax),
    },
    menu,
    grocery: {
      combinedItems:
        groceryItems,
      unmatchedDishes,
    },
    manpower,
    disposable,
    operations: {
      transportMode:
        clean(
          operations.transportMode,
          30,
        ),
      sharedTransport: {
        vehicleLabel:
          clean(
            sharedTransport.vehicleLabel,
            80,
          ),
        vehicles:
          numberValue(
            sharedTransport.vehicles,
          ),
        tripsPerVehicle:
          numberValue(
            sharedTransport.tripsPerVehicle,
          ),
      },
      functions:
        operationFunctions,
    },
  } as Prisma.InputJsonValue;
}

function quotationNumber() {
  const day = new Date()
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '');

  const random = randomUUID()
    .replace(/-/g, '')
    .slice(0, 5)
    .toUpperCase();

  return `MCQ-${day}-${random}`;
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const costingId = clean(
      url.searchParams.get('costingId'),
      120,
    );

    if (costingId) {
      const quotation =
        await prisma.tenantQuotation.findUnique({
          where: {
            tenantId_costingId: {
              tenantId,
              costingId,
            },
          },
        });

      return NextResponse.json({
        quotation,
      });
    }

    const quotations =
      await prisma.tenantQuotation.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });

    return NextResponse.json({
      quotations,
    });
  } catch (error) {
    console.error('Quotation GET error:', error);

    return NextResponse.json(
      { error: 'Could not load quotation' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const costingId = clean(body.costingId, 120);

    if (!costingId) {
      return NextResponse.json(
        { error: 'Costing id required' },
        { status: 400 },
      );
    }

    const current =
      await prisma.tenantQuotation.findUnique({
        where: {
          tenantId_costingId: {
            tenantId,
            costingId,
          },
        },
        select: {
          quotationNumber: true,
          status: true,
          sentAt: true,
          acceptedAt: true,
          rejectedAt: true,
        },
      });

    const rawStatus = clean(
      body.status || current?.status || 'DRAFT',
      30,
    ).toUpperCase();

    const status = VALID_STATUSES.has(rawStatus)
      ? rawStatus
      : 'DRAFT';

    const pricePerCover = numberValue(body.pricePerCover);
    const totalCovers = intValue(body.totalCovers);
    const includeTotal = Boolean(body.includeTotal);
    const subtotal = numberValue(body.subtotal);
    const gstPercent = Math.min(100, numberValue(body.gstPercent));
    const gstAmount = numberValue(body.gstAmount);
    const extraAmount = numberValue(body.extraAmount);
    const grandTotal = numberValue(body.grandTotal);

    const now = new Date();

    const quotation =
      await prisma.tenantQuotation.upsert({
        where: {
          tenantId_costingId: {
            tenantId,
            costingId,
          },
        },
        create: {
          tenantId,
          costingId,
          quotationNumber: quotationNumber(),
          status,
          clientName: clean(body.clientName, 180),
          clientPhone: clean(body.clientPhone, 40),
          eventName: clean(body.eventName, 180),
          eventDate: clean(body.eventDate, 60),
          venue: clean(body.venue, 220),
          city: clean(body.city, 100),
          totalCovers,
          pricePerCover,
          includeTotal,
          subtotal,
          gstPercent,
          gstAmount,
          extraLabel: clean(body.extraLabel, 120),
          extraAmount,
          grandTotal,
          validityDays: Math.max(1, Math.min(90, intValue(body.validityDays) || 7)),
          advancePercent: Math.min(100, numberValue(body.advancePercent)),
          paymentTerms: clean(body.paymentTerms, 500),
          terms: cleanTerms(body.terms) as Prisma.InputJsonValue,
          notes: clean(body.notes, 1200),
          publicSnapshot: cleanPublicSnapshot(body.publicSnapshot),
          sentAt: status === 'SENT' ? now : null,
          acceptedAt: status === 'ACCEPTED' ? now : null,
          rejectedAt: status === 'REJECTED' ? now : null,
        },
        update: {
          status,
          clientName: clean(body.clientName, 180),
          clientPhone: clean(body.clientPhone, 40),
          eventName: clean(body.eventName, 180),
          eventDate: clean(body.eventDate, 60),
          venue: clean(body.venue, 220),
          city: clean(body.city, 100),
          totalCovers,
          pricePerCover,
          includeTotal,
          subtotal,
          gstPercent,
          gstAmount,
          extraLabel: clean(body.extraLabel, 120),
          extraAmount,
          grandTotal,
          validityDays: Math.max(1, Math.min(90, intValue(body.validityDays) || 7)),
          advancePercent: Math.min(100, numberValue(body.advancePercent)),
          paymentTerms: clean(body.paymentTerms, 500),
          terms: cleanTerms(body.terms) as Prisma.InputJsonValue,
          notes: clean(body.notes, 1200),
          publicSnapshot: cleanPublicSnapshot(body.publicSnapshot),
          sentAt:
            status === 'SENT'
              ? current?.sentAt || now
              : current?.sentAt,
          acceptedAt:
            status === 'ACCEPTED'
              ? current?.acceptedAt || now
              : current?.acceptedAt,
          rejectedAt:
            status === 'REJECTED'
              ? current?.rejectedAt || now
              : current?.rejectedAt,
        },
      });

    return NextResponse.json({
      ok: true,
      quotation,
    });
  } catch (error) {
    console.error('Quotation PUT error:', error);

    return NextResponse.json(
      { error: 'Could not save quotation' },
      { status: 500 },
    );
  }
}
