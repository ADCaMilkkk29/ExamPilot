import OpenAI from "openai";

type OutputSchema<T> = {
  jsonSchema: Record<string, unknown>;
  validate: (value: unknown) => T | undefined;
};

const requestTimeout = 8_000;

class InvalidModelOutput extends Error {}

export function modelFailure(error: unknown) {
  if (error instanceof InvalidModelOutput) return { status: 502, error: "模型返回了无效结果，请重试。" };
  if (error instanceof OpenAI.APIConnectionTimeoutError || error instanceof OpenAI.APIUserAbortError ||
      (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))) {
    return { status: 504, error: "模型响应超时，请重试。" };
  }
  return { status: 502, error: "暂时无法调用模型，请重试。" };
}

function createClient(timeout = requestTimeout) {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) throw new Error("LLM_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
    timeout,
    maxRetries: 0,
  });
}

export async function chatJSON<T>(prompt: string, schema: OutputSchema<T>, timeout = requestTimeout): Promise<T> {
  const client = createClient(timeout);
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const instruction = `只返回符合此 JSON Schema 的 JSON，不加代码围栏。\n${JSON.stringify(schema.jsonSchema)}`;
  let structured = true;

  for (let attempt = 0; attempt < 2; attempt++) {
    const request = {
      model,
      messages: [
        { role: "system" as const, content: instruction },
        { role: "user" as const, content: attempt ? `${prompt}\n请重新生成有效的 JSON。` : prompt },
      ],
    };
    const result = await client.chat.completions.create({
      ...request,
      response_format: structured ? {
        type: "json_schema",
        json_schema: { name: "exampilot_output", strict: true, schema: schema.jsonSchema },
      } : undefined,
    }, { signal: AbortSignal.timeout(timeout) }).catch((error: unknown) => {
      if (!structured || !(error instanceof OpenAI.APIError) ||
          ![400, 422, 501].includes(error.status ?? 0) ||
          !/response[_ ]format|json[_ ]schema|structured output/i.test(`${error.param} ${error.message}`)) throw error;
      structured = false;
      return client.chat.completions.create(request, { signal: AbortSignal.timeout(timeout) });
    }).catch((error: unknown) => {
      if (!(error instanceof SyntaxError)) throw error;
    });

    try {
      const value = schema.validate(JSON.parse(result?.choices?.[0]?.message?.content ?? ""));
      if (value !== undefined) return value;
    } catch {
      // Invalid JSON or a rejected value gets one more attempt.
    }
  }
  throw new InvalidModelOutput("Model response did not match the JSON schema");
}

export async function embedTexts(texts: string[], signal?: AbortSignal): Promise<number[][]> {
  if (!texts.length) return [];
  const timeout = AbortSignal.timeout(requestTimeout);
  const { data } = await createClient().embeddings.create({
    model: process.env.EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
    input: texts,
    encoding_format: "float",
  }, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const byIndex = new Map(data.map(({ index, embedding }) => [index, embedding]));
  const dimensions = byIndex.get(0)?.length;
  if (data.length !== texts.length || byIndex.size !== texts.length) {
    throw new Error("Embedding response did not match its inputs");
  }
  return texts.map((_, index) => {
    const vector = byIndex.get(index);
    if (!dimensions || !Array.isArray(vector) || vector.length !== dimensions ||
        !vector.every(Number.isFinite)) throw new Error("Invalid embedding");
    return vector;
  });
}
