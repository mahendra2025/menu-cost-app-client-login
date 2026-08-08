import {
  createHash,
} from 'crypto';

import {
  NextResponse,
} from 'next/server';

import {
  getRazorpayConfig,
  getRazorpayWebhookSecret,
  verifyRazorpayWebhookSignature,
} from '../../../../lib/razorpay';

import {
  prisma,
} from '../../../../lib/prisma';

type RazorpaySubscription = {
  id?: string;
  plan_id?: string;
  customer_id?: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  notes?: Record<string, unknown> | null;
};

type RazorpayWebhookPayload = {
  event?: string;

  payload?: {
    subscription?: {
      entity?: RazorpaySubscription;
    };
  };
};

const PRO_STATUSES =
  new Set([
    'authenticated',
    'active',
    'resumed',

    // Keep access while Razorpay
    // is retrying a failed charge.
    'pending',
  ]);

const FREE_STATUSES =
  new Set([
    'halted',
    'cancelled',
    'completed',
    'paused',
    'expired',
  ]);

function timestampToDate(
  value:
    | number
    | null
    | undefined,
) {
  if (
    !value ||
    !Number.isFinite(value)
  ) {
    return undefined;
  }

  return new Date(
    value * 1000,
  );
}

export async function POST(
  request: Request,
) {
  /*
   * IMPORTANT:
   * Razorpay requires verification
   * against the exact RAW request body.
   *
   * Do not call request.json()
   * before verifying the signature.
   */
  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      'x-razorpay-signature',
    ) || '';

  const webhookSecret =
    getRazorpayWebhookSecret();

  if (!webhookSecret) {
    console.error(
      'RAZORPAY_WEBHOOK_SECRET is not configured.',
    );

    return NextResponse.json(
      {
        error:
          'Webhook is not configured.',
      },
      { status: 503 },
    );
  }

  if (
    !verifyRazorpayWebhookSignature(
      rawBody,
      signature,
      webhookSecret,
    )
  ) {
    console.warn(
      'Rejected Razorpay webhook with invalid signature.',
    );

    return NextResponse.json(
      {
        error:
          'Invalid webhook signature.',
      },
      { status: 401 },
    );
  }

  let event:
    RazorpayWebhookPayload;

  try {
    event =
      JSON.parse(
        rawBody,
      ) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid webhook payload.',
      },
      { status: 400 },
    );
  }

  const eventType =
    String(
      event.event || '',
    )
      .trim()
      .toLowerCase();

  /*
   * This endpoint only handles
   * subscription lifecycle events.
   * Ignore other valid Razorpay
   * webhook types safely.
   */
  if (
    !eventType.startsWith(
      'subscription.',
    )
  ) {
    return NextResponse.json({
      ok: true,
      ignored: true,
    });
  }

  const subscription =
    event.payload
      ?.subscription
      ?.entity;

  const subscriptionId =
    String(
      subscription?.id || '',
    ).trim();

  if (!subscriptionId) {
    return NextResponse.json(
      {
        error:
          'Subscription ID missing.',
      },
      { status: 400 },
    );
  }

  const config =
    getRazorpayConfig();

  /*
   * Never promote an account from
   * a webhook for some unrelated
   * Razorpay plan.
   */
  const eventPlanId =
    String(
      subscription?.plan_id || '',
    ).trim();

  if (
    eventPlanId &&
    config.planId &&
    eventPlanId !==
      config.planId
  ) {
    console.warn(
      'Ignoring webhook for unrelated Razorpay plan:',
      eventPlanId,
    );

    return NextResponse.json({
      ok: true,
      ignored: true,
    });
  }

  /*
   * Razorpay payload samples do not
   * provide a convenient webhook ID
   * in every case.
   *
   * Hashing the verified raw body
   * makes retries idempotent.
   */
  const webhookId =
    createHash('sha256')
      .update(rawBody)
      .digest('hex');

  const status =
    String(
      subscription?.status ||
        eventType.replace(
          'subscription.',
          '',
        ),
    )
      .trim()
      .toLowerCase();

  const tenantNoteId =
    String(
      subscription
        ?.notes
        ?.tenant_id || '',
    ).trim();

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const alreadyProcessed =
            await tx
              .razorpayWebhookEvent
              .findUnique({
                where: {
                  id: webhookId,
                },
              });

          if (
            alreadyProcessed
          ) {
            return {
              duplicate:
                true,
              tenantId:
                null,
            };
          }

          let tenant =
            await tx.tenant.findUnique({
              where: {
                razorpaySubscriptionId:
                  subscriptionId,
              },
            });

          /*
           * Fallback to the tenant_id
           * placed in subscription notes
           * when the subscription was
           * created.
           */
          if (
            !tenant &&
            tenantNoteId
          ) {
            tenant =
              await tx.tenant.findUnique({
                where: {
                  id:
                    tenantNoteId,
                },
              });
          }

          if (!tenant) {
            console.warn(
              'Razorpay subscription has no matching tenant:',
              subscriptionId,
            );

            return {
              duplicate:
                false,
              tenantId:
                null,
            };
          }

          const updateData: {
            razorpaySubscriptionId?:
              string;

            razorpayCustomerId?:
              string;

            subscriptionStatus?:
              string;

            currentPeriodEnd?:
              Date | null;

            cancelAtPeriodEnd?:
              boolean;

            plan?:
              string;

            status?:
              string;
          } = {
            razorpaySubscriptionId:
              subscriptionId,

            subscriptionStatus:
              status,
          };

          const customerId =
            String(
              subscription
                ?.customer_id ||
                '',
            ).trim();

          if (customerId) {
            updateData
              .razorpayCustomerId =
              customerId;
          }

          const periodEnd =
            timestampToDate(
              subscription
                ?.current_end,
            );

          if (periodEnd) {
            updateData
              .currentPeriodEnd =
              periodEnd;
          }

          /*
           * Active/authenticated/
           * resumed = paid access.
           *
           * Pending stays PRO while
           * Razorpay retries payment.
           */
          if (
            PRO_STATUSES.has(
              status,
            )
          ) {
            updateData.plan =
              'PRO';

            updateData.status =
              'ACTIVE';
          }

          /*
           * Halted:
           * retries exhausted.
           *
           * Cancelled:
           * subscription actually ended.
           *
           * Completed:
           * all billing cycles finished.
           *
           * Paused:
           * paid access suspended.
           */
          if (
            FREE_STATUSES.has(
              status,
            )
          ) {
            updateData.plan =
              'FREE';

            updateData.status =
              'ACTIVE';
          }

          if (
            status ===
              'cancelled' ||
            status ===
              'completed'
          ) {
            updateData
              .cancelAtPeriodEnd =
              false;
          }

          await tx.tenant.update({
            where: {
              id:
                tenant.id,
            },

            data:
              updateData,
          });

          await tx
            .razorpayWebhookEvent
            .create({
              data: {
                id:
                  webhookId,

                eventType,
              },
            });

          return {
            duplicate:
              false,

            tenantId:
              tenant.id,
          };
        },
      );

    return NextResponse.json({
      ok: true,

      event:
        eventType,

      status,

      duplicate:
        result.duplicate,

      matched:
        Boolean(
          result.tenantId,
        ),
    });
  } catch (error) {
    console.error(
      'Razorpay webhook error:',
      error,
    );

    /*
     * Return 500 so Razorpay can
     * retry genuine processing
     * failures.
     */
    return NextResponse.json(
      {
        error:
          'Webhook processing failed.',
      },
      { status: 500 },
    );
  }
}
