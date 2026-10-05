'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type {
  MenuItem,
  WorkState,
} from './types';

type MenuStation = {
  key: string;
  label: string;
  categories: string[];
};

type FunctionMenu = {
  key: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  items: MenuItem[];
};

const PAGE_LEFT = 14;
const PAGE_RIGHT = 196;
const CONTENT_WIDTH = 182;
const FOOTER_Y = 282;

const MENU_STATIONS: MenuStation[] = [
  { key: 'welcome-drinks', label: 'Welcome Drinks Station', categories: ['Welcome Drink', 'Mocktail'] },
  { key: 'starters', label: 'Starters Station', categories: ['Starter', 'Snacks'] },
  { key: 'soup', label: 'Soup Station', categories: ['Soup'] },
  { key: 'sweets', label: 'Sweets Station', categories: ['Sweet'] },
  { key: 'farsan', label: 'Farsan Station', categories: ['Farsan'] },
  { key: 'vegetable', label: 'Vegetable Station', categories: ['Sabji', 'Paneer', 'Main Course'] },
  { key: 'indian-bread', label: 'Indian Bread Station', categories: ['Bread', 'Tandoor'] },
  { key: 'dal-rice', label: 'Dal & Rice Station', categories: ['Dal / Kadhi', 'Rice'] },
  { key: 'salad', label: 'Salad Station', categories: ['Salad', 'Raita'] },
  { key: 'papad', label: 'Papad Station', categories: ['Papad'] },
  { key: 'achar', label: 'Achar Station', categories: ['Pickle', 'Condiments'] },
  { key: 'chaat', label: 'Chaat Station', categories: ['Chaat', 'Street Food'] },
  { key: 'chinese', label: 'Chinese Station', categories: ['Chinese'] },
  { key: 'south-indian', label: 'South Indian Station', categories: ['South Indian'] },
  { key: 'punjabi', label: 'Punjabi Station', categories: ['Punjabi'] },
  { key: 'north-indian', label: 'North Indian Station', categories: ['North Indian'] },
  { key: 'japanese', label: 'Japanese Station', categories: ['Japanese'] },
  { key: 'mexican', label: 'Mexican Station', categories: ['Mexican'] },
  { key: 'thai', label: 'Thai Station', categories: ['Thai'] },
  { key: 'asian', label: 'Asian Station', categories: ['Asian'] },
  { key: 'mongolian', label: 'Mongolian Station', categories: ['Mongolian'] },
  { key: 'dessert', label: 'Dessert Station', categories: ['Dessert', 'Bakery'] },
  { key: 'waffles', label: 'Waffles Station', categories: ['Waffles'] },
  { key: 'party', label: 'Party Station', categories: ['Party'] },
  { key: 'ice-cream', label: 'Ice Cream Station', categories: ['Ice Cream'] },
  { key: 'fruit', label: 'Fruit Station', categories: ['Fruit'] },
  { key: 'beverage', label: 'Beverage Station', categories: ['Beverage'] },
  { key: 'mukhwas', label: 'Mukhwas Station', categories: ['Mukhwas'] },
  { key: 'paan', label: 'Paan Station', categories: ['Paan'] },
];

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function stationForCategory(category: string): MenuStation {
  const key = normalize(category);

  const found = MENU_STATIONS.find((station) =>
    station.categories.some((value) => normalize(value) === key),
  );

  if (found) {
    return found;
  }

  const clean = String(category || 'Other').trim() || 'Other';

  return {
    key: `other::${key || 'other'}`,
    label: `${clean} Station`,
    categories: [clean],
  };
}

function formatDate(value: string) {
  if (!value) return '';

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function safeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
}

function groupFunctions(work: WorkState): FunctionMenu[] {
  const groups = new Map<string, FunctionMenu>();

  work.menu
    .filter((item) => item.coverageStatus !== 'REJECTED')
    .forEach((item) => {
      const label = [
        item.dayLabel || '',
        item.mealLabel || '',
      ]
        .filter(Boolean)
        .join(' · ') || 'Event Menu';

      const key =
        item.serviceId?.trim() ||
        label.toLowerCase();

      const existing = groups.get(key);

      if (existing) {
        existing.items.push(item);
        existing.pax = Math.max(
          existing.pax,
          Number(item.servicePax) || 0,
        );
        return;
      }

      groups.set(key, {
        key,
        dayLabel: item.dayLabel || '',
        mealLabel: item.mealLabel || 'Event Menu',
        pax:
          Math.max(
            0,
            Number(item.servicePax) ||
              Number(work.event.pax) ||
              0,
          ),
        items: [item],
      });
    });

  return Array.from(groups.values());
}

function stationRows(items: MenuItem[]) {
  const groups = new Map<
    string,
    {
      station: MenuStation;
      names: string[];
    }
  >();

  items.forEach((item) => {
    const station = stationForCategory(item.category);
    const existing = groups.get(station.key);

    groups.set(station.key, {
      station,
      names: [
        ...(existing?.names || []),
        item.name,
      ],
    });
  });

  const order = new Map(
    MENU_STATIONS.map((station, index) => [
      station.key,
      index,
    ]),
  );

  return Array.from(groups.values())
    .sort((left, right) => {
      const leftOrder =
        order.get(left.station.key) ?? 999;
      const rightOrder =
        order.get(right.station.key) ?? 999;

      return (
        leftOrder - rightOrder ||
        left.station.label.localeCompare(
          right.station.label,
        )
      );
    })
    .map((group) => [
      group.station.label,
      group.names.join(' · '),
    ]);
}

function addFooter(
  doc: jsPDF,
  businessName: string,
) {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    doc.setDrawColor(226, 232, 240);
    doc.line(
      PAGE_LEFT,
      FOOTER_Y,
      PAGE_RIGHT,
      FOOTER_Y,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    doc.text(
      `${businessName} · Event Menu`,
      PAGE_LEFT,
      287,
    );

    doc.text(
      `Page ${page} of ${pages}`,
      PAGE_RIGHT,
      287,
      { align: 'right' },
    );
  }
}

export function downloadMenuCreationPdf(
  work: WorkState,
) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const businessName =
    work.profile.businessName ||
    'Catering Business';

  const businessContact = [
    work.profile.phone,
    work.profile.email,
    work.profile.city,
  ]
    .filter(Boolean)
    .join(' · ');

  const functions = groupFunctions(work);

  doc.setProperties({
    title:
      `Menu - ${work.event.eventName || work.event.clientName || 'Catering Event'}`,
    subject:
      'Function-wise catering menu',
    author: businessName,
    creator: 'Menu Costing App',
  });

  doc.setFillColor(12, 20, 31);
  doc.rect(0, 0, 210, 44, 'F');

  doc.setFillColor(40, 125, 235);
  doc.rect(0, 43, 210, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text(
    businessName,
    PAGE_LEFT,
    16,
  );

  doc.setFontSize(13);
  doc.text(
    'EVENT MENU',
    PAGE_LEFT,
    26,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(174, 188, 206);

  if (businessContact) {
    doc.text(
      businessContact,
      PAGE_LEFT,
      34,
    );
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(150, 199, 255);
  doc.text(
    work.profile.tagline?.trim() ||
      'PREMIUM EVENT CATERING',
    PAGE_RIGHT,
    17,
    { align: 'right' },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(174, 188, 206);
  doc.text(
    `Prepared ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`,
    PAGE_RIGHT,
    25,
    { align: 'right' },
  );

  const eventName =
    work.event.eventName ||
    work.event.functionType ||
    'Event';

  const eventMeta = [
    formatDate(work.event.eventDate),
    [work.event.venue, work.event.city]
      .filter(Boolean)
      .join(', '),
  ]
    .filter(Boolean)
    .join(' · ');

  autoTable(doc, {
    startY: 51,
    margin: {
      left: PAGE_LEFT,
      right: PAGE_LEFT,
    },
    theme: 'plain',
    body: [
      [
        'Client',
        work.event.clientName || '-',
        'Event',
        eventName,
      ],
      [
        'Date / Venue',
        eventMeta || '-',
        'Functions',
        String(functions.length || 1),
      ],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: {
        cellWidth: 25,
        fontStyle: 'bold',
        textColor: [100, 116, 139],
      },
      1: {
        cellWidth: 66,
      },
      2: {
        cellWidth: 25,
        fontStyle: 'bold',
        textColor: [100, 116, 139],
      },
      3: {
        cellWidth: 66,
      },
    },
  });

  const pdfWithTable = doc as jsPDF & {
    lastAutoTable?: {
      finalY: number;
    };
  };

  let y =
    (pdfWithTable.lastAutoTable?.finalY || 67) +
    10;

  if (!functions.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(
      'Menu',
      PAGE_LEFT,
      y,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'No dishes selected yet.',
      PAGE_LEFT,
      y + 8,
    );
  } else {
    functions.forEach((fn, index) => {
      if (y > 238) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(245, 249, 255);
      doc.setDrawColor(219, 234, 254);
      doc.roundedRect(
        PAGE_LEFT,
        y,
        CONTENT_WIDTH,
        14,
        2.5,
        2.5,
        'FD',
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 64, 112);

      const title = [
        fn.dayLabel,
        fn.mealLabel,
      ]
        .filter(Boolean)
        .join(' · ') ||
        `Function ${index + 1}`;

      doc.text(
        title,
        18,
        y + 8.5,
      );

      if (fn.pax > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 102, 145);
        doc.text(
          `${fn.pax.toLocaleString('en-IN')} guests`,
          192,
          y + 8.5,
          { align: 'right' },
        );
      }

      y += 17;

      autoTable(doc, {
        startY: y,
        margin: {
          left: PAGE_LEFT,
          right: PAGE_LEFT,
          bottom: 18,
        },
        theme: 'grid',
        head: [[
          'Station',
          'Menu Selection',
        ]],
        body: stationRows(fn.items),
        styles: {
          font: 'helvetica',
          fontSize: 8.2,
          cellPadding: 2.5,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.12,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        columnStyles: {
          0: {
            cellWidth: 47,
            fontStyle: 'bold',
            textColor: [71, 85, 105],
          },
          1: {
            cellWidth: 135,
          },
        },
        alternateRowStyles: {
          fillColor: [250, 251, 252],
        },
      });

      y =
        (pdfWithTable.lastAutoTable?.finalY || y) +
        9;
    });
  }

  addFooter(
    doc,
    businessName,
  );

  const fileBase =
    safeName(
      work.event.eventName ||
        work.event.clientName ||
        'event-menu',
    ) ||
    'event-menu';

  doc.save(
    `${fileBase}-menu.pdf`,
  );
}
