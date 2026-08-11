type StructuredAiRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  instructions: string;
  input: string;
  maxOutputTokens: number;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

function trimBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function readOpenAIOutput(value: OpenAIResponse) {
  if (typeof value.output_text === 'string') return value.output_text;
  return (value.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text ?? '')
    .join('');
}

export function structuredAiProvider() {
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai' as const;
  return null;
}

async function requestOllama(options: StructuredAiRequest) {
  const baseUrl = trimBaseUrl(process.env.OLLAMA_BASE_URL?.trim() || '');
  const model = process.env.OLLAMA_MODEL?.trim() || 'qwen3:8b';
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE?.trim() || '30m',
      format: options.schema,
      messages: [
        { role: 'system', content: options.instructions },
        {
          role: 'user',
          content: [
            options.input,
            'Return JSON that follows this schema exactly:',
            JSON.stringify(options.schema),
          ].join('\n\n'),
        },
      ],
      options: {
        temperature: 0,
        num_predict: options.maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const body = await response.json() as OllamaResponse;
  const content = body.message?.content?.trim();
  if (!content) throw new Error('Ollama returned no structured output');
  return content;
}

async function requestOpenAI(options: StructuredAiRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OpenAI API key is not configured');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: process.env.OPENAI_MENU_MODEL?.trim() || 'gpt-5.6-sol',
      store: false,
      max_output_tokens: options.maxOutputTokens,
      instructions: options.instructions,
      input: [{
        role: 'user',
        content: [{ type: 'input_text', text: options.input }],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }

  const content = readOpenAIOutput(await response.json() as OpenAIResponse).trim();
  if (!content) throw new Error('OpenAI returned no structured output');
  return content;
}

export async function requestStructuredAi(options: StructuredAiRequest) {
  const provider = structuredAiProvider();
  if (provider === 'openai') return requestOpenAI(options);
  throw new Error('No structured AI provider is configured');
}
