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

export type MenuCreationPdfOptions = {
  menuTitle?: string;
  tagline?: string;
  footerNote?: string;
  termsAndConditions?: string;
  showTerms?: boolean;
  showDate?: boolean;
  showGuests?: boolean;
  showVenue?: boolean;
  showCity?: boolean;
  showEventType?: boolean;
  showFunctionCount?: boolean;
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

function stationRows(
  items: MenuItem[],
  categoryOrder: string[] = [],
) {
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

  const defaultOrder = new Map(
    MENU_STATIONS.map((station, index) => [
      station.key,
      index,
    ]),
  );

  const customCategoryOrder = new Map(
    categoryOrder.map((category, index) => [
      normalize(category),
      index,
    ]),
  );

  const stationRank = (station: MenuStation) => {
    const customRanks = station.categories
      .map((category) => customCategoryOrder.get(normalize(category)))
      .filter((value): value is number => value !== undefined);

    if (customRanks.length) {
      return Math.min(...customRanks);
    }

    return 1000 + (defaultOrder.get(station.key) ?? 999);
  };

  return Array.from(groups.values())
    .sort((left, right) => {
      const leftOrder = stationRank(left.station);
      const rightOrder = stationRank(right.station);

      return (
        leftOrder - rightOrder ||
        left.station.label.localeCompare(
          right.station.label,
        )
      );
    })
    .flatMap((group) =>
      group.names.map(
        (name, index) => [
          index === 0
            ? group.station.label
            : '',
          name,
        ],
      ),
    );
}

function addFooter(
  doc: jsPDF,
  businessName: string,
  tagline: string,
) {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    doc.setDrawColor(193, 157, 87);
    doc.setLineWidth(0.25);
    doc.line(
      PAGE_LEFT,
      FOOTER_Y,
      PAGE_RIGHT,
      FOOTER_Y,
    );

    doc.setFont('times', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(112, 98, 78);

    doc.text(
      tagline || businessName,
      PAGE_LEFT,
      287,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(126, 126, 126);
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
  categoryOrder: string[] = [],
  options: MenuCreationPdfOptions = {},
) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const businessName =
    work.profile.businessName ||
    'Catering Business';

  const tagline =
    options.tagline?.trim() ||
    work.profile.tagline?.trim() ||
    'A CURATED CULINARY EXPERIENCE';

  const menuTitle =
    options.menuTitle?.trim() ||
    'Curated Event Menu';

  const footerNote =
    options.footerNote?.trim() ||
    'Crafted with care for a memorable celebration';

  const termsAndConditions =
    options.termsAndConditions?.trim() ||
    work.profile.menuTerms?.trim() ||
    '';

  const showTerms =
    options.showTerms !== false;

  const showDate = options.showDate !== false;
  const showGuests = options.showGuests !== false;
  const showVenue = options.showVenue !== false;
  const showCity = options.showCity !== false;
  const showEventType = options.showEventType !== false;
  const showFunctionCount =
    options.showFunctionCount !== false;

  const businessContact = [
    work.profile.phone,
    work.profile.email,
    work.profile.website,
    work.profile.instagram,
    work.profile.city,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const businessLegal = [
    work.profile.address,
    work.profile.gstin
      ? `GSTIN: ${work.profile.gstin}`
      : '',
    work.profile.fssai
      ? `FSSAI: ${work.profile.fssai}`
      : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const functions = groupFunctions(work);

  doc.setProperties({
    title:
      `Premium Menu - ${work.event.eventName || work.event.clientName || 'Catering Event'}`,
    subject:
      'Premium function-wise catering menu',
    author: businessName,
    creator: 'Menu Costing App',
  });

  // Premium masthead.
  doc.setFillColor(18, 24, 31);
  doc.rect(0, 0, 210, 57, 'F');

  doc.setDrawColor(193, 157, 87);
  doc.setLineWidth(0.45);
  doc.line(14, 9, 196, 9);
  doc.setLineWidth(0.15);
  doc.line(14, 11.2, 196, 11.2);

  if (work.profile.logoUrl) {
    try {
      doc.addImage(
        work.profile.logoUrl,
        17,
        16,
        25,
        25,
      );
    } catch {
      // Keep the PDF usable even if an older logo image is invalid.
    }
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(248, 245, 238);
  doc.text(
    businessName.toUpperCase(),
    105,
    24,
    { align: 'center' },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(205, 176, 116);
  doc.text(
    tagline.toUpperCase(),
    105,
    31,
    { align: 'center' },
  );

  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    menuTitle,
    105,
    42,
    { align: 'center' },
  );

  if (businessContact) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(174, 181, 190);
    doc.text(
      businessContact,
      105,
      50,
      { align: 'center' },
    );
  }

  doc.setDrawColor(193, 157, 87);
  doc.setLineWidth(0.25);
  doc.line(14, 55, 196, 55);

  const eventName =
    work.event.eventName ||
    work.event.functionType ||
    'Event';

  // Premium client + event detail cards.
  const cardTop = 64;
  const cardHeight = 46;
  const gap = 6;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const leftCardX = PAGE_LEFT;
  const rightCardX = PAGE_LEFT + cardWidth + gap;

  // Client details.
  doc.setFillColor(250, 247, 240);
  doc.setDrawColor(227, 216, 194);
  doc.roundedRect(
    leftCardX,
    cardTop,
    cardWidth,
    cardHeight,
    3,
    3,
    'FD',
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(154, 126, 72);
  doc.text(
    'CLIENT DETAILS',
    leftCardX + 6,
    cardTop + 8,
  );

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(35, 38, 43);
  doc.text(
    work.event.clientName ||
      'Our Esteemed Guest',
    leftCardX + 6,
    cardTop + 18,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(125, 125, 125);
  doc.text(
    'Event',
    leftCardX + 6,
    cardTop + 28,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(66, 66, 66);
  const clientEventLines =
    doc.splitTextToSize(
      eventName,
      cardWidth - 12,
    );
  doc.text(
    clientEventLines,
    leftCardX + 6,
    cardTop + 34,
  );

  // Event details.
  doc.setFillColor(255, 254, 251);
  doc.setDrawColor(227, 216, 194);
  doc.roundedRect(
    rightCardX,
    cardTop,
    cardWidth,
    cardHeight,
    3,
    3,
    'FD',
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(154, 126, 72);
  doc.text(
    'EVENT DETAILS',
    rightCardX + 6,
    cardTop + 8,
  );

  const eventDetailRows: Array<
    [string, string]
  > = [];

  if (showDate) {
    eventDetailRows.push([
      'Date',
      formatDate(
        work.event.eventDate,
      ) ||
        functions[0]?.dayLabel ||
        '-',
    ]);
  }

  if (showVenue) {
    eventDetailRows.push([
      'Venue',
      work.event.venue ||
        '-',
    ]);
  }

  if (showCity) {
    eventDetailRows.push([
      'City',
      work.event.city ||
        '-',
    ]);
  }

  if (showEventType) {
    eventDetailRows.push([
      'Event Type',
      work.event.functionType ||
        eventName ||
        '-',
    ]);
  }

  if (showGuests) {
    eventDetailRows.push([
      'Guests',
      Math.max(
        0,
        Number(work.event.pax) || 0,
      ) > 0
        ? Math.max(
            0,
            Number(work.event.pax) || 0,
          ).toLocaleString('en-IN')
        : '-',
    ]);
  }

  if (showFunctionCount) {
    eventDetailRows.push([
      'Functions',
      String(
        functions.length || 1,
      ),
    ]);
  }

  let detailY =
    cardTop + 15;

  eventDetailRows.forEach(
    ([label, value]) => {
      doc.setFont(
        'helvetica',
        'normal',
      );
      doc.setFontSize(6.3);
      doc.setTextColor(
        130,
        130,
        130,
      );
      doc.text(
        label,
        rightCardX + 6,
        detailY,
      );

      doc.setFont(
        'helvetica',
        'bold',
      );
      doc.setFontSize(6.8);
      doc.setTextColor(
        62,
        62,
        62,
      );

      const valueLines =
        doc.splitTextToSize(
          value,
          cardWidth - 32,
        );

      doc.text(
        valueLines,
        rightCardX + cardWidth - 6,
        detailY,
        {
          align: 'right',
        },
      );

      detailY += 5.2;
    },
  );

  let y = cardTop + cardHeight + 10;

  if (!functions.length) {
    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(85, 85, 85);
    doc.text(
      'Your menu is being curated.',
      105,
      y + 12,
      { align: 'center' },
    );
  } else {
    functions.forEach((fn, index) => {
      const rows = stationRows(
        fn.items,
        categoryOrder,
      );

      if (y > 226) {
        doc.addPage();
        y = 20;
      }

      // Function heading.
      doc.setFillColor(24, 30, 38);
      doc.roundedRect(
        PAGE_LEFT,
        y,
        CONTENT_WIDTH,
        17,
        2.5,
        2.5,
        'F',
      );

      doc.setFillColor(193, 157, 87);
      doc.roundedRect(
        PAGE_LEFT,
        y,
        3.2,
        17,
        1.5,
        1.5,
        'F',
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(204, 172, 109);
      doc.text(
        `FUNCTION ${index + 1}`,
        21,
        y + 5.2,
      );

      doc.setFont('times', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        fn.mealLabel || 'Event Menu',
        21,
        y + 12,
      );

      if (showDate && fn.dayLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(198, 203, 209);
        doc.text(
          fn.dayLabel,
          191,
          y + 6.2,
          { align: 'right' },
        );
      }

      if (showGuests && fn.pax > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(222, 227, 232);
        doc.text(
          `${fn.pax.toLocaleString('en-IN')} guests`,
          191,
          y + 12.3,
          { align: 'right' },
        );
      }

      y += 21;

      autoTable(doc, {
        startY: y,
        margin: {
          left: PAGE_LEFT,
          right: PAGE_LEFT,
          bottom: 20,
        },
        theme: 'plain',
        body: rows,
        didParseCell: (data) => {
          if (data.section !== 'body') return;

          if (data.column.index === 0) {
            data.cell.styles.font = 'times';
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 9;
            data.cell.styles.textColor = [92, 72, 44];
            data.cell.styles.fillColor =
              data.row.index % 2 === 0
                ? [250, 247, 240]
                : [247, 243, 234];
          } else {
            data.cell.styles.font = 'helvetica';
            data.cell.styles.fontStyle = 'normal';
            data.cell.styles.fontSize = 8.4;
            data.cell.styles.textColor = [55, 58, 62];
            data.cell.styles.fillColor =
              data.row.index % 2 === 0
                ? [255, 254, 251]
                : [252, 250, 245];
          }

          data.cell.styles.lineColor = [226, 218, 203];
          data.cell.styles.lineWidth = {
            top: 0,
            right: 0,
            bottom: 0.12,
            left: 0,
          };
        },
        styles: {
          cellPadding: {
            top: 2.4,
            right: 3.2,
            bottom: 2.4,
            left: 3.2,
          },
          overflow: 'linebreak',
          valign: 'middle',
        },
        columnStyles: {
          0: {
            cellWidth: 50,
          },
          1: {
            cellWidth: 132,
          },
        },
      });

      const pdfWithTable = doc as jsPDF & {
        lastAutoTable?: {
          finalY: number;
        };
      };

      y =
        (pdfWithTable.lastAutoTable?.finalY || y) +
        11;
    });
  }

  // Closing note.
  if (y < 255) {
    doc.setDrawColor(193, 157, 87);
    doc.setLineWidth(0.2);
    doc.line(72, y + 3, 138, y + 3);

    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(112, 98, 78);
    doc.text(
      footerNote,
      105,
      y + 9,
      { align: 'center' },
    );
  }

  if (
    showTerms &&
    termsAndConditions
  ) {
    doc.addPage();

    doc.setFillColor(18, 24, 31);
    doc.rect(0, 0, 210, 36, 'F');

    if (work.profile.logoUrl) {
      try {
        doc.addImage(
          work.profile.logoUrl,
          15,
          8,
          20,
          20,
        );
      } catch {
        // Ignore invalid logo data.
      }
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(248, 245, 238);
    doc.text(
      businessName,
      work.profile.logoUrl ? 41 : PAGE_LEFT,
      18,
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(205, 176, 116);
    doc.text(
      'TERMS & CONDITIONS',
      work.profile.logoUrl ? 41 : PAGE_LEFT,
      26,
    );

    let termsY = 48;

    if (businessLegal) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(98, 98, 98);

      const legalLines =
        doc.splitTextToSize(
          businessLegal,
          CONTENT_WIDTH,
        );

      doc.text(
        legalLines,
        PAGE_LEFT,
        termsY,
      );

      termsY +=
        Math.max(10, legalLines.length * 4) +
        5;
    }

    doc.setDrawColor(193, 157, 87);
    doc.setLineWidth(0.25);
    doc.line(
      PAGE_LEFT,
      termsY,
      PAGE_RIGHT,
      termsY,
    );

    termsY += 10;

    const termParagraphs =
      termsAndConditions
        .split(/\n+/)
        .map((value) => value.trim())
        .filter(Boolean);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(56, 58, 62);

    termParagraphs.forEach(
      (paragraph, index) => {
        const text =
          termParagraphs.length > 1
            ? `${index + 1}. ${paragraph}`
            : paragraph;

        const lines =
          doc.splitTextToSize(
            text,
            CONTENT_WIDTH,
          );

        if (
          termsY +
            lines.length * 5 >
          270
        ) {
          doc.addPage();
          termsY = 24;
        }

        doc.text(
          lines,
          PAGE_LEFT,
          termsY,
        );

        termsY +=
          lines.length * 5 +
          5;
      },
    );
  }

  addFooter(
    doc,
    businessName,
    tagline,
  );

  const fileBase =
    safeName(
      work.event.eventName ||
        work.event.clientName ||
        'premium-event-menu',
    ) ||
    'premium-event-menu';

  const fileName =
    `${fileBase}-premium-menu.pdf`;

  doc.save(
    fileName,
  );

  return fileName;
}
