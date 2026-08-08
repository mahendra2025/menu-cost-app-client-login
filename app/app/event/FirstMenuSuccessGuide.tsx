'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSession, loadWork } from '../../../lib/store';
import type { WorkState } from '../../../lib/types';

function getDetectButton() {
  const buttons = Array.from(document.querySelectorAll('button'));

  return buttons.find((button) => {
    const text = button.textContent?.trim() || '';

    return (
      text.startsWith('Detect Menu') ||
      text.startsWith('Refresh Detection Preview')
    );
  }) as HTMLButtonElement | undefined;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

export default function FirstMenuSuccessGuide() {
  const [work, setWork] = useState<WorkState | null>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let mounted = true;

    function refresh() {
      const session = getSession();

      if (!session || session.role !== 'CLIENT') {
        if (mounted) setWork(null);
        return;
      }

      const nextWork = loadWork(session.tenantId);

      if (mounted) setWork(nextWork);
    }

    function refreshPreview() {
      if (!mounted) return;

      setHasPreview(
        Boolean(
          document.getElementById(
            'menuDetectionPreview',
          ),
        ),
      );
    }

    refresh();
    refreshPreview();

    const interval =
      window.setInterval(() => {
        refresh();
        refreshPreview();
      }, 700);

    const observer =
      new MutationObserver(
        refreshPreview,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    return () => {
      mounted = false;

      window.clearInterval(
        interval,
      );

      observer.disconnect();
    };
  }, []);

  const state =
    useMemo(() => {
      if (!work) {
        return {
          eventReady: false,
          menuReady: false,
          detected:
            hasPreview,
          saved: false,
        };
      }

      return {
        eventReady:
          Boolean(
            work.event
              .clientName
              .trim() ||
            work.event
              .eventName
              .trim() ||
            Number(
              work.event.pax,
            ) > 0,
          ),

        menuReady:
          Boolean(
            work.event
              .rawMenuText
              .trim(),
          ),

        detected:
          hasPreview,

        saved:
          work.menu.length > 0,
      };
    }, [
      work,
      hasPreview,
    ]);

  const steps = [
    state.eventReady,
    state.menuReady,
    state.detected,
    state.saved,
  ];

  const completed =
    steps.filter(Boolean)
      .length;

  useEffect(() => {
    if (state.saved) {
      setOpen(false);
    }
  }, [state.saved]);

  if (
    !work ||
    state.saved ||
    !open
  ) {
    return null;
  }

  function primaryAction() {
    if (
      !state.eventReady
    ) {
      const target =
        document.getElementById(
          'clientName',
        ) ||
        document.getElementById(
          'eventName',
        );

      target?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      (
        target as
          | HTMLInputElement
          | null
      )?.focus?.();

      return;
    }

    if (
      !state.menuReady
    ) {
      const target =
        document.getElementById(
          'rawMenuText',
        );

      target?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      (
        target as
          | HTMLTextAreaElement
          | null
      )?.focus?.();

      return;
    }

    if (
      !state.detected
    ) {
      const button =
        getDetectButton();

      if (
        button &&
        !button.disabled
      ) {
        button.click();
      } else {
        scrollTo(
          'rawMenuText',
        );
      }

      return;
    }

    scrollTo(
      'menuDetectionPreview',
    );
  }

  const actionLabel =
    !state.eventReady
      ? 'Add Event Details'
      : !state.menuReady
        ? 'Add My Menu'
        : !state.detected
          ? 'Detect My Menu'
          : 'Review Detected Dishes';

  return (
    <aside
      className="first-success-guide"
      aria-label="First menu progress"
    >
      <style jsx>{`
        .first-success-guide {
          position: fixed;
          z-index: 80;
          right: 24px;
          top: 92px;
          width: min(
            360px,
            calc(100vw - 32px)
          );
          padding: 20px;
          border:
            1px solid
            rgba(
              0,
              122,
              255,
              0.18
            );
          border-radius: 24px;
          background:
            rgba(
              255,
              255,
              255,
              0.94
            );
          box-shadow:
            0 24px 70px
            rgba(
              15,
              23,
              42,
              0.18
            );
          backdrop-filter:
            blur(22px);
          color: #1d1d1f;
        }

        .top {
          display: flex;
          align-items:
            flex-start;
          justify-content:
            space-between;
          gap: 14px;
        }

        .kicker {
          color: #007aff;
          font-size: 11px;
          font-weight: 850;
          letter-spacing:
            0.08em;
          text-transform:
            uppercase;
        }

        h3 {
          margin:
            6px 0 5px;
          font-size: 20px;
          letter-spacing:
            -0.035em;
        }

        p {
          margin: 0;
          color: #6e6e73;
          font-size: 12px;
          line-height: 1.5;
        }

        .counter {
          flex: 0 0 auto;
          padding:
            8px 10px;
          border-radius:
            13px;
          background:
            rgba(
              0,
              122,
              255,
              0.08
            );
          color: #075985;
          font-size: 12px;
          font-weight: 850;
        }

        .bar {
          overflow: hidden;
          height: 6px;
          margin:
            16px 0;
          border-radius:
            999px;
          background:
            #e8edf3;
        }

        .bar span {
          display: block;
          height: 100%;
          border-radius:
            inherit;
          background:
            #007aff;
          transition:
            width
            0.25s ease;
        }

        .steps {
          display: grid;
          gap: 8px;
        }

        .step {
          display: grid;
          grid-template-columns:
            29px
            minmax(
              0,
              1fr
            );
          gap: 9px;
          align-items:
            center;
          padding:
            9px 10px;
          border:
            1px solid
            rgba(
              15,
              23,
              42,
              0.07
            );
          border-radius:
            14px;
          background:
            rgba(
              248,
              250,
              252,
              0.8
            );
        }

        .step.done {
          border-color:
            rgba(
              52,
              199,
              89,
              0.2
            );
          background:
            rgba(
              52,
              199,
              89,
              0.06
            );
        }

        .number {
          display: grid;
          width: 29px;
          height: 29px;
          place-items:
            center;
          border-radius:
            9px;
          background:
            rgba(
              0,
              122,
              255,
              0.1
            );
          color: #075985;
          font-size: 10px;
          font-weight: 900;
        }

        .done .number {
          background:
            rgba(
              52,
              199,
              89,
              0.14
            );
          color: #187b35;
        }

        .step b {
          display: block;
          font-size: 12px;
        }

        .step small {
          display: block;
          margin-top: 2px;
          color: #7b8492;
          font-size: 10px;
        }

        .actions {
          display: grid;
          grid-template-columns:
            1fr auto;
          gap: 8px;
          margin-top: 16px;
        }

        button {
          min-height: 42px;
          border: 0;
          border-radius:
            999px;
          padding:
            0 15px;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
        }

        .primary {
          background:
            #007aff;
          color: #fff;
          box-shadow:
            0 10px 22px
            rgba(
              0,
              122,
              255,
              0.2
            );
        }

        .close {
          background:
            #f1f5f9;
          color: #475569;
        }

        @media (
          max-width:
            720px
        ) {
          .first-success-guide {
            top: auto;
            right: 14px;
            bottom:
              calc(
                92px +
                env(
                  safe-area-inset-bottom,
                  0px
                )
              );
            width:
              calc(
                100vw -
                28px
              );
            max-height:
              min(
                500px,
                64vh
              );
            overflow: auto;
          }
        }
      `}</style>

      <div className="top">
        <div>
          <span className="kicker">
            First costing
          </span>

          <h3>
            Create your first menu
          </h3>

          <p>
            Complete these steps
            to reach your first
            costing result.
          </p>
        </div>

        <span className="counter">
          {completed}/4
        </span>
      </div>

      <div
        className="bar"
        aria-hidden="true"
      >
        <span
          style={{
            width:
              `${Math.max(
                6,
                (
                  completed /
                  4
                ) * 100,
              )}%`,
          }}
        />
      </div>

      <div className="steps">
        {[
          [
            'Event details',
            'Client, event or guest count',
          ],
          [
            'Add menu',
            'PDF, photo or pasted text',
          ],
          [
            'Detect dishes',
            'Review what Menu Costing found',
          ],
          [
            'Save menu',
            'Continue into costing',
          ],
        ].map(
          (
            [title, note],
            index,
          ) => (
            <div
              className={
                `step ${
                  steps[
                    index
                  ]
                    ? 'done'
                    : ''
                }`
              }
              key={title}
            >
              <span className="number">
                {steps[index]
                  ? '✓'
                  : index +
                    1}
              </span>

              <span>
                <b>
                  {title}
                </b>

                <small>
                  {note}
                </small>
              </span>
            </div>
          ),
        )}
      </div>

      <div className="actions">
        <button
          className="primary"
          type="button"
          onClick={
            primaryAction
          }
        >
          {actionLabel}
        </button>

        <button
          className="close"
          type="button"
          onClick={() =>
            setOpen(false)
          }
          aria-label="Hide guide"
        >
          Hide
        </button>
      </div>
    </aside>
  );
}
