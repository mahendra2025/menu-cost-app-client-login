import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { CATEGORIES } from '../../../../lib/menuCategories';

const MAX_MENU_CHARACTERS = 50_000;
const DEFAULT_MODEL = 'gpt-5.6-sol';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function readOutputText(value: OpenAIResponse) {
  if (typeof value.output_text === 'string') {
    return value.output_text;
  }

  return (value.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text ?? '')
    .join('');
}

export async function POST(request: Request) {
  const tenantId = await requireClientTenantId();

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Client login required' },
      { status: 401 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI menu detection is not configured' },
      { status: 503 },
    );
  }

  let menuText = '';

  try {
    const body = (await request.json()) as {
      menuText?: unknown;
    };
    menuText = String(body.menuText ?? '').trim();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!menuText) {
    return NextResponse.json(
      { error: 'Menu text is required' },
      { status: 400 },
    );
  }

  if (menuText.length > MAX_MENU_CHARACTERS) {
    return NextResponse.json(
      { error: 'Menu text is too long' },
      { status: 413 },
    );
  }

  try {
    const openAIResponse = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_MENU_MODEL?.trim() ||
            DEFAULT_MODEL,
          store: false,
          max_output_tokens: 8_000,
          instructions: [
            'You extract structured catering menus from OCR or pasted text.',
            'The source may contain English, Hindi, Gujarati, transliteration, spelling errors, columns, headers, addresses, and decorative text.',
            'Return only real food or beverage dishes. Never treat people, venues, phone numbers, slogans, prices, package names, or generic sentences as dishes.',
            'Preserve the recognizable dish name, correcting obvious OCR spacing and spelling only when confident.',
            'Group dishes by day and meal/function. Use Event Menu when no meal is stated.',
            'Use only one of the allowed categories in the schema.',
            'Extract event fields only when they are supported by the source. Use null otherwise.',
            'Return dates as YYYY-MM-DD when a complete date is present; otherwise use null.',
            'Guest counts must be positive whole numbers or null.',
            'Do not invent menu items or event details.',
          ].join('\n'),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: menuText,
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'catering_menu_extraction',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'eventDetails',
                  'services',
                ],
                properties: {
                  eventDetails: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                      'clientName',
                      'eventName',
                      'eventDate',
                      'functionType',
                      'city',
                      'venue',
                      'pax',
                    ],
                    properties: {
                      clientName: {
                        type: ['string', 'null'],
                      },
                      eventName: {
                        type: ['string', 'null'],
                      },
                      eventDate: {
                        type: ['string', 'null'],
                      },
                      functionType: {
                        type: ['string', 'null'],
                      },
                      city: {
                        type: ['string', 'null'],
                      },
                      venue: {
                        type: ['string', 'null'],
                      },
                      pax: {
                        type: ['integer', 'null'],
                        minimum: 1,
                      },
                    },
                  },
                  services: {
                    type: 'array',
                    maxItems: 100,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: [
                        'dayLabel',
                        'mealLabel',
                        'pax',
                        'dishes',
                      ],
                      properties: {
                        dayLabel: {
                          type: ['string', 'null'],
                        },
                        mealLabel: {
                          type: 'string',
                        },
                        pax: {
                          type: ['integer', 'null'],
                          minimum: 1,
                        },
                        dishes: {
                          type: 'array',
                          maxItems: 300,
                          items: {
                            type: 'object',
                            additionalProperties: false,
                            required: [
                              'name',
                              'category',
                            ],
                            properties: {
                              name: {
                                type: 'string',
                              },
                              category: {
                                type: 'string',
                                enum: CATEGORIES,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      },
    );

    if (!openAIResponse.ok) {
      console.error(
        'OpenAI menu extraction failed:',
        openAIResponse.status,
      );

      return NextResponse.json(
        { error: 'AI menu detection is temporarily unavailable' },
        { status: 502 },
      );
    }

    const responseBody =
      (await openAIResponse.json()) as OpenAIResponse;
    const outputText = readOutputText(responseBody);

    if (!outputText) {
      throw new Error('OpenAI returned no structured menu');
    }

    const extraction = JSON.parse(outputText) as unknown;

    return NextResponse.json({ extraction });
  } catch (error) {
    console.error('AI menu extraction error:', error);

    return NextResponse.json(
      { error: 'AI menu detection failed' },
      { status: 502 },
    );
  }
}
