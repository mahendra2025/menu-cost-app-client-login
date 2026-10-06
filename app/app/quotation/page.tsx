'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';

import AppShell from '../../components/AppShell';
import {
  calculate,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';
import type {
  Session,
  WorkState,
} from '../../../lib/types';
import type {
  ClientQuotationData,
} from '../../../lib/clientQuotationPdf';
import {
  buildFunctionGroceryPlan,
  type GroceryIngredientRate,
  type GroceryRecipe,
} from '../../../lib/functionGrocery';
import {
  normalizeOperationsState,
  type WorkWithOperations,
} from '../../../lib/operationsCost';
import {
  calculateDisposableCost,
} from '../../../lib/disposableCost';
import {
  calculateManpowerCost,
} from '../../../lib/manpowerCost';
import {
  calculateEventGas,
  defaultGasCostMaster,
  type GasCostMaster,
} from '../../../lib/gasCost';

type SavedQuotation =
  ClientQuotationData & {
    id: string;
    costingId: string;
    updatedAt: string;
  };

const DEFAULT_TERMS = [
  'Final guest count should be confirmed before the event as mutually agreed.',
  'Menu or service changes may affect the final quotation.',
  'Venue permissions, electricity, water and event-specific approvals are to be arranged as agreed with the client.',
];

function numberValue(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
}

function money(
  value: number,
) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function emptyQuotation(
  work: WorkState,
): ClientQuotationData {
  const result =
    calculate(work);

  const pricePerCover =
    numberValue(
      work.sellingPricePerPlate,
    );

  const totalCovers =
    result.totalCovers ||
    numberValue(
      work.event.pax,
    );

  const subtotal =
    pricePerCover *
    totalCovers;

  return {
    quotationNumber: '',
    status: 'DRAFT',
    clientName:
      work.event.clientName,
    clientPhone: '',
    eventName:
      work.event.eventName ||
      work.event.functionType,
    eventDate:
      work.event.eventDate,
    venue:
      work.event.venue,
    city:
      work.event.city,
    totalCovers,
    pricePerCover,
    includeTotal:
      work.profile.quotationIncludeTotal !== false,
    subtotal,
    gstPercent:
      numberValue(
        work.profile.quotationGstPercent,
      ),
    gstAmount:
      subtotal *
      (
        numberValue(
          work.profile.quotationGstPercent,
        ) /
        100
      ),
    extraLabel: '',
    extraAmount: 0,
    grandTotal:
      subtotal +
      subtotal *
        (
          numberValue(
            work.profile.quotationGstPercent,
          ) /
          100
        ),
    validityDays:
      Math.max(
        1,
        Math.round(
          numberValue(
            work.profile.quotationValidityDays,
          ) || 7,
        ),
      ),
    advancePercent:
      work.profile.quotationAdvancePercent ===
        undefined
        ? 50
        : Math.min(
            100,
            numberValue(
              work.profile.quotationAdvancePercent,
            ),
          ),
    paymentTerms:
      work.profile.quotationPaymentTerms?.trim() ||
      'Balance payment as mutually agreed before or on the event date.',
    terms:
      DEFAULT_TERMS,
    notes: '',
  };
}

export default function QuotationPage() {
  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null,
    );

  const [
    work,
    setWork,
  ] =
    useState<WorkState | null>(
      null,
    );

  const [
    quotation,
    setQuotation,
  ] =
    useState<ClientQuotationData | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    pdfBusy,
    setPdfBusy,
  ] =
    useState(false);

  const [
    internalPdfBusy,
    setInternalPdfBusy,
  ] =
    useState(false);

  const [
    groceryPdfBusy,
    setGroceryPdfBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    groceryRecipes,
    setGroceryRecipes,
  ] =
    useState<GroceryRecipe[]>([]);

  const [
    groceryRates,
    setGroceryRates,
  ] =
    useState<GroceryIngredientRate[]>([]);

  const [
    gasMaster,
    setGasMaster,
  ] =
    useState<GasCostMaster>(
      () =>
        defaultGasCostMaster(),
    );

  const [
    detailsLoading,
    setDetailsLoading,
  ] =
    useState(false);

  const [
    detailsWarning,
    setDetailsWarning,
  ] =
    useState('');

  const [
    targetGrossMargin,
    setTargetGrossMargin,
  ] =
    useState(40);

  useEffect(() => {
    const current =
      getSession();

    setSession(current);

    if (
      current?.role ===
      'CLIENT'
    ) {
      void bootstrap(
        current,
      );
    } else {
      setLoading(false);
    }
  }, []);

  async function bootstrap(
    current: Session,
  ) {
    setLoading(true);
    setError('');

    try {
      let currentWork =
        loadWork(
          current.tenantId,
        );

      const params =
        new URLSearchParams(
          window.location.search,
        );

      const costingId =
        params.get(
          'costingId',
        );

      if (
        costingId &&
        costingId !==
          currentWork.costingId
      ) {
        const response =
          await fetch(
            `/api/client/costings?costingId=${encodeURIComponent(
              costingId,
            )}`,
            {
              cache:
                'no-store',
            },
          );

        if (response.ok) {
          const data =
            await response.json();

          if (
            data.costing
              ?.snapshot
          ) {
            currentWork =
              data.costing
                .snapshot as WorkState;
          }
        }
      }

      setWork(
        currentWork,
      );

      void loadEventDetails(
        currentWork,
      );

      const quoteResponse =
        await fetch(
          `/api/client/quotations?costingId=${encodeURIComponent(
            currentWork.costingId,
          )}`,
          {
            cache:
              'no-store',
          },
        );

      if (
        quoteResponse.ok
      ) {
        const data =
          await quoteResponse.json();

        if (data.quotation) {
          const saved =
            data.quotation as SavedQuotation;

          setQuotation({
            quotationNumber:
              saved.quotationNumber,
            status:
              saved.status,
            clientName:
              saved.clientName,
            clientPhone:
              saved.clientPhone,
            eventName:
              saved.eventName,
            eventDate:
              saved.eventDate,
            venue:
              saved.venue,
            city:
              saved.city,
            totalCovers:
              saved.totalCovers,
            pricePerCover:
              saved.pricePerCover,
            includeTotal:
              saved.includeTotal,
            subtotal:
              saved.subtotal,
            gstPercent:
              saved.gstPercent,
            gstAmount:
              saved.gstAmount,
            extraLabel:
              saved.extraLabel,
            extraAmount:
              saved.extraAmount,
            grandTotal:
              saved.grandTotal,
            validityDays:
              saved.validityDays,
            advancePercent:
              saved.advancePercent,
            paymentTerms:
              saved.paymentTerms,
            terms:
              Array.isArray(
                saved.terms,
              )
                ? saved.terms
                : DEFAULT_TERMS,
            notes:
              saved.notes,
          });

          return;
        }
      }

      setQuotation(
        emptyQuotation(
          currentWork,
        ),
      );
    } catch {
      setError(
        'Could not load quotation data.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEventDetails(
    currentWork: WorkState,
  ) {
    setDetailsLoading(true);
    setDetailsWarning('');

    try {
      const [
        recipeResponse,
        ingredientResponse,
        gasResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/recipe-ingredients',
            {
              method: 'POST',
              cache: 'no-store',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  dishNames:
                    currentWork.menu.map(
                      (item) =>
                        item.name,
                    ),
                }),
            },
          ),
          fetch(
            `/api/client/ingredients?city=${encodeURIComponent(currentWork.event.city || currentWork.profile.city || '')}`,
            {
              cache: 'no-store',
            },
          ),
          fetch(
            '/api/client/gas-cost',
            {
              cache: 'no-store',
            },
          ),
        ]);

      const recipeData =
        await recipeResponse.json();
      const ingredientData =
        await ingredientResponse.json();
      const gasData =
        await gasResponse.json();

      if (
        !recipeResponse.ok ||
        !ingredientResponse.ok ||
        !gasResponse.ok
      ) {
        throw new Error(
          'Some grocery details could not be loaded.',
        );
      }

      setGroceryRecipes(
        Array.isArray(
          recipeData.recipes,
        )
          ? recipeData.recipes
          : [],
      );

      setGroceryRates(
        Array.isArray(
          ingredientData.rates,
        )
          ? ingredientData.rates
          : [],
      );

      setGasMaster(
        gasData as GasCostMaster,
      );
    } catch {
      setGroceryRecipes([]);
      setGroceryRates([]);
      setGasMaster(
        defaultGasCostMaster(),
      );
      setDetailsWarning(
        'Grocery quantities are unavailable for some dishes because recipe data could not be loaded.',
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  function patch(
    values: Partial<ClientQuotationData>,
  ) {
    setQuotation(
      (current) => {
        if (!current) return current;

        const next = {
          ...current,
          ...values,
        };

        const subtotal =
          numberValue(
            next.pricePerCover,
          ) *
          numberValue(
            next.totalCovers,
          );

        const gstAmount =
          subtotal *
          (numberValue(
            next.gstPercent,
          ) /
            100);

        const grandTotal =
          subtotal +
          gstAmount +
          numberValue(
            next.extraAmount,
          );

        return {
          ...next,
          subtotal,
          gstAmount,
          grandTotal,
        };
      },
    );
  }

  function commitInternalWork(
    next: WorkState,
  ) {
    if (!session) return;

    setWork(next);
    saveWork(
      session.tenantId,
      next,
    );
  }

  function patchManpowerRow(
    rowId: string,
    values: Partial<WorkState['manpower'][number]>,
  ) {
    if (!work) return;

    commitInternalWork({
      ...work,
      manpower:
        work.manpower.map(
          (row) =>
            row.id === rowId
              ? {
                  ...row,
                  ...values,
                  manualOverride: true,
                  rateManualOverride:
                    values.rate === undefined
                      ? row.rateManualOverride
                      : true,
                }
              : row,
        ),
    });
  }

  function addManpowerRow() {
    if (!work) return;

    commitInternalWork({
      ...work,
      manpower: [
        ...work.manpower,
        {
          id: uid('quote_manpower'),
          role: 'New Role',
          quantity: 1,
          rate: 0,
          customRole: true,
          manualOverride: true,
          rateManualOverride: true,
          rateMode: 'PER_MEAL',
        },
      ],
    });
  }

  function removeManpowerRow(
    rowId: string,
  ) {
    if (!work) return;

    const row =
      work.manpower.find(
        (item) =>
          item.id === rowId,
      );

    if (row?.customRole) {
      commitInternalWork({
        ...work,
        manpower:
          work.manpower.filter(
            (item) =>
              item.id !== rowId,
          ),
      });
      return;
    }

    patchManpowerRow(
      rowId,
      {
        quantity: 0,
      },
    );
  }

  function patchDisposableRow(
    rowId: string,
    values: Partial<WorkState['disposableItems'][number]>,
  ) {
    if (!work) return;

    const disposableItems =
      work.disposableItems.map(
        (row) =>
          row.id === rowId
            ? {
                ...row,
                ...values,
              }
            : row,
      );

    const disposableTotal =
      calculateDisposableCost(
        disposableItems,
      ).total;

    commitInternalWork({
      ...work,
      disposableItems,
      extras: {
        ...work.extras,
        disposable:
          disposableTotal,
      },
    });
  }

  function addDisposableRow() {
    if (!work) return;

    const disposableItems = [
      ...work.disposableItems,
      {
        id: uid(
          'quote_disposable',
        ),
        name: 'New Item',
        unit: 'pcs',
        quantity: 1,
        unitCost: 0,
      },
    ];

    commitInternalWork({
      ...work,
      disposableItems,
      extras: {
        ...work.extras,
        disposable:
          calculateDisposableCost(
            disposableItems,
          ).total,
      },
    });
  }

  function removeDisposableRow(
    rowId: string,
  ) {
    if (!work) return;

    const disposableItems =
      work.disposableItems.filter(
        (row) =>
          row.id !== rowId,
      );

    commitInternalWork({
      ...work,
      disposableItems,
      extras: {
        ...work.extras,
        disposable:
          calculateDisposableCost(
            disposableItems,
          ).total,
      },
    });
  }

  function patchExtraCost(
    field:
      | 'transport'
      | 'gasFuel'
      | 'other',
    value: number,
  ) {
    if (!work) return;

    commitInternalWork({
      ...work,
      extras: {
        ...work.extras,
        [field]:
          numberValue(value),
      },
    });
  }

  function applySellingRate(
    rate: number,
  ) {
    if (!work) return;

    const nextRate =
      Math.max(
        0,
        Number(rate) || 0,
      );

    commitInternalWork({
      ...work,
      sellingPricePerPlate:
        nextRate,
    });

    patch({
      pricePerCover:
        nextRate,
    });
  }

  const menuGroups =
    useMemo(() => {
      if (!work) return [];

      const groups =
        new Map<
          string,
          {
            label: string;
            pax: number;
            dishes: string[];
          }
        >();

      work.menu.forEach(
        (item) => {
          const label = [
            item.dayLabel,
            item.mealLabel,
          ]
            .filter(Boolean)
            .join(' · ') ||
            'Menu';

          const key =
            item.serviceId ||
            label;

          const existing =
            groups.get(key);

          if (existing) {
            existing.dishes.push(
              item.name,
            );
            existing.pax =
              Math.max(
                existing.pax,
                Number(
                  item.servicePax,
                ) || 0,
              );
          } else {
            groups.set(key, {
              label,
              pax:
                Number(
                  item.servicePax,
                ) ||
                Number(
                  work.event.pax,
                ) ||
                0,
              dishes: [
                item.name,
              ],
            });
          }
        },
      );

      return Array.from(
        groups.values(),
      );
    }, [work]);

  const groceryPlan =
    useMemo(
      () =>
        work
          ? buildFunctionGroceryPlan(
              work,
              groceryRecipes,
              groceryRates,
            )
          : null,
      [
        work,
        groceryRecipes,
        groceryRates,
      ],
    );

  const gasBreakdown =
    useMemo(
      () =>
        work
          ? calculateEventGas(
              work,
              gasMaster,
            )
          : null,
      [
        work,
        gasMaster,
      ],
    );

  const activeManpower =
    useMemo(
      () =>
        (
          work?.manpower ||
          []
        ).filter(
          (row) =>
            Number(
              row.quantity,
            ) > 0,
        ),
      [work],
    );

  const disposableSummary =
    useMemo(
      () =>
        calculateDisposableCost(
          work?.disposableItems ||
          [],
        ),
      [work],
    );

  const activeDisposable =
    useMemo(
      () =>
        disposableSummary.items.filter(
          (item) =>
            Number(
              item.quantity,
            ) > 0,
        ),
      [disposableSummary],
    );

  const operations =
    useMemo(
      () =>
        work
          ? normalizeOperationsState(
              work,
              (
                work as WorkWithOperations
              ).operations,
            )
          : null,
      [work],
    );

  const internalCosting =
    useMemo(() => {
      if (!work) {
        return {
          food: 0,
          manpower: 0,
          disposable: 0,
          transport: 0,
          gasFuel: 0,
          other: 0,
          total: 0,
        };
      }

      const result =
        calculate(work);

      const food =
        numberValue(
          result.menuFoodTotal,
        );

      const manpower =
        calculateManpowerCost(
          work.manpower,
        );

      const disposable =
        calculateDisposableCost(
          work.disposableItems,
        ).total ||
        numberValue(
          work.extras.disposable,
        );

      const transport =
        numberValue(
          work.extras.transport,
        );

      const gasFuel =
        numberValue(
          work.extras.gasFuel,
        );

      const other =
        numberValue(
          work.extras.other,
        );

      return {
        food,
        manpower,
        disposable,
        transport,
        gasFuel,
        other,
        total:
          food +
          manpower +
          disposable +
          transport +
          gasFuel +
          other,
      };
    }, [work]);

  const costingCovers =
    Math.max(
      0,
      numberValue(
        quotation?.totalCovers,
      ) ||
        numberValue(
          work
            ? calculate(
                work,
              ).totalCovers
            : 0,
        ) ||
        numberValue(
          work?.event.pax,
        ),
    );

  const internalCostPerCover =
    costingCovers > 0
      ? internalCosting.total /
        costingCovers
      : 0;

  const safeTargetMargin =
    Math.min(
      95,
      Math.max(
        0,
        numberValue(
          targetGrossMargin,
        ),
      ),
    );

  const suggestedSellingRate =
    internalCostPerCover > 0
      ? internalCostPerCover /
        (1 -
          safeTargetMargin /
            100)
      : 0;

  const currentSellingRate =
    numberValue(
      quotation?.pricePerCover,
    );

  const currentRevenue =
    currentSellingRate *
    costingCovers;

  const currentProfit =
    currentRevenue -
    internalCosting.total;

  const currentGrossMargin =
    currentRevenue > 0
      ? (
          currentProfit /
          currentRevenue
        ) *
        100
      : 0;

  const quotationReadyChecks =
    quotation
      ? [
          Boolean(
            quotation.clientName.trim(),
          ),
          Boolean(
            quotation.eventName.trim(),
          ),
          quotation.totalCovers > 0,
        ]
      : [
          false,
          false,
          false,
        ];

  const quotationReadyCount =
    quotationReadyChecks.filter(
      Boolean,
    ).length;

  const quotationReadinessPercent =
    Math.round(
      (
        quotationReadyCount /
        Math.max(
          1,
          quotationReadyChecks.length,
        )
      ) *
        100,
    );

  const quotationReady =
    quotationReadyCount ===
      quotationReadyChecks.length &&
    !detailsLoading;

  const advanceAmount =
    quotation
      ? (
          quotation.grandTotal *
          Math.min(
            100,
            Math.max(
              0,
              Number(
                quotation.advancePercent,
              ) || 0,
            ),
          )
        ) /
        100
      : 0;

  const balanceAmount =
    quotation
      ? Math.max(
          0,
          quotation.grandTotal -
            advanceAmount,
        )
      : 0;

  const quotationStatusStep =
    quotation?.status === 'ACCEPTED'
      ? 3
      : quotation?.status === 'SENT'
        ? 2
        : quotation?.status === 'REJECTED'
          ? 2
          : quotation?.quotationNumber
            ? 1
            : 0;

  const totalManpowerPeople =
    activeManpower.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(
            row.quantity,
          ) || 0,
        ),
      0,
    );

  async function save(
    status =
      quotation?.status ||
      'DRAFT',
  ) {
    if (
      !work ||
      !quotation
    ) {
      return null;
    }

    if (detailsLoading) {
      setError(
        'Please wait while complete event details finish loading.',
      );
      return null;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/client/quotations',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                ...quotation,
                status,
                costingId:
                  work.costingId,
                publicSnapshot: {
                  profile:
                    work.profile,
                  event:
                    work.event,
                  menu:
                    work.menu.map(
                      (item) => ({
                        name:
                          item.name,
                        category:
                          item.category,
                        dayLabel:
                          item.dayLabel,
                        mealLabel:
                          item.mealLabel,
                        serviceId:
                          item.serviceId,
                        servicePax:
                          item.servicePax,
                      }),
                    ),
                  grocery:
                    groceryPlan
                      ? {
                          combinedItems:
                            groceryPlan.combinedItems.map(
                              (item) => ({
                                name:
                                  item.name,
                                quantity:
                                  item.quantity,
                                unit:
                                  item.unit,
                                dishes:
                                  item.dishes,
                              }),
                            ),
                          unmatchedDishes:
                            groceryPlan.unmatchedDishes,
                        }
                      : null,
                  manpower:
                    activeManpower.map(
                      (row) => ({
                        role:
                          row.role,
                        quantity:
                          row.quantity,
                        dayLabel:
                          row.dayLabel,
                        mealLabel:
                          row.mealLabel,
                      }),
                    ),
                  disposable:
                    activeDisposable.map(
                      (item) => ({
                        name:
                          item.name,
                        quantity:
                          item.quantity,
                        unit:
                          item.unit || 'pcs',
                      }),
                    ),
                  operations:
                    operations,
                },
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save quotation',
        );
      }

      const saved =
        data.quotation as SavedQuotation;

      setQuotation(
        (current) =>
          current
            ? {
                ...current,
                quotationNumber:
                  saved.quotationNumber,
                status:
                  saved.status,
              }
            : current,
      );

      setMessage(
        status === 'SENT'
          ? 'Quotation marked as sent.'
          : status ===
              'ACCEPTED'
            ? 'Quotation marked as accepted.'
            : status ===
                'REJECTED'
              ? 'Quotation marked as rejected.'
              : 'Quotation saved.',
      );

      return saved;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save quotation.',
      );

      return null;
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    if (
      !work ||
      !quotation ||
      pdfBusy
    ) {
      return;
    }

    setPdfBusy(true);

    try {
      const saved =
        await save(
          quotation.status,
        );

      const quoteForPdf = {
        ...quotation,
        quotationNumber:
          saved
            ?.quotationNumber ||
          quotation.quotationNumber ||
          'DRAFT',
      };

      const {
        downloadClientQuotationPdf,
      } =
        await import(
          '../../../lib/clientQuotationPdf'
        );

      downloadClientQuotationPdf(
        work,
        quoteForPdf,
        groceryPlan,
      );
    } finally {
      setPdfBusy(false);
    }
  }

  async function downloadInternalCostingPdf() {
    if (
      !work ||
      internalPdfBusy ||
      detailsLoading
    ) {
      return;
    }

    setInternalPdfBusy(true);
    setError('');

    try {
      const {
        downloadInternalEventCostingPdf,
      } =
        await import(
          '../../../lib/internalEventCostingPdf'
        );

      downloadInternalEventCostingPdf(
        work,
        groceryPlan,
        gasBreakdown,
      );
    } catch {
      setError(
        'Could not prepare the internal costing PDF.',
      );
    } finally {
      setInternalPdfBusy(false);
    }
  }

  async function downloadGroceryPdf() {
    if (
      !work ||
      !groceryPlan ||
      groceryPdfBusy ||
      detailsLoading
    ) {
      return;
    }

    setGroceryPdfBusy(true);
    setError('');

    try {
      const {
        downloadGroceryEventPdf,
      } =
        await import(
          '../../../lib/groceryEventPdf'
        );

      downloadGroceryEventPdf(
        work,
        groceryPlan,
        gasBreakdown,
      );
    } catch {
      setError(
        'Could not prepare the grocery PDF.',
      );
    } finally {
      setGroceryPdfBusy(false);
    }
  }

  async function shareWhatsApp() {
    if (
      !work ||
      !quotation
    ) {
      return;
    }

    const saved =
      await save('SENT');

    if (!saved) {
      return;
    }

    const businessName =
      work.profile
        .businessName ||
      'Our catering team';

    const totalLine =
      quotation.includeTotal
        ? `\nTotal quotation: ${money(
            quotation.grandTotal,
          )}`
        : '';

    const text = [
      `Hello ${
        quotation.clientName ||
        'Sir/Madam'
      },`,
      '',
      `Thank you for considering ${businessName}.`,
      '',
      `Quotation: ${saved.quotationNumber}`,
      quotation.eventName
        ? `Event: ${quotation.eventName}`
        : '',
      quotation.eventDate
        ? `Date: ${quotation.eventDate}`
        : '',
      quotation.totalCovers
        ? `Guests/Covers: ${quotation.totalCovers.toLocaleString(
            'en-IN',
          )}`
        : '',
      `Rate: ${money(
        quotation.pricePerCover,
      )} per cover${totalLine}`,
      '',
      'I am sharing the quotation PDF with you. Please review it and let us know if you would like to confirm the booking.',
      '',
      businessName,
      work.profile.phone || '',
    ]
      .filter(Boolean)
      .join('\n');

    const phone =
      quotation.clientPhone
        .replace(/\D/g, '');

    const target =
      phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(
            text,
          )}`
        : `https://wa.me/?text=${encodeURIComponent(
            text,
          )}`;

    window.open(
      target,
      '_blank',
      'noopener,noreferrer',
    );
  }

  if (loading) {
    return (
      <AppShell
        title="Quotation"
        subtitle="Client-facing quotation"
      >
        <div className="glass-card">
          Loading quotation…
        </div>
      </AppShell>
    );
  }

  if (
    !session ||
    !work ||
    !quotation
  ) {
    return (
      <AppShell
        title="Quotation"
        subtitle="Client-facing quotation"
      >
        <div className="glass-card">
          <h2>
            No costing selected
          </h2>
          <p className="muted">
            Open a costing first, then create its client quotation.
          </p>
          <Link
            className="primary-button"
            href="/app/event?resume=1"
          >
            Open Costing
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Quotation"
      subtitle="Prepare, review and send the final client quotation"
      hidePageTitle
    >
      <section className="quote-page quotation-page-modern">
        <div className="quotation-command-overview no-print">
          <div className="quotation-command-copy">
            <span className="page-eyebrow">
              Client quotation command center
            </span>
            <h2>
              {quotation.quotationNumber
                ? `Quotation ${quotation.quotationNumber}`
                : 'Prepare a client-ready quotation'}
            </h2>
            <p>
              {quotation.clientName || 'Client name pending'}
              {' · '}
              {quotation.eventName || 'Event name pending'}
              {' · '}
              {menuGroups.length} {menuGroups.length === 1 ? 'function' : 'functions'}
            </p>

            <div className="quotation-command-kpis">
              <article>
                <span>Functions</span>
                <b>{menuGroups.length}</b>
                <small>Client service schedule</small>
              </article>

              <article>
                <span>Dishes</span>
                <b>{work.menu.length}</b>
                <small>Across all functions</small>
              </article>

              <article>
                <span>Covers</span>
                <b>{quotation.totalCovers.toLocaleString('en-IN')}</b>
                <small>Guest / meal covers</small>
              </article>

              <article>
                <span>Manpower</span>
                <b>{totalManpowerPeople}</b>
                <small>Planned execution team</small>
              </article>

              <article>
                <span>Disposable</span>
                <b>{activeDisposable.length}</b>
                <small>Planned client items</small>
              </article>
            </div>
          </div>

          <aside className="quotation-command-side">
            <div
              className="quotation-readiness-ring"
              style={{
                background:
                  `conic-gradient(${quotationReadinessPercent === 100 ? '#55d98f' : '#4a9cff'} ${quotationReadinessPercent * 3.6}deg, #25303d 0deg)`,
              }}
              aria-label={`Quotation readiness ${quotationReadinessPercent}%`}
            >
              <span>
                <b>{quotationReadinessPercent}%</b>
                <small>Ready</small>
              </span>
            </div>

            <div className="quotation-command-total">
              <span>Quotation status</span>
              <b>{quotation.status || 'DRAFT'}</b>
              <small>
                {quotation.quotationNumber
                  ? quotation.quotationNumber
                  : 'Not saved yet'}
              </small>

              <button
                className="primary-button"
                type="button"
                disabled={saving || !quotationReady}
                onClick={() =>
                  void shareWhatsApp()
                }
              >
                Share on WhatsApp
              </button>
            </div>
          </aside>
        </div>

        <section className="quotation-status-flow quotation-workflow-flow no-print">
          {[
            ['Draft', 0],
            ['Saved', 1],
            ['Sent', 2],
            ['Accepted', 3],
          ].map(([label, step]) => (
            <div
              className={
                quotationStatusStep >= Number(step)
                  ? 'is-complete'
                  : ''
              }
              key={String(label)}
            >
              <i aria-hidden="true">
                {quotationStatusStep > Number(step)
                  ? '✓'
                  : Number(step) + 1}
              </i>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className="quotation-readiness-strip no-print">
          <article className={quotation.clientName.trim() ? 'ready' : 'attention'}>
            <span>Client</span>
            <b>{quotation.clientName.trim() ? 'Ready' : 'Missing'}</b>
            <small>{quotation.clientName || 'Add client name'}</small>
          </article>

          <article className={quotation.eventName.trim() ? 'ready' : 'attention'}>
            <span>Event</span>
            <b>{quotation.eventName.trim() ? 'Ready' : 'Missing'}</b>
            <small>{quotation.eventName || 'Add event name'}</small>
          </article>

          <article className={quotation.totalCovers > 0 ? 'ready' : 'attention'}>
            <span>Covers</span>
            <b>{quotation.totalCovers.toLocaleString('en-IN')}</b>
            <small>Guest / meal covers</small>
          </article>

          <article className={quotation.clientPhone.trim() ? 'ready' : ''}>
            <span>WhatsApp</span>
            <b>{quotation.clientPhone.trim() ? 'Added' : 'Optional'}</b>
            <small>{quotation.clientPhone || 'No number added'}</small>
          </article>

          <article className={quotation.terms.filter((term) => term.trim()).length > 0 ? 'ready' : 'attention'}>
            <span>Terms</span>
            <b>{quotation.terms.filter((term) => term.trim()).length}</b>
            <small>Client terms</small>
          </article>
        </section>

        <style>{`
          .quotation-command-overview{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.48fr);gap:18px;align-items:center;padding:18px 20px;border:1px solid #2a3542;border-radius:18px;background:radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),linear-gradient(145deg,#111923,#0d141c);box-shadow:0 14px 34px rgba(0,0,0,.16)}.quotation-command-copy h2{margin:7px 0 6px;font-size:clamp(28px,3.4vw,40px);line-height:1.04;letter-spacing:-.045em}.quotation-command-copy>p{margin:0;color:#8b98a9;font-size:10px}.quotation-command-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:14px}.quotation-command-kpis article{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:rgba(255,255,255,.022)}.quotation-command-kpis span,.quotation-command-kpis b,.quotation-command-kpis small{display:block}.quotation-command-kpis span{color:#718094;font-size:7px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.quotation-command-kpis b{overflow:hidden;margin-top:5px;color:#e7eef6;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.quotation-command-kpis small{margin-top:3px;color:#68778a;font-size:7px}.quotation-command-side{display:grid;grid-template-columns:78px minmax(0,1fr);gap:13px;align-items:center;padding:13px;border:1px solid rgba(74,156,255,.15);border-radius:15px;background:rgba(74,156,255,.04)}.quotation-readiness-ring{display:grid;width:74px;height:74px;padding:6px;place-items:center;border-radius:50%}.quotation-readiness-ring>span{display:grid;width:100%;height:100%;place-items:center;border:1px solid rgba(255,255,255,.05);border-radius:50%;background:#0f161e}.quotation-readiness-ring b,.quotation-readiness-ring small{display:block;line-height:1}.quotation-readiness-ring b{color:#eef5fc;font-size:17px}.quotation-readiness-ring small{margin-top:-10px;color:#748397;font-size:6px;font-weight:900;text-transform:uppercase}.quotation-command-total>span,.quotation-command-total>b,.quotation-command-total>small{display:block}.quotation-command-total>span{color:#8fc2ff;font-size:7px;font-weight:900;text-transform:uppercase}.quotation-command-total>b{margin:4px 0;color:#f4f8fc;font-size:24px;letter-spacing:-.04em}.quotation-command-total>small{color:#7d8b9d;font-size:8px}.quotation-command-total .primary-button{width:100%;margin-top:9px}.quotation-status-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.quotation-status-flow>div{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #29333f;border-radius:11px;color:#69778a;background:#0f151c;font-size:8px;font-weight:850}.quotation-status-flow i{display:grid;width:21px;height:21px;place-items:center;border:1px solid #34404d;border-radius:50%;font-style:normal;font-size:7px}.quotation-status-flow .is-complete{color:#9ce4bb;border-color:rgba(85,217,143,.15);background:rgba(85,217,143,.035)}.quotation-status-flow .is-complete i{border-color:rgba(85,217,143,.25);color:#9ce4bb}.quotation-readiness-strip{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.quotation-readiness-strip article{min-width:0;padding:10px;border:1px solid #29333f;border-radius:11px;background:linear-gradient(180deg,#101720,#0d141b)}.quotation-readiness-strip article.ready{border-color:rgba(85,217,143,.15);background:rgba(85,217,143,.035)}.quotation-readiness-strip article.attention{border-color:rgba(244,173,84,.18);background:rgba(244,173,84,.045)}.quotation-readiness-strip span,.quotation-readiness-strip b,.quotation-readiness-strip small{display:block}.quotation-readiness-strip span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}.quotation-readiness-strip b{margin:4px 0;color:#e8eef5;font-size:12px}.quotation-readiness-strip small{overflow:hidden;color:#68778a;font-size:7px;text-overflow:ellipsis;white-space:nowrap}          .quote-page{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:14px;align-items:start}.quote-main,.quote-preview{display:grid;gap:14px}.quote-preview{position:sticky;top:86px}.quote-card{padding:19px;border:1px solid #29313c;border-radius:17px;background:#10151c}.quote-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.quote-heading h2{margin:4px 0 5px;font-size:19px;letter-spacing:-.03em}.quote-heading p{margin:0;color:#929dac;font-size:11px;line-height:1.5}.quote-number{padding:6px 8px;border-radius:999px;color:#8fc2ff;background:rgba(74,156,255,.1);font-size:9px;font-weight:900}.quote-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.quote-field{display:grid;gap:6px}.quote-field.full{grid-column:1/-1}.quote-field label{color:#aeb8c5;font-size:10px;font-weight:850}.quote-input,.quote-textarea,.quote-select{width:100%;border:1px solid #303844;border-radius:10px;outline:0;color:#eef2f6;background:#151b23;font:inherit;font-size:13px;color-scheme:dark}.quote-input,.quote-select{min-height:43px;padding:0 11px}.quote-textarea{min-height:90px;padding:11px;resize:vertical}.quote-input:focus,.quote-textarea:focus,.quote-select:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 4px rgba(74,156,255,.07)}.quote-commercial{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.quote-total{padding:13px;border:1px solid rgba(74,156,255,.17);border-radius:12px;background:rgba(74,156,255,.05)}.quote-total small,.quote-total strong{display:block}.quote-total small{color:#8492a3;font-size:9px;text-transform:uppercase}.quote-total strong{margin-top:4px;font-size:17px}.quote-term{display:flex;gap:8px;margin-top:8px}.quote-term input{flex:1}.quote-term button{width:38px;border:1px solid #3a3034;border-radius:9px;color:#ff8d86;background:rgba(255,98,89,.06);cursor:pointer}.quote-actions{display:flex;flex-wrap:wrap;gap:7px}.quote-actions button,.quote-actions a{min-height:42px;font-size:11px}.quote-preview-sheet{padding:24px;border:1px solid #dfe5ec;border-radius:15px;color:#172033;background:#fff;box-shadow:0 20px 55px rgba(0,0,0,.24)}.quote-preview-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:15px;border-bottom:1px solid #e7ebf0}.quote-preview-head b{font-size:16px}.quote-preview-head span{display:block;margin-top:3px;color:#758195;font-size:8px}.quote-preview-head>div:last-child{text-align:right}.quote-preview-client{display:grid;grid-template-columns:1fr 1fr;gap:15px;padding:15px 0}.quote-preview-client small{display:block;color:#8792a2;font-size:7px;text-transform:uppercase}.quote-preview-client b{display:block;margin-top:3px;font-size:10px}.quote-preview-menu{border-top:1px solid #e7ebf0;padding-top:12px}.quote-preview-menu h3,.quote-preview-commercial h3{margin:0 0 8px;font-size:10px}.quote-preview-group{margin-bottom:8px}.quote-preview-group b{font-size:9px}.quote-preview-group p{margin:3px 0 0;color:#596579;font-size:8px;line-height:1.45}.quote-preview-commercial{margin-top:12px;padding-top:12px;border-top:1px solid #e7ebf0}.quote-preview-price{display:flex;justify-content:space-between;gap:10px;margin-top:5px;color:#526074;font-size:8px}.quote-preview-price.total{margin-top:8px;padding-top:7px;border-top:1px solid #dfe5ec;color:#172033;font-size:10px;font-weight:900}.quote-detail-section{display:grid;gap:9px;margin-top:18px;padding-top:16px;border-top:1px solid #29313c}.quote-detail-section h3{margin:0;font-size:13px}.quote-detail-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.quote-detail-section-head>span{color:#8fc2ff;font-size:10px;font-weight:800}.quote-detail-block{padding:10px 11px;border:1px solid #29313c;border-radius:11px;background:#151b23}.quote-detail-block-head{display:flex;justify-content:space-between;gap:10px}.quote-detail-block-head>b{font-size:12px}.quote-detail-block-head>span{color:#8fc2ff;font-size:9px}.quote-detail-block p{margin:6px 0 0;color:#aab4c2;font-size:10px;line-height:1.5}.quote-detail-table{display:grid;border:1px solid #29313c;border-radius:11px;overflow:hidden}.quote-detail-row{display:grid;grid-template-columns:minmax(140px,.8fr) minmax(100px,.45fr) minmax(180px,1.2fr);gap:10px;align-items:start;padding:8px 10px;border-top:1px solid #252d37;font-size:10px}.quote-detail-row:first-child{border-top:0}.quote-detail-row.is-head{color:#9eabba;background:#151b23;font-size:9px;text-transform:uppercase}.quote-detail-row>span,.quote-detail-row>b{min-width:0;overflow-wrap:anywhere}.quote-detail-row.manpower{grid-template-columns:minmax(150px,1fr) minmax(120px,.75fr) 55px}.quote-detail-row.disposable{grid-template-columns:minmax(180px,1fr) 100px}.quote-detail-row.operations{grid-template-columns:minmax(140px,.8fr) minmax(110px,.6fr) minmax(180px,1.1fr)}.quote-detail-warning{padding:9px 10px;border:1px solid rgba(245,158,11,.18);border-radius:10px;color:#facc15;background:rgba(245,158,11,.06);font-size:10px;line-height:1.45}.quote-safe{padding:11px 12px;border:1px solid rgba(61,220,132,.16);border-radius:10px;color:#8ed7aa;background:rgba(61,220,132,.05);font-size:10px;line-height:1.45}.quote-message{padding:10px;border-radius:10px;font-size:10px}.quote-message.ok{color:#79c99a;background:rgba(61,220,132,.06)}.quote-message.error{color:#ff938c;background:rgba(255,98,89,.06)}
.quote-internal-costing{border-color:rgba(196,145,45,.22);background:linear-gradient(180deg,#111820,#0f151c)}
.quote-cost-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:16px}
.quote-cost-summary article{min-width:0;padding:10px;border:1px solid #29333f;border-radius:11px;background:#151b23}
.quote-cost-summary span,.quote-cost-summary b,.quote-cost-summary small{display:block}
.quote-cost-summary span{color:#8f9baa;font-size:8px;font-weight:900;text-transform:uppercase}
.quote-cost-summary b{margin:5px 0;color:#f1f5f8;font-size:15px}
.quote-cost-summary small{color:#6f7c8c;font-size:7px;line-height:1.35}
.quote-cost-section{margin-top:16px;padding-top:15px;border-top:1px solid #29313c}
.quote-cost-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.quote-cost-section-head>div{display:flex;align-items:center;gap:9px}
.quote-cost-section-head>div>span{display:grid;width:28px;height:28px;place-items:center;border-radius:8px;color:#d7aa55;background:rgba(196,145,45,.10);font-size:8px;font-weight:900}
.quote-cost-section-head b,.quote-cost-section-head small{display:block}
.quote-cost-section-head b{font-size:12px}
.quote-cost-section-head small{margin-top:2px;color:#7f8b9a;font-size:8px}
.quote-cost-section-head strong{font-size:14px}
.quote-cost-auto{display:flex;justify-content:space-between;gap:10px;margin-top:10px;padding:11px;border:1px solid #29333f;border-radius:10px;color:#8c98a7;background:#151b23;font-size:9px}
.quote-cost-auto b{color:#e8edf3}
.quote-cost-table{display:grid;gap:6px;margin-top:10px}
.quote-cost-row{display:grid;grid-template-columns:minmax(150px,1fr) 72px 96px 95px 34px;gap:6px;align-items:center}
.quote-cost-row.head{padding:0 4px;color:#738194;font-size:7px;font-weight:900;text-transform:uppercase}
.quote-cost-row .quote-input{min-height:37px;font-size:11px}
.quote-cost-row>b{text-align:right;font-size:10px}
.quote-cost-remove{width:32px;height:32px;border:1px solid #433036;border-radius:8px;color:#ff8d86;background:rgba(255,98,89,.05);cursor:pointer}
.quote-cost-empty{padding:13px;border:1px dashed #303945;border-radius:9px;color:#778596;text-align:center;font-size:9px}
.quote-cost-extra-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.quote-cost-extra-grid label{display:grid;gap:5px;color:#9aa6b5;font-size:9px;font-weight:800}
.quote-cost-final{display:grid;grid-template-columns:1.2fr .7fr .9fr .9fr;gap:8px;align-items:stretch;margin-top:18px;padding:12px;border:1px solid rgba(196,145,45,.20);border-radius:13px;background:rgba(196,145,45,.045)}
.quote-cost-final>div,.quote-cost-final>label{display:grid;align-content:center;gap:5px;min-width:0}
.quote-cost-final span{color:#8f9baa;font-size:8px;font-weight:900;text-transform:uppercase}
.quote-cost-final b{font-size:16px}
.quote-cost-final small{color:#788595;font-size:8px}
.quote-cost-final-main b{color:#f5d890;font-size:23px}
.quote-cost-final .primary-button{min-height:34px;padding:0 10px;font-size:9px}
.quote-profit-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}
.quote-profit-strip>div{padding:10px;border:1px solid #29333f;border-radius:10px;background:#151b23}
.quote-profit-strip span,.quote-profit-strip b{display:block}
.quote-profit-strip span{color:#7e8b9b;font-size:8px;text-transform:uppercase}
.quote-profit-strip b{margin-top:4px;font-size:14px}
.quote-profit-strip .positive b{color:#82dda9}
.quote-profit-strip .negative b{color:#ff9189}
@media(max-width:1180px){.quotation-command-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.quotation-readiness-strip{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1050px){.quotation-command-overview{grid-template-columns:1fr}.quotation-command-side{max-width:430px}.quote-page{grid-template-columns:1fr}.quote-preview{position:static}}@media(max-width:650px){.quote-cost-summary{grid-template-columns:1fr 1fr}.quote-cost-row{grid-template-columns:minmax(0,1fr) 62px 78px}.quote-cost-row.head{display:none}.quote-cost-row>b{grid-column:2/3;text-align:left}.quote-cost-remove{grid-column:3}.quote-cost-extra-grid{grid-template-columns:1fr}.quote-cost-final{grid-template-columns:1fr}.quote-profit-strip{grid-template-columns:1fr 1fr 1fr}.quotation-command-overview{padding:16px}.quotation-command-kpis{grid-template-columns:1fr 1fr}.quotation-command-side{grid-template-columns:62px minmax(0,1fr)}.quotation-readiness-ring{width:58px;height:58px}.quotation-status-flow{grid-template-columns:1fr 1fr}.quotation-readiness-strip{grid-template-columns:1fr 1fr}.quote-detail-row,.quote-detail-row.manpower,.quote-detail-row.operations{grid-template-columns:1fr}.quote-detail-row.disposable{grid-template-columns:minmax(0,1fr) 90px}.quote-detail-section-head{align-items:flex-start;flex-direction:column}.quote-page,.quote-main,.quote-preview{gap:10px}.quote-card{padding:13px;border-radius:13px}.quote-grid,.quote-commercial{grid-template-columns:1fr;gap:8px;margin-top:12px}.quote-field.full{grid-column:auto}.quote-input,.quote-textarea,.quote-select{font-size:16px}.quote-preview-client{grid-template-columns:1fr}.quote-actions{display:grid;grid-template-columns:1fr 1fr}.quote-actions button,.quote-actions a{width:100%;min-height:44px}}
        `}</style>

        <div className="quote-main">
          <div className="quote-card quote-internal-costing no-print">
            <div className="quote-heading">
              <div>
                <span className="section-kicker">
                  Internal only
                </span>
                <h2>
                  Internal Costing
                </h2>
                <p>
                  Calculate the real event cost here. These numbers are never shown on the client quotation PDF.
                </p>
              </div>

              <span className="quote-number">
                {money(
                  internalCosting.total,
                )}
              </span>
            </div>

            <div className="quote-cost-summary">
              <article>
                <span>Food</span>
                <b>{money(internalCosting.food)}</b>
                <small>Auto from Menu Studio dish costs</small>
              </article>
              <article>
                <span>Manpower</span>
                <b>{money(internalCosting.manpower)}</b>
                <small>Quantity × rate</small>
              </article>
              <article>
                <span>Disposable</span>
                <b>{money(internalCosting.disposable)}</b>
                <small>Plastic / packing items</small>
              </article>
              <article>
                <span>Transport</span>
                <b>{money(internalCosting.transport)}</b>
                <small>Vehicle / delivery</small>
              </article>
              <article>
                <span>Other</span>
                <b>{money(internalCosting.gasFuel + internalCosting.other)}</b>
                <small>Gas + miscellaneous</small>
              </article>
            </div>

            <div className="quote-cost-section">
              <div className="quote-cost-section-head">
                <div>
                  <span>01</span>
                  <div>
                    <b>Food Cost</b>
                    <small>Calculated automatically from the current menu and guest count.</small>
                  </div>
                </div>
                <strong>{money(internalCosting.food)}</strong>
              </div>

              <div className="quote-cost-auto">
                <span>
                  {work.menu.length} dishes · {costingCovers.toLocaleString('en-IN')} covers
                </span>
                <b>
                  {costingCovers > 0
                    ? money(
                        internalCosting.food /
                          costingCovers,
                      )
                    : money(0)} / cover
                </b>
              </div>
            </div>

            <div className="quote-cost-section">
              <div className="quote-cost-section-head">
                <div>
                  <span>02</span>
                  <div>
                    <b>Manpower</b>
                    <small>Add only the staff you actually need for this event.</small>
                  </div>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={addManpowerRow}
                >
                  + Add Manpower
                </button>
              </div>

              <div className="quote-cost-table manpower">
                <div className="quote-cost-row head">
                  <span>Role</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Total</span>
                  <span />
                </div>

                {work.manpower
                  .filter(
                    (row) =>
                      Number(
                        row.quantity,
                      ) > 0 ||
                      row.customRole,
                  )
                  .map((row) => (
                    <div
                      className="quote-cost-row"
                      key={row.id}
                    >
                      <input
                        className="quote-input"
                        value={row.role}
                        onChange={(event) =>
                          patchManpowerRow(
                            row.id,
                            {
                              role:
                                event.target.value,
                            },
                          )
                        }
                      />
                      <input
                        className="quote-input"
                        type="number"
                        min="0"
                        value={
                          row.quantity ||
                          ''
                        }
                        onChange={(event) =>
                          patchManpowerRow(
                            row.id,
                            {
                              quantity:
                                numberValue(
                                  event.target.value,
                                ),
                            },
                          )
                        }
                      />
                      <input
                        className="quote-input"
                        type="number"
                        min="0"
                        value={
                          row.rate ||
                          ''
                        }
                        onChange={(event) =>
                          patchManpowerRow(
                            row.id,
                            {
                              rate:
                                numberValue(
                                  event.target.value,
                                ),
                            },
                          )
                        }
                      />
                      <b>
                        {money(
                          numberValue(
                            row.quantity,
                          ) *
                            numberValue(
                              row.rate,
                            ),
                        )}
                      </b>
                      <button
                        type="button"
                        className="quote-cost-remove"
                        aria-label={`Remove ${row.role}`}
                        onClick={() =>
                          removeManpowerRow(
                            row.id,
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {!work.manpower.some(
                  (row) =>
                    Number(
                      row.quantity,
                    ) > 0 ||
                    row.customRole,
                ) ? (
                  <div className="quote-cost-empty">
                    No manpower added yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="quote-cost-section">
              <div className="quote-cost-section-head">
                <div>
                  <span>03</span>
                  <div>
                    <b>Disposable / Plastic</b>
                    <small>Plate, bowl, spoon, glass, tissue, food box and other consumables.</small>
                  </div>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={addDisposableRow}
                >
                  + Add Item
                </button>
              </div>

              <div className="quote-cost-table disposable">
                <div className="quote-cost-row head">
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Total</span>
                  <span />
                </div>

                {work.disposableItems
                  .filter(
                    (row) =>
                      Number(
                        row.quantity,
                      ) > 0,
                  )
                  .map((row) => (
                    <div
                      className="quote-cost-row"
                      key={row.id}
                    >
                      <input
                        className="quote-input"
                        value={row.name}
                        onChange={(event) =>
                          patchDisposableRow(
                            row.id,
                            {
                              name:
                                event.target.value,
                            },
                          )
                        }
                      />
                      <input
                        className="quote-input"
                        type="number"
                        min="0"
                        value={
                          row.quantity ||
                          ''
                        }
                        onChange={(event) =>
                          patchDisposableRow(
                            row.id,
                            {
                              quantity:
                                numberValue(
                                  event.target.value,
                                ),
                            },
                          )
                        }
                      />
                      <input
                        className="quote-input"
                        type="number"
                        min="0"
                        value={
                          row.unitCost ||
                          ''
                        }
                        onChange={(event) =>
                          patchDisposableRow(
                            row.id,
                            {
                              unitCost:
                                numberValue(
                                  event.target.value,
                                ),
                            },
                          )
                        }
                      />
                      <b>
                        {money(
                          numberValue(
                            row.quantity,
                          ) *
                            numberValue(
                              row.unitCost,
                            ),
                        )}
                      </b>
                      <button
                        type="button"
                        className="quote-cost-remove"
                        aria-label={`Remove ${row.name}`}
                        onClick={() =>
                          removeDisposableRow(
                            row.id,
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {!work.disposableItems.some(
                  (row) =>
                    Number(
                      row.quantity,
                    ) > 0,
                ) ? (
                  <div className="quote-cost-empty">
                    No disposable / plastic items added yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="quote-cost-section">
              <div className="quote-cost-section-head">
                <div>
                  <span>04</span>
                  <div>
                    <b>Transport & Other Cost</b>
                    <small>Simple event-level costs. Add only what applies.</small>
                  </div>
                </div>
              </div>

              <div className="quote-cost-extra-grid">
                <label>
                  <span>Transport</span>
                  <input
                    className="quote-input"
                    type="number"
                    min="0"
                    value={
                      work.extras.transport ||
                      ''
                    }
                    onChange={(event) =>
                      patchExtraCost(
                        'transport',
                        numberValue(
                          event.target.value,
                        ),
                      )
                    }
                  />
                </label>

                <label>
                  <span>Gas / Fuel</span>
                  <input
                    className="quote-input"
                    type="number"
                    min="0"
                    value={
                      work.extras.gasFuel ||
                      ''
                    }
                    onChange={(event) =>
                      patchExtraCost(
                        'gasFuel',
                        numberValue(
                          event.target.value,
                        ),
                      )
                    }
                  />
                </label>

                <label>
                  <span>Other Cost</span>
                  <input
                    className="quote-input"
                    type="number"
                    min="0"
                    value={
                      work.extras.other ||
                      ''
                    }
                    onChange={(event) =>
                      patchExtraCost(
                        'other',
                        numberValue(
                          event.target.value,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div className="quote-cost-final">
              <div className="quote-cost-final-main">
                <span>Total Event Cost</span>
                <b>{money(internalCosting.total)}</b>
                <small>
                  {costingCovers.toLocaleString('en-IN')} covers · {money(internalCostPerCover)} cost / cover
                </small>
              </div>

              <label>
                <span>Target gross margin %</span>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  max="95"
                  value={targetGrossMargin}
                  onChange={(event) =>
                    setTargetGrossMargin(
                      Math.min(
                        95,
                        numberValue(
                          event.target.value,
                        ),
                      ),
                    )
                  }
                />
              </label>

              <div>
                <span>Suggested selling rate</span>
                <b>{money(suggestedSellingRate)}</b>
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    !(
                      suggestedSellingRate >
                      0
                    )
                  }
                  onClick={() =>
                    applySellingRate(
                      Math.ceil(
                        suggestedSellingRate /
                          5,
                      ) * 5,
                    )
                  }
                >
                  Use {money(
                    Math.ceil(
                      suggestedSellingRate /
                        5,
                    ) * 5,
                  )}
                </button>
              </div>

              <label>
                <span>Client selling rate / cover</span>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  value={
                    quotation.pricePerCover ||
                    ''
                  }
                  onChange={(event) =>
                    applySellingRate(
                      numberValue(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>
            </div>

            <div className="quote-profit-strip">
              <div>
                <span>Revenue</span>
                <b>{money(currentRevenue)}</b>
              </div>
              <div className={currentProfit >= 0 ? 'positive' : 'negative'}>
                <span>Profit</span>
                <b>{money(currentProfit)}</b>
              </div>
              <div className={currentGrossMargin >= 0 ? 'positive' : 'negative'}>
                <span>Gross Margin</span>
                <b>{currentGrossMargin.toFixed(1)}%</b>
              </div>
            </div>
          </div>

          <div className="quote-card quote-event-details-card quote-scope-card">
            <div className="quote-heading">
              <div>
                <span className="section-kicker">
                  Complete event plan
                </span>
                <h2>
                  A-to-Z Event Details
                </h2>
                <p>
                  Everything required to execute the event is carried into this quotation.
                </p>
              </div>

              <span className="quote-number">
                {menuGroups.length} function{menuGroups.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="quote-detail-section">
              <h3>Event, Functions & Menu</h3>

              {menuGroups.length ? (
                menuGroups.map(
                  (group) => (
                    <div
                      className="quote-detail-block"
                      key={`detail-${group.label}`}
                    >
                      <div className="quote-detail-block-head">
                        <b>{group.label}</b>
                        <span>
                          {group.pax > 0
                            ? `${group.pax.toLocaleString('en-IN')} guests`
                            : 'Guest count pending'}
                        </span>
                      </div>
                      <p>
                        {group.dishes.join(' · ')}
                      </p>
                    </div>
                  ),
                )
              ) : (
                <p className="muted">
                  No menu functions saved.
                </p>
              )}
            </div>

            <div className="quote-detail-section">
              <div className="quote-detail-section-head">
                <h3>Grocery Requirements</h3>
                <span>
                  {detailsLoading
                    ? 'Loading…'
                    : `${groceryPlan?.combinedItems.length || 0} ingredients`}
                </span>
              </div>

              {detailsLoading ? (
                <p className="muted">
                  Preparing grocery quantities from saved recipes…
                </p>
              ) : groceryPlan?.combinedItems.length ? (
                <div className="quote-detail-table">
                  <div className="quote-detail-row is-head">
                    <b>Ingredient</b>
                    <b>Required Qty</b>
                    <b>Used In</b>
                  </div>

                  {groceryPlan.combinedItems.map(
                    (item) => (
                      <div
                        className="quote-detail-row"
                        key={`quote-grocery-${item.name}-${item.unit}`}
                      >
                        <span>{item.name}</span>
                        <b>
                          {item.quantity
                            .toFixed(3)
                            .replace(/\.?0+$/, '')}{' '}
                          {item.unit}
                        </b>
                        <span>
                          {item.dishes.join(', ')}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="muted">
                  Grocery quantities will appear when saved recipes are available.
                </p>
              )}

              {groceryPlan?.unmatchedDishes.length ? (
                <div className="quote-detail-warning">
                  Recipe pending: {groceryPlan.unmatchedDishes.join(', ')}
                </div>
              ) : null}

              {detailsWarning ? (
                <div className="quote-detail-warning">
                  {detailsWarning}
                </div>
              ) : null}
            </div>

            <div className="quote-detail-section">
              <div className="quote-detail-section-head">
                <h3>Manpower Plan</h3>
                <span>
                  {activeManpower.reduce(
                    (sum, row) =>
                      sum +
                      Math.max(
                        0,
                        Number(
                          row.quantity,
                        ) || 0,
                      ),
                    0,
                  )}{' '}
                  assignments
                </span>
              </div>

              {activeManpower.length ? (
                <div className="quote-detail-table">
                  <div className="quote-detail-row manpower is-head">
                    <b>Function / Meal</b>
                    <b>Role</b>
                    <b>Qty</b>
                  </div>

                  {activeManpower.map(
                    (row) => (
                      <div
                        className="quote-detail-row manpower"
                        key={row.id}
                      >
                        <span>
                          {[
                            row.dayLabel,
                            row.mealLabel,
                          ]
                            .filter(Boolean)
                            .join(' · ') ||
                            'Event'}
                        </span>
                        <span>{row.role}</span>
                        <b>
                          {Math.max(
                            0,
                            Number(
                              row.quantity,
                            ) || 0,
                          )}
                        </b>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="muted">
                  No manpower quantities entered yet.
                </p>
              )}
            </div>

            <div className="quote-detail-section">
              <div className="quote-detail-section-head">
                <h3>Plastic & Disposable</h3>
                <span>
                  {activeDisposable.length} active item{activeDisposable.length === 1 ? '' : 's'}
                </span>
              </div>

              {activeDisposable.length ? (
                <div className="quote-detail-table compact">
                  <div className="quote-detail-row disposable is-head">
                    <b>Item</b>
                    <b>Quantity / Unit</b>
                  </div>

                  {activeDisposable.map(
                    (item) => (
                      <div
                        className="quote-detail-row disposable"
                        key={item.id}
                      >
                        <span>{item.name}</span>
                        <b>
                          {Math.max(
                            0,
                            Number(
                              item.quantity,
                            ) || 0,
                          )}{' '}
                          {item.unit || 'pcs'}
                        </b>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="muted">
                  No plastic or disposable quantities entered yet.
                </p>
              )}
            </div>

            <div className="quote-detail-section">
              <h3>Gas & Transport Plan</h3>

              {operations ? (
                <div className="quote-detail-table">
                  <div className="quote-detail-row operations is-head">
                    <b>Function / Meal</b>
                    <b>Gas</b>
                    <b>Transport</b>
                  </div>

                  {operations.transportMode === 'EVENT_SHARED' ? (
                    <div className="quote-detail-row operations">
                      <span>Whole Event</span>
                      <span>—</span>
                      <span>
                        {operations.sharedTransport.vehicleLabel || 'Vehicle'}
                        {' · '}
                        {operations.sharedTransport.vehicles || 0} vehicle(s)
                        {' · '}
                        {operations.sharedTransport.tripsPerVehicle || 0} trip(s)/vehicle
                      </span>
                    </div>
                  ) : null}

                  {operations.functions.map(
                    (row) => (
                      <div
                        className="quote-detail-row operations"
                        key={row.id}
                      >
                        <span>
                          {[
                            row.dayLabel,
                            row.mealLabel,
                          ]
                            .filter(Boolean)
                            .join(' · ') ||
                            'Event'}
                        </span>

                        <span>
                          {row.gas.mode === 'CYLINDER'
                            ? `${row.gas.cylindersUsed || 0} cylinder(s)`
                            : row.gas.mode === 'KG'
                              ? `${row.gas.usedKg || 0} kg LPG`
                              : 'Manual gas plan'}
                        </span>

                        <span>
                          {operations.transportMode === 'FUNCTION_WISE'
                            ? `${row.transport.vehicleLabel || 'Vehicle'} · ${row.transport.vehicles || 0} vehicle(s) · ${row.transport.tripsPerVehicle || 0} trip(s)/vehicle`
                            : 'Shared event transport'}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="quote-card quote-terms-card">
            <div className="quote-heading">
              <div>
                <span className="section-kicker">
                  Terms & confirmation
                </span>
                <h2>
                  Booking terms
                </h2>
              </div>
            </div>

            <div className="quote-grid">
              <div className="quote-field">
                <label>
                  Validity days
                </label>
                <input
                  className="quote-input"
                  type="number"
                  min="1"
                  max="90"
                  value={
                    quotation.validityDays
                  }
                  onChange={(event) =>
                    patch({
                      validityDays:
                        numberValue(
                          event.target.value,
                        ),
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Advance %
                </label>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  max="100"
                  value={
                    quotation.advancePercent
                  }
                  onChange={(event) =>
                    patch({
                      advancePercent:
                        numberValue(
                          event.target.value,
                        ),
                    })
                  }
                />
              </div>

              <div className="quote-field full">
                <label>
                  Payment terms
                </label>
                <textarea
                  className="quote-textarea"
                  value={
                    quotation.paymentTerms
                  }
                  onChange={(event) =>
                    patch({
                      paymentTerms:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="quote-field full">
                <label>
                  Terms
                </label>

                {quotation.terms.map(
                  (term, index) => (
                    <div
                      className="quote-term"
                      key={index}
                    >
                      <input
                        className="quote-input"
                        value={term}
                        onChange={(event) => {
                          const terms = [
                            ...quotation.terms,
                          ];

                          terms[index] =
                            event.target.value;

                          patch({
                            terms,
                          });
                        }}
                      />

                      <button
                        type="button"
                        aria-label="Remove term"
                        onClick={() =>
                          patch({
                            terms:
                              quotation.terms.filter(
                                (
                                  _,
                                  itemIndex,
                                ) =>
                                  itemIndex !==
                                  index,
                              ),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ),
                )}

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    patch({
                      terms: [
                        ...quotation.terms,
                        '',
                      ],
                    })
                  }
                >
                  + Add term
                </button>
              </div>

              <div className="quote-field full">
                <label>
                  Client-facing notes
                </label>
                <textarea
                  className="quote-textarea"
                  value={
                    quotation.notes
                  }
                  onChange={(event) =>
                    patch({
                      notes:
                        event.target.value,
                    })
                  }
                  placeholder="Optional message for the client"
                />
              </div>

              <div className="quote-field">
                <label>
                  Quotation status
                </label>
                <select
                  className="quote-select"
                  value={
                    quotation.status
                  }
                  onChange={(event) =>
                    patch({
                      status:
                        event.target.value,
                    })
                  }
                >
                  <option value="DRAFT">
                    Draft
                  </option>
                  <option value="SENT">
                    Sent
                  </option>
                  <option value="ACCEPTED">
                    Accepted
                  </option>
                  <option value="REJECTED">
                    Rejected
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="quote-safe">
            Client Event PDF keeps internal costs private. Grocery PDF includes event details, menu cost, category-wise grocery quantities, ingredient rates, LPG gas details, plastic/disposable item costs, per-cover costs and totals. Internal Costing PDF includes the full private cost index for your team only.
          </div>

          {message ? (
            <div className="quote-message ok">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="quote-message error">
              {error}
            </div>
          ) : null}

          <div className="quote-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={saving}
              onClick={() =>
                void save(
                  quotation.status,
                )
              }
            >
              {saving
                ? 'Saving…'
                : 'Save Quotation'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={
                pdfBusy ||
                detailsLoading
              }
              onClick={() =>
                void downloadPdf()
              }
            >
              {pdfBusy
                ? 'Preparing PDF…'
                : detailsLoading
                  ? 'Loading Event Details…'
                  : 'Download Client Event PDF'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={
                internalPdfBusy ||
                detailsLoading
              }
              onClick={() =>
                void downloadInternalCostingPdf()
              }
            >
              {internalPdfBusy
                ? 'Preparing Internal PDF…'
                : detailsLoading
                  ? 'Loading Cost Details…'
                  : 'Download Internal Costing PDF'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={
                groceryPdfBusy ||
                detailsLoading
              }
              onClick={() =>
                void downloadGroceryPdf()
              }
            >
              {groceryPdfBusy
                ? 'Preparing Grocery PDF…'
                : detailsLoading
                  ? 'Loading Grocery Details…'
                  : 'Download Grocery PDF'}
            </button>

            <button
              className="primary-button"
              type="button"
              disabled={
                saving ||
                !quotationReady
              }
              onClick={() =>
                void shareWhatsApp()
              }
            >
              Share on WhatsApp
            </button>

            <Link
              className="ghost-button"
              href="/app/final-costing"
            >
              Back to Final Costing
            </Link>
          </div>
        </div>

        <aside className="quote-preview quotation-preview-modern">
          <div className="quotation-desktop-control no-print">
            <div className="quotation-desktop-control-head">
              <div>
                <span>Quotation status</span>
                <b>{quotation.status || 'DRAFT'}</b>
              </div>
              <small>{quotation.quotationNumber || 'Not saved yet'}</small>
            </div>

            <div className="quotation-readiness">
              <div>
                <span
                  style={{
                    width: `${Math.round(
                      (quotationReadyCount /
                        quotationReadyChecks.length) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <small>
                {quotationReadyCount}/{quotationReadyChecks.length} client essentials ready
              </small>
            </div>

            <div className="quotation-desktop-facts">
              <div>
                <span>Functions</span>
                <b>{menuGroups.length}</b>
              </div>
              <div>
                <span>Dishes</span>
                <b>{work.menu.length}</b>
              </div>
              <div>
                <span>Manpower</span>
                <b>{totalManpowerPeople}</b>
              </div>
              <div>
                <span>Disposable</span>
                <b>{activeDisposable.length}</b>
              </div>
            </div>

            {!quotationReady ? (
              <div className="quotation-desktop-warning">
                Complete client name, event and covers before sending the quotation.
              </div>
            ) : (
              <div className="quotation-desktop-ready">
                <span aria-hidden="true">✓</span>
                Ready to send to client
              </div>
            )}

            <button
              className="primary-button quotation-desktop-primary"
              type="button"
              disabled={
                saving ||
                !quotationReady
              }
              onClick={() =>
                void shareWhatsApp()
              }
            >
              Share on WhatsApp
              <span aria-hidden="true">→</span>
            </button>

            <button
              className="secondary-button quotation-desktop-action"
              type="button"
              disabled={
                pdfBusy ||
                detailsLoading
              }
              onClick={() =>
                void downloadPdf()
              }
            >
              {pdfBusy
                ? 'Preparing PDF…'
                : 'Download Client PDF'}
            </button>

            <button
              className="quotation-desktop-save"
              type="button"
              disabled={saving}
              onClick={() =>
                void save(
                  quotation.status,
                )
              }
            >
              {saving
                ? 'Saving…'
                : 'Save Quotation'}
            </button>

            <div className="quotation-desktop-report-links">
              <button
                type="button"
                disabled={
                  internalPdfBusy ||
                  detailsLoading
                }
                onClick={() =>
                  void downloadInternalCostingPdf()
                }
              >
                Internal Costing
              </button>

              <button
                type="button"
                disabled={
                  groceryPdfBusy ||
                  detailsLoading
                }
                onClick={() =>
                  void downloadGroceryPdf()
                }
              >
                Grocery PDF
              </button>
            </div>

            <Link
              className="quotation-desktop-back"
              href="/app/final-costing"
            >
              Back to Final Cost
            </Link>
          </div>

          <div className="quote-preview-sheet">
            <div className="quote-preview-head">
              <div>
                <b>
                  {work.profile.businessName ||
                    'Your Catering Business'}
                </b>
                <span>
                  {[
                    work.profile.phone,
                    work.profile.city,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>

              <div>
                <b>
                  QUOTATION
                </b>
                <span>
                  {quotation.quotationNumber ||
                    'Draft'}
                </span>
              </div>
            </div>

            <div className="quote-preview-client">
              <div>
                <small>
                  Prepared for
                </small>
                <b>
                  {quotation.clientName ||
                    'Client'}
                </b>
              </div>

              <div>
                <small>
                  Event
                </small>
                <b>
                  {quotation.eventName ||
                    'Event'}
                </b>
                <span>
                  {quotation.eventDate}
                </span>
              </div>
            </div>

            <div className="quote-preview-menu">
              <div className="quote-preview-menu-head">
                <h3>
                  Menu & Service
                </h3>
                <span>
                  {menuGroups.length} function{menuGroups.length === 1 ? '' : 's'} · {work.menu.length} dishes
                </span>
              </div>

              {menuGroups.length ? (
                menuGroups.map(
                  (group) => (
                    <div
                      className="quote-preview-group"
                      key={group.label}
                    >
                      <div className="quote-preview-group-head">
                        <b>
                          {group.label}
                        </b>
                        <span>
                          {group.dishes.length} dish{group.dishes.length === 1 ? '' : 'es'}
                        </span>
                      </div>
                      <p>
                        {group.dishes.join(
                          ' · ',
                        )}
                      </p>
                    </div>
                  ),
                )
              ) : (
                <p>
                  Menu to be finalized.
                </p>
              )}
            </div>

            </div>
        </aside>
      </section>
    </AppShell>
  );
}
