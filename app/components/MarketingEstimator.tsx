'use client';

import {
  useMemo,
  useState,
} from 'react';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function MarketingEstimator() {
  const [guests, setGuests] = useState(500);
  const [quote, setQuote] = useState(550);
  const [realCost, setRealCost] = useState(430);

  const result = useMemo(() => {
    const revenue = guests * quote;
    const cost = guests * realCost;
    const gross = revenue - cost;
    const margin =
      revenue > 0
        ? (gross / revenue) * 100
        : 0;

    const twentyRupeeMiss =
      guests * 20;

    return {
      revenue,
      cost,
      gross,
      margin,
      twentyRupeeMiss,
    };
  }, [
    guests,
    quote,
    realCost,
  ]);

  return (
    <div className="mc-estimator">
      <div className="mc-estimator-head">
        <div>
          <span className="mc-kicker">
            Try the math
          </span>

          <h3>
            See why per-plate accuracy matters.
          </h3>

          <p>
            Change the example numbers. Even a small costing mistake gets expensive on a large event.
          </p>
        </div>

        <span className="mc-live-chip">
          Live estimate
        </span>
      </div>

      <div className="mc-estimator-inputs">
        <label>
          <span>
            Guests
          </span>

          <input
            type="number"
            min="1"
            step="10"
            value={guests}
            onChange={(event) =>
              setGuests(
                Math.max(
                  1,
                  Number(
                    event.target.value,
                  ) || 1,
                ),
              )
            }
          />
        </label>

        <label>
          <span>
            Selling price / plate
          </span>

          <div className="mc-money-input">
            <i>₹</i>

            <input
              type="number"
              min="1"
              step="10"
              value={quote}
              onChange={(event) =>
                setQuote(
                  Math.max(
                    1,
                    Number(
                      event.target.value,
                    ) || 1,
                  ),
                )
              }
            />
          </div>
        </label>

        <label>
          <span>
            Actual cost / plate
          </span>

          <div className="mc-money-input">
            <i>₹</i>

            <input
              type="number"
              min="1"
              step="10"
              value={realCost}
              onChange={(event) =>
                setRealCost(
                  Math.max(
                    1,
                    Number(
                      event.target.value,
                    ) || 1,
                  ),
                )
              }
            />
          </div>
        </label>
      </div>

      <div className="mc-estimator-results">
        <div>
          <span>
            Event revenue
          </span>

          <strong>
            {money(
              result.revenue,
            )}
          </strong>
        </div>

        <div>
          <span>
            Estimated cost
          </span>

          <strong>
            {money(
              result.cost,
            )}
          </strong>
        </div>

        <div>
          <span>
            Gross contribution
          </span>

          <strong>
            {money(
              result.gross,
            )}
          </strong>
        </div>

        <div>
          <span>
            Gross margin
          </span>

          <strong>
            {result.margin.toFixed(
              1,
            )}
            %
          </strong>
        </div>
      </div>

      <div className="mc-estimator-warning">
        <span>
          ₹20 costing error × {guests.toLocaleString('en-IN')} guests
        </span>

        <strong>
          {money(
            result.twentyRupeeMiss,
          )} difference
        </strong>
      </div>
    </div>
  );
}
