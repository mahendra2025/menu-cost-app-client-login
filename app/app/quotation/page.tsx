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
} from '../../../lib/store';
import type {
  Session,
  WorkState,
} from '../../../lib/types';
import type {
  ClientQuotationData,
} from '../../../lib/clientQuotationPdf';

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
    includeTotal: true,
    subtotal,
    gstPercent: 0,
    gstAmount: 0,
    extraLabel: '',
    extraAmount: 0,
    grandTotal: subtotal,
    validityDays: 7,
    advancePercent: 50,
    paymentTerms:
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
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

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

  const menuGroups =
    useMemo(() => {
      if (!work) return [];

      const groups =
        new Map<
          string,
          {
            label: string;
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
          } else {
            groups.set(key, {
              label,
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
      );
    } finally {
      setPdfBusy(false);
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
            href="/app/event"
          >
            Open Costing
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Client Quotation"
      subtitle="Create a professional client-facing offer without exposing internal costing"
    >
      <section className="quote-page">
        <style>{`
          .quote-page{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:14px;align-items:start}.quote-main,.quote-preview{display:grid;gap:14px}.quote-preview{position:sticky;top:86px}.quote-card{padding:19px;border:1px solid #29313c;border-radius:17px;background:#10151c}.quote-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.quote-heading h2{margin:4px 0 5px;font-size:19px;letter-spacing:-.03em}.quote-heading p{margin:0;color:#7f8b9a;font-size:9px;line-height:1.5}.quote-number{padding:6px 8px;border-radius:999px;color:#8fc2ff;background:rgba(74,156,255,.1);font-size:7px;font-weight:900}.quote-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.quote-field{display:grid;gap:6px}.quote-field.full{grid-column:1/-1}.quote-field label{color:#9ba6b5;font-size:8px;font-weight:850}.quote-input,.quote-textarea,.quote-select{width:100%;border:1px solid #303844;border-radius:10px;outline:0;color:#eef2f6;background:#151b23;font:inherit;font-size:10px;color-scheme:dark}.quote-input,.quote-select{min-height:41px;padding:0 10px}.quote-textarea{min-height:84px;padding:10px;resize:vertical}.quote-input:focus,.quote-textarea:focus,.quote-select:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 4px rgba(74,156,255,.07)}.quote-commercial{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.quote-total{padding:13px;border:1px solid rgba(74,156,255,.17);border-radius:12px;background:rgba(74,156,255,.05)}.quote-total small,.quote-total strong{display:block}.quote-total small{color:#708090;font-size:7px;text-transform:uppercase}.quote-total strong{margin-top:4px;font-size:17px}.quote-term{display:flex;gap:8px;margin-top:8px}.quote-term input{flex:1}.quote-term button{width:34px;border:1px solid #3a3034;border-radius:9px;color:#ff8d86;background:rgba(255,98,89,.06);cursor:pointer}.quote-actions{display:flex;flex-wrap:wrap;gap:7px}.quote-actions button,.quote-actions a{min-height:38px}.quote-preview-sheet{padding:24px;border:1px solid #dfe5ec;border-radius:15px;color:#172033;background:#fff;box-shadow:0 20px 55px rgba(0,0,0,.24)}.quote-preview-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:15px;border-bottom:1px solid #e7ebf0}.quote-preview-head b{font-size:16px}.quote-preview-head span{display:block;margin-top:3px;color:#758195;font-size:7px}.quote-preview-head>div:last-child{text-align:right}.quote-preview-client{display:grid;grid-template-columns:1fr 1fr;gap:15px;padding:15px 0}.quote-preview-client small{display:block;color:#8792a2;font-size:6px;text-transform:uppercase}.quote-preview-client b{display:block;margin-top:3px;font-size:9px}.quote-preview-menu{border-top:1px solid #e7ebf0;padding-top:12px}.quote-preview-menu h3,.quote-preview-commercial h3{margin:0 0 8px;font-size:9px}.quote-preview-group{margin-bottom:8px}.quote-preview-group b{font-size:8px}.quote-preview-group p{margin:3px 0 0;color:#596579;font-size:7px;line-height:1.45}.quote-preview-commercial{margin-top:12px;padding-top:12px;border-top:1px solid #e7ebf0}.quote-preview-price{display:flex;justify-content:space-between;gap:10px;margin-top:5px;color:#526074;font-size:7px}.quote-preview-price.total{margin-top:8px;padding-top:7px;border-top:1px solid #dfe5ec;color:#172033;font-size:9px;font-weight:900}.quote-safe{padding:10px 11px;border:1px solid rgba(61,220,132,.16);border-radius:10px;color:#79c99a;background:rgba(61,220,132,.05);font-size:8px;line-height:1.45}.quote-message{padding:10px;border-radius:10px;font-size:8px}.quote-message.ok{color:#79c99a;background:rgba(61,220,132,.06)}.quote-message.error{color:#ff938c;background:rgba(255,98,89,.06)}@media(max-width:1050px){.quote-page{grid-template-columns:1fr}.quote-preview{position:static}}@media(max-width:650px){.quote-grid,.quote-commercial{grid-template-columns:1fr}.quote-field.full{grid-column:auto}.quote-preview-client{grid-template-columns:1fr}.quote-actions{display:grid;grid-template-columns:1fr 1fr}.quote-actions button,.quote-actions a{width:100%}}
        `}</style>

        <div className="quote-main">
          <div className="quote-card">
            <div className="quote-heading">
              <div>
                <span className="section-kicker">
                  Client details
                </span>
                <h2>
                  Quotation information
                </h2>
                <p>
                  These details appear on the client PDF.
                </p>
              </div>

              <span className="quote-number">
                {quotation.quotationNumber ||
                  'DRAFT'}
              </span>
            </div>

            <div className="quote-grid">
              <div className="quote-field">
                <label>
                  Client name
                </label>
                <input
                  className="quote-input"
                  value={
                    quotation.clientName
                  }
                  onChange={(event) =>
                    patch({
                      clientName:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Client WhatsApp number
                </label>
                <input
                  className="quote-input"
                  value={
                    quotation.clientPhone
                  }
                  onChange={(event) =>
                    patch({
                      clientPhone:
                        event.target.value,
                    })
                  }
                  placeholder="Example: 919876543210"
                />
              </div>

              <div className="quote-field">
                <label>
                  Event
                </label>
                <input
                  className="quote-input"
                  value={
                    quotation.eventName
                  }
                  onChange={(event) =>
                    patch({
                      eventName:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Event date
                </label>
                <input
                  className="quote-input"
                  type="date"
                  value={
                    quotation.eventDate
                  }
                  onChange={(event) =>
                    patch({
                      eventDate:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Venue
                </label>
                <input
                  className="quote-input"
                  value={
                    quotation.venue
                  }
                  onChange={(event) =>
                    patch({
                      venue:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  City
                </label>
                <input
                  className="quote-input"
                  value={
                    quotation.city
                  }
                  onChange={(event) =>
                    patch({
                      city:
                        event.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="quote-card">
            <div className="quote-heading">
              <div>
                <span className="section-kicker">
                  Commercial offer
                </span>
                <h2>
                  Selling price
                </h2>
                <p>
                  Only client selling values are shown here.
                </p>
              </div>
            </div>

            <div className="quote-commercial">
              <div className="quote-field">
                <label>
                  Total covers
                </label>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  value={
                    quotation.totalCovers ||
                    ''
                  }
                  onChange={(event) =>
                    patch({
                      totalCovers:
                        numberValue(
                          event.target.value,
                        ),
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Rate / cover
                </label>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  value={
                    quotation.pricePerCover ||
                    ''
                  }
                  onChange={(event) =>
                    patch({
                      pricePerCover:
                        numberValue(
                          event.target.value,
                        ),
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Show total amount?
                </label>
                <select
                  className="quote-select"
                  value={
                    quotation.includeTotal
                      ? 'YES'
                      : 'NO'
                  }
                  onChange={(event) =>
                    patch({
                      includeTotal:
                        event.target.value ===
                        'YES',
                    })
                  }
                >
                  <option value="YES">
                    Yes
                  </option>
                  <option value="NO">
                    Rate only
                  </option>
                </select>
              </div>

              <div className="quote-field">
                <label>
                  GST %
                </label>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  max="100"
                  value={
                    quotation.gstPercent ||
                    ''
                  }
                  onChange={(event) =>
                    patch({
                      gstPercent:
                        numberValue(
                          event.target.value,
                        ),
                    })
                  }
                />
              </div>

              <div className="quote-field">
                <label>
                  Extra charge label
                </label>
                <input
                  className="quote-input"
                  value={
                    quotation.extraLabel
                  }
                  onChange={(event) =>
                    patch({
                      extraLabel:
                        event.target.value,
                    })
                  }
                  placeholder="Example: Transport"
                />
              </div>

              <div className="quote-field">
                <label>
                  Extra amount
                </label>
                <input
                  className="quote-input"
                  type="number"
                  min="0"
                  value={
                    quotation.extraAmount ||
                    ''
                  }
                  onChange={(event) =>
                    patch({
                      extraAmount:
                        numberValue(
                          event.target.value,
                        ),
                    })
                  }
                />
              </div>
            </div>

            <div className="quote-commercial">
              <div className="quote-total">
                <small>
                  Subtotal
                </small>
                <strong>
                  {money(
                    quotation.subtotal,
                  )}
                </strong>
              </div>

              <div className="quote-total">
                <small>
                  GST
                </small>
                <strong>
                  {money(
                    quotation.gstAmount,
                  )}
                </strong>
              </div>

              <div className="quote-total">
                <small>
                  Grand total
                </small>
                <strong>
                  {money(
                    quotation.grandTotal,
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="quote-card">
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
            Client quotation safety: ingredient rates, food cost, manpower cost, internal event cost and profit are not included in this quotation or its PDF.
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
              disabled={pdfBusy}
              onClick={() =>
                void downloadPdf()
              }
            >
              {pdfBusy
                ? 'Preparing PDF…'
                : 'Download Client PDF'}
            </button>

            <button
              className="primary-button"
              type="button"
              disabled={saving}
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

        <aside className="quote-preview">
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
              <h3>
                Menu & Service
              </h3>

              {menuGroups.length ? (
                menuGroups.map(
                  (group) => (
                    <div
                      className="quote-preview-group"
                      key={group.label}
                    >
                      <b>
                        {group.label}
                      </b>
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

            <div className="quote-preview-commercial">
              <h3>
                Commercial Offer
              </h3>

              <div className="quote-preview-price">
                <span>
                  Rate / cover
                </span>
                <b>
                  {money(
                    quotation.pricePerCover,
                  )}
                </b>
              </div>

              {quotation.includeTotal ? (
                <>
                  {quotation.extraAmount >
                  0 ? (
                    <div className="quote-preview-price">
                      <span>
                        {quotation.extraLabel ||
                          'Additional charges'}
                      </span>
                      <b>
                        {money(
                          quotation.extraAmount,
                        )}
                      </b>
                    </div>
                  ) : null}

                  {quotation.gstPercent >
                  0 ? (
                    <div className="quote-preview-price">
                      <span>
                        GST{' '}
                        {
                          quotation.gstPercent
                        }
                        %
                      </span>
                      <b>
                        {money(
                          quotation.gstAmount,
                        )}
                      </b>
                    </div>
                  ) : null}

                  <div className="quote-preview-price total">
                    <span>
                      Grand Total
                    </span>
                    <b>
                      {money(
                        quotation.grandTotal,
                      )}
                    </b>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
