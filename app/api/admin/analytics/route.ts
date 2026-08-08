import {
  NextResponse,
} from 'next/server';
import {
  cookies,
} from 'next/headers';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import {
  prisma,
} from '../../../../lib/prisma';

const PRO_MONTHLY_PRICE = 999;

async function requireAdmin() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      getAdminCookieName(),
    )?.value;

  if (
    !isValidAdminSessionToken(
      token,
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Admin login required',
      },
      {
        status: 401,
      },
    );
  }

  return null;
}

function startOfDay(
  value: Date,
) {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0,
  );

  return date;
}

function dayKey(
  value: Date,
) {
  return value
    .toISOString()
    .slice(0, 10);
}

function percent(
  numerator: number,
  denominator: number,
) {
  if (!denominator) return 0;

  return Number(
    (
      (numerator /
        denominator) *
      100
    ).toFixed(1),
  );
}

function metadataObject(
  value: unknown,
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {} as Record<
      string,
      unknown
    >;
  }

  return value as Record<
    string,
    unknown
  >;
}

export async function GET(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const url =
      new URL(request.url);

    const requestedDays =
      Number(
        url.searchParams.get(
          'days',
        ),
      ) || 30;

    const days =
      [7, 30, 90].includes(
        requestedDays,
      )
        ? requestedDays
        : 30;

    const now = new Date();

    const since =
      new Date(
        now.getTime() -
          days *
            24 *
            60 *
            60 *
            1000,
      );

    const [
      tenants,
      periodEvents,
      activityEvents,
    ] = await Promise.all([
      prisma.tenant.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          status: true,
          onboardingCompleted:
            true,
          createdAt: true,
          subscriptionStatus:
            true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd:
            true,
        },
      }),

      prisma
        .productAnalyticsEvent
        .findMany({
          where: {
            createdAt: {
              gte: since,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20000,
        }),

      prisma
        .productAnalyticsEvent
        .findMany({
          where: {
            tenantId: {
              not: null,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 40000,
        }),
    ]);

    const signups =
      tenants.filter(
        (tenant) =>
          tenant.createdAt >=
          since,
      );

    const signupTenantIds =
      new Set(
        signups.map(
          (tenant) =>
            tenant.id,
        ),
      );

    function uniqueVisitors(
      eventName: string,
    ) {
      return new Set(
        periodEvents
          .filter(
            (event) =>
              event.eventName ===
              eventName,
          )
          .map(
            (event) =>
              event.visitorId,
          ),
      ).size;
    }

    function cohortTenants(
      eventName: string,
    ) {
      return new Set(
        periodEvents
          .filter(
            (event) =>
              event.eventName ===
                eventName &&
              Boolean(
                event.tenantId,
              ) &&
              signupTenantIds.has(
                String(
                  event.tenantId,
                ),
              ),
          )
          .map(
            (event) =>
              String(
                event.tenantId,
              ),
          ),
      ).size;
    }

    const visitors =
      uniqueVisitors(
        'landing_view',
      );

    const ctaVisitors =
      uniqueVisitors(
        'signup_cta_click',
      );

    const onboarded =
      signups.filter(
        (tenant) =>
          tenant.onboardingCompleted,
      ).length;

    const menuDetected =
      cohortTenants(
        'menu_detected',
      );

    const menuSaved =
      cohortTenants(
        'menu_saved',
      );

    const costReviewed =
      cohortTenants(
        'cost_reviewed',
      );

    const finalComplete =
      cohortTenants(
        'final_costing_complete',
      );

    const periodPro =
      signups.filter(
        (tenant) =>
          tenant.plan ===
          'PRO',
      ).length;

    const activePro =
      tenants.filter(
        (tenant) =>
          tenant.plan ===
            'PRO' &&
          tenant.status ===
            'ACTIVE',
      );

    const activeClients =
      tenants.filter(
        (tenant) =>
          tenant.status ===
          'ACTIVE',
      ).length;

    const funnelRaw = [
      {
        key: 'visitors',
        label: 'Landing visitors',
        count: visitors,
      },
      {
        key: 'cta',
        label: 'Clicked Start Free',
        count: ctaVisitors,
      },
      {
        key: 'signup',
        label: 'Signed up',
        count: signups.length,
      },
      {
        key: 'onboarding',
        label:
          'Onboarding complete',
        count: onboarded,
      },
      {
        key: 'detected',
        label: 'Menu detected',
        count: menuDetected,
      },
      {
        key: 'saved',
        label: 'Menu saved',
        count: menuSaved,
      },
      {
        key: 'cost',
        label: 'Cost reviewed',
        count: costReviewed,
      },
      {
        key: 'final',
        label:
          'Final costing complete',
        count: finalComplete,
      },
      {
        key: 'pro',
        label: 'Pro',
        count: periodPro,
      },
    ];

    const funnel =
      funnelRaw.map(
        (stage, index) => {
          const previous =
            index === 0
              ? stage.count
              : funnelRaw[
                  index - 1
                ].count;

          return {
            ...stage,
            conversion:
              index === 0
                ? 100
                : percent(
                    stage.count,
                    previous,
                  ),
          };
        },
      );

    const eventsByTenant =
      new Map<
        string,
        typeof activityEvents
      >();

    activityEvents.forEach(
      (event) => {
        if (!event.tenantId) {
          return;
        }

        const list =
          eventsByTenant.get(
            event.tenantId,
          ) || [];

        list.push(event);

        eventsByTenant.set(
          event.tenantId,
          list,
        );
      },
    );

    function uniqueCostings(
      events:
        typeof activityEvents,
      eventName: string,
    ) {
      const keys =
        new Set<string>();

      events
        .filter(
          (event) =>
            event.eventName ===
            eventName,
        )
        .forEach(
          (event) => {
            const metadata =
              metadataObject(
                event.metadata,
              );

            const costingKey =
              typeof metadata.costingKey ===
              'string'
                ? metadata.costingKey
                : event.id;

            keys.add(
              costingKey,
            );
          },
        );

      return keys.size;
    }

    const clients =
      tenants.map(
        (tenant) => {
          const events =
            eventsByTenant.get(
              tenant.id,
            ) || [];

          const eventNames =
            new Set(
              events.map(
                (event) =>
                  event.eventName,
              ),
            );

          const menuCount =
            uniqueCostings(
              events,
              'menu_saved',
            );

          const costingCount =
            uniqueCostings(
              events,
              'final_costing_complete',
            );

          const lastActiveAt =
            events[0]
              ?.createdAt ||
            tenant.createdAt;

          let stage =
            'Signed up';

          if (
            tenant
              .onboardingCompleted
          ) {
            stage =
              'Onboarded';
          }

          if (
            eventNames.has(
              'menu_detected',
            )
          ) {
            stage =
              'Menu detected';
          }

          if (
            eventNames.has(
              'menu_saved',
            )
          ) {
            stage =
              'Menu saved';
          }

          if (
            eventNames.has(
              'cost_reviewed',
            )
          ) {
            stage =
              'Cost reviewed';
          }

          if (
            eventNames.has(
              'final_costing_complete',
            )
          ) {
            stage =
              'Costing complete';
          }

          if (
            tenant.plan ===
            'PRO'
          ) {
            stage = 'Pro';
          }

          const ageHours =
            (now.getTime() -
              tenant.createdAt.getTime()) /
            3_600_000;

          const billingIssue =
            [
              'halted',
              'cancelled',
              'paused',
              'expired',
            ].includes(
              String(
                tenant.subscriptionStatus ||
                  '',
              ).toLowerCase(),
            );

          let attention = '';

          if (
            tenant.status ===
            'INACTIVE'
          ) {
            attention =
              'Access blocked';
          } else if (
            billingIssue &&
            tenant.plan ===
              'PRO'
          ) {
            attention =
              'Subscription needs attention';
          } else if (
            costingCount > 0 &&
            tenant.plan ===
              'FREE'
          ) {
            attention =
              'Completed costing on Free';
          } else if (
            menuCount > 0 &&
            costingCount === 0
          ) {
            attention =
              'Menu saved, final costing incomplete';
          } else if (
            tenant
              .onboardingCompleted &&
            menuCount === 0 &&
            ageHours >= 24
          ) {
            attention =
              'Onboarded, no first menu';
          } else if (
            !tenant
              .onboardingCompleted &&
            ageHours >= 24
          ) {
            attention =
              'Onboarding incomplete';
          }

          return {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            plan: tenant.plan,
            status: tenant.status,
            onboardingCompleted:
              tenant.onboardingCompleted,
            subscriptionStatus:
              tenant.subscriptionStatus,
            cancelAtPeriodEnd:
              tenant.cancelAtPeriodEnd,
            createdAt:
              tenant.createdAt,
            lastActiveAt,
            menuCount,
            costingCount,
            stage,
            attention,
          };
        },
      )
      .sort(
        (a, b) =>
          new Date(
            b.lastActiveAt,
          ).getTime() -
          new Date(
            a.lastActiveAt,
          ).getTime(),
      );

    const attention =
      clients
        .filter(
          (client) =>
            client.attention,
        )
        .slice(0, 12);

    const trendDays =
      Math.min(
        days,
        30,
      );

    const trend = [];

    for (
      let offset =
        trendDays - 1;
      offset >= 0;
      offset -= 1
    ) {
      const date =
        startOfDay(
          new Date(
            now.getTime() -
              offset *
                24 *
                60 *
                60 *
                1000,
          ),
        );

      const key =
        dayKey(date);

      const signupsOnDay =
        tenants.filter(
          (tenant) =>
            dayKey(
              tenant.createdAt,
            ) === key,
        ).length;

      const activeEventsOnDay =
        periodEvents.filter(
          (event) =>
            event.tenantId &&
            dayKey(
              event.createdAt,
            ) === key,
        ).length;

      trend.push({
        date: key,
        label:
          date.toLocaleDateString(
            'en-IN',
            {
              day: 'numeric',
              month: 'short',
            },
          ),
        signups:
          signupsOnDay,
        activity:
          activeEventsOnDay,
      });
    }

    const latestEvents =
      periodEvents
        .filter(
          (event) =>
            event.tenantId,
        )
        .slice(0, 15)
        .map((event) => {
          const tenant =
            tenants.find(
              (item) =>
                item.id ===
                event.tenantId,
            );

          return {
            id: event.id,
            eventName:
              event.eventName,
            createdAt:
              event.createdAt,
            tenantName:
              tenant?.name ||
              'Client',
          };
        });

    return NextResponse.json({
      days,
      generatedAt: now,
      metrics: {
        estimatedMrr:
          activePro.length *
          PRO_MONTHLY_PRICE,
        proUsers:
          activePro.length,
        activeClients,
        signups:
          signups.length,
        visitorToSignup:
          percent(
            signups.length,
            visitors,
          ),
        signupToPro:
          percent(
            periodPro,
            signups.length,
          ),
        finalCostingRate:
          percent(
            finalComplete,
            signups.length,
          ),
      },
      funnel,
      trend,
      attention,
      clients:
        clients.slice(0, 100),
      latestEvents,
    });
  } catch (error) {
    console.error(
      'Admin analytics error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load analytics',
      },
      {
        status: 500,
      },
    );
  }
}
