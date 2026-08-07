'use client';

import { useRef, useState } from 'react';

import {
  INGREDIENT_UNITS,
  inferIngredientCategory,
  normalizeIngredientId,
  type IngredientUnit,
} from '../../../lib/ingredientCatalog';

export type BulkIngredientImportItem = {
  name: string;
  rate: number;
  unit: IngredientUnit;
  category: string;
};

type Props = {
  categories: string[];
  onImport: (
    items: BulkIngredientImportItem[],
  ) => void;
};

type ValidationRow = BulkIngredientImportItem & {
  line: number;
  status: 'READY' | 'ERROR';
  error?: string;
};

function normalizeUnit(
  value: string,
): IngredientUnit | null {
  const unit = value
    .trim()
    .toLowerCase();

  const aliases: Record<
    string,
    IngredientUnit
  > = {
    kg: 'kg',
    kgs: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',

    g: 'gram',
    gm: 'gram',
    gms: 'gram',
    gram: 'gram',
    grams: 'gram',

    l: 'ltr',
    lt: 'ltr',
    ltr: 'ltr',
    litre: 'ltr',
    liter: 'ltr',
    litres: 'ltr',
    liters: 'ltr',

    ml: 'ml',

    pc: 'piece',
    pcs: 'piece',
    piece: 'piece',
    pieces: 'piece',

    pkt: 'packet',
    pack: 'packet',
    packet: 'packet',
    packets: 'packet',
  };

  const normalized = aliases[unit];

  return normalized &&
    INGREDIENT_UNITS.includes(normalized)
    ? normalized
    : null;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (
        quoted &&
        line[index + 1] === '"'
      ) {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (char === ',' && !quoted) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function splitRow(
  line: string,
  delimiter: ',' | '\t',
) {
  return delimiter === '\t'
    ? line
        .split('\t')
        .map((value) => value.trim())
    : parseCsvLine(line);
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export default function BulkIngredientImporter({
  categories,
  onImport,
}: Props) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const [rawText, setRawText] =
    useState('');

  const [validationRows, setValidationRows] =
    useState<ValidationRow[]>([]);

  const [validated, setValidated] =
    useState(false);

  const [notice, setNotice] =
    useState('');

  function validate() {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      setValidationRows([]);
      setValidated(false);
      setNotice(
        'Paste ingredient data or upload a CSV first.',
      );
      return;
    }

    const delimiter: ',' | '\t' =
      lines[0].includes('\t')
        ? '\t'
        : ',';

    const firstRow =
      splitRow(lines[0], delimiter);

    const normalizedHeaders =
      firstRow.map(normalizeHeader);

    const hasHeader =
      normalizedHeaders.some((header) =>
        [
          'name',
          'ingredient',
          'ingredientname',
        ].includes(header),
      );

    const findColumn = (
      names: string[],
      fallback: number,
    ) => {
      const index =
        normalizedHeaders.findIndex(
          (header) =>
            names.includes(header),
        );

      return index >= 0
        ? index
        : fallback;
    };

    const nameColumn = hasHeader
      ? findColumn(
          [
            'name',
            'ingredient',
            'ingredientname',
          ],
          0,
        )
      : 0;

    const rateColumn = hasHeader
      ? findColumn(
          [
            'rate',
            'marketrate',
            'price',
            'cost',
          ],
          1,
        )
      : 1;

    const unitColumn = hasHeader
      ? findColumn(
          [
            'unit',
            'purchaseunit',
            'rateunit',
          ],
          2,
        )
      : 2;

    const categoryColumn = hasHeader
      ? findColumn(
          ['category'],
          3,
        )
      : 3;

    const sourceLines = hasHeader
      ? lines.slice(1)
      : lines;

    const seen =
      new Set<string>();

    const output =
      sourceLines.map(
        (line, index) => {
          const values =
            splitRow(
              line,
              delimiter,
            );

          const name =
            String(
              values[nameColumn] || '',
            )
              .trim()
              .replace(/\s+/g, ' ');

          const rate =
            Number(
              String(
                values[rateColumn] || '',
              )
                .replace(/₹/g, '')
                .replace(/,/g, '')
                .trim(),
            );

          const unit =
            normalizeUnit(
              values[unitColumn] || '',
            );

          let category =
            String(
              values[
                categoryColumn
              ] || '',
            )
              .trim()
              .replace(/\s+/g, ' ');

          if (!category && name) {
            category =
              inferIngredientCategory(
                name,
              );
          }

          const row: ValidationRow = {
            line:
              index +
              (hasHeader ? 2 : 1),

            name,

            rate:
              Number.isFinite(rate)
                ? rate
                : 0,

            unit:
              unit || 'kg',

            category:
              category || 'Other',

            status: 'READY',
          };

          if (!name) {
            row.status = 'ERROR';
            row.error =
              'Ingredient name missing';

            return row;
          }

          if (!(rate > 0)) {
            row.status = 'ERROR';
            row.error =
              'Rate must be greater than ₹0';

            return row;
          }

          if (!unit) {
            row.status = 'ERROR';
            row.error =
              'Invalid unit';

            return row;
          }

          const id =
            normalizeIngredientId(
              name,
              unit,
            );

          if (seen.has(id)) {
            row.status = 'ERROR';
            row.error =
              'Duplicate in import';

            return row;
          }

          seen.add(id);

          return row;
        },
      );

    setValidationRows(output);
    setValidated(true);

    const errors =
      output.filter(
        (row) =>
          row.status === 'ERROR',
      ).length;

    setNotice(
      errors
        ? `${errors} row${
            errors === 1 ? '' : 's'
          } need correction.`
        : `${output.length} ingredient${
            output.length === 1
              ? ''
              : 's'
          } ready to import.`,
    );
  }

  async function pasteBulkData() {
    try {
      const value =
        await navigator.clipboard.readText();

      if (value.trim()) {
        setRawText(value);
        setValidationRows([]);
        setValidated(false);
        setNotice(
          'Clipboard data pasted. Click Validate.',
        );
        return;
      }
    } catch {
      // Clipboard can be blocked by browser permissions.
    }

    textareaRef.current?.focus();

    setNotice(
      'Paste your ingredient rows in the box below.',
    );
  }

  async function readFile(
    file: File,
  ) {
    const text =
      await file.text();

    setRawText(text);
    setValidationRows([]);
    setValidated(false);

    setNotice(
      `${file.name} loaded. Click Validate.`,
    );
  }

  function importAll() {
    if (!validated) {
      setNotice(
        'Validate the data before importing.',
      );
      return;
    }

    const errorRows =
      validationRows.filter(
        (row) =>
          row.status === 'ERROR',
      );

    if (errorRows.length) {
      setNotice(
        'Fix validation errors before importing.',
      );
      return;
    }

    const items =
      validationRows.map(
        ({
          name,
          rate,
          unit,
          category,
        }) => ({
          name,
          rate,
          unit,
          category,
        }),
      );

    if (!items.length) {
      setNotice(
        'No ingredients available to import.',
      );
      return;
    }

    onImport(items);

    setRawText('');
    setValidationRows([]);
    setValidated(false);

    setNotice(
      `${items.length} ingredients imported into the editor. Save all changes to publish.`,
    );
  }

  const readyCount =
    validationRows.filter(
      (row) =>
        row.status === 'READY',
    ).length;

  const errorCount =
    validationRows.length -
    readyCount;

  return (
    <div className="glass-card bulk-ingredient-importer">
      <div className="bulk-ingredient-heading">
        <div>
          <span className="section-kicker">
            Bulk ingredient manager
          </span>

          <h2>
            Add or update ingredients
          </h2>

          <p className="muted">
            Paste rows or upload CSV.
            Required: name, rate and unit.
            Category is optional.
          </p>
        </div>
      </div>

      <div className="bulk-ingredient-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            void pasteBulkData()
          }
        >
          Paste Bulk Data
        </button>

        <button
          className="ghost-button"
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          Upload CSV
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={!rawText.trim()}
          onClick={validate}
        >
          Validate
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={
            !validated ||
            !readyCount ||
            errorCount > 0
          }
          onClick={importAll}
        >
          Import All
        </button>

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          onChange={(event) => {
            const file =
              event.target.files?.[0];

            if (file) {
              void readFile(file);
            }

            event.currentTarget.value =
              '';
          }}
        />
      </div>

      <div className="bulk-ingredient-format">
        <strong>
          Format
        </strong>

        <code>
          name,rate,unit,category
        </code>

        <span>
          Example: Paneer,280,kg,Dairy
        </span>
      </div>

      <textarea
        ref={textareaRef}
        className="bulk-ingredient-textarea"
        value={rawText}
        onChange={(event) => {
          setRawText(
            event.target.value,
          );

          setValidated(false);
          setValidationRows([]);
          setNotice('');
        }}
        rows={8}
        placeholder={`name,rate,unit,category
Paneer,280,kg,Dairy
Tomato,35,kg,Vegetables & Herbs
Milk,60,ltr,Dairy
Cashew,800,kg,Other`}
      />

      {notice ? (
        <div
          className={`admin-message ${
            validated &&
            errorCount > 0
              ? 'error'
              : 'success'
          }`}
        >
          {notice}
        </div>
      ) : null}

      {validationRows.length ? (
        <>
          <div className="bulk-import-summary">
            <span>
              <b>
                {
                  validationRows.length
                }
              </b>
              <small>
                Total
              </small>
            </span>

            <span>
              <b>
                {readyCount}
              </b>
              <small>
                Ready
              </small>
            </span>

            <span>
              <b>
                {errorCount}
              </b>
              <small>
                Errors
              </small>
            </span>
          </div>

          <div className="table-wrap bulk-ingredient-preview">
            <table>
              <thead>
                <tr>
                  <th>
                    Name
                  </th>
                  <th>
                    Rate
                  </th>
                  <th>
                    Unit
                  </th>
                  <th>
                    Category
                  </th>
                  <th>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {validationRows
                  .slice(0, 50)
                  .map((row) => (
                    <tr
                      key={`${row.line}-${row.name}`}
                    >
                      <td>
                        {row.name ||
                          `Line ${row.line}`}
                      </td>

                      <td>
                        ₹
                        {row.rate.toLocaleString(
                          'en-IN',
                        )}
                      </td>

                      <td>
                        {row.unit}
                      </td>

                      <td>
                        {row.category}
                      </td>

                      <td>
                        {row.status ===
                        'READY' ? (
                          <span className="bulk-import-ready">
                            Ready
                          </span>
                        ) : (
                          <span className="bulk-import-error">
                            {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
