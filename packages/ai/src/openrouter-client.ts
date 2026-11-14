import { z } from 'zod';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  /** Sent as HTTP-Referer / X-Title for OpenRouter app attribution. */
  appUrl?: string;
  appName?: string;
  timeoutMs?: number;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export interface Usage {
  costUsd: number | null;
  model: string | null;
}

type ChatContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
      | { type: 'input_audio'; input_audio: { data: string; format: string } }
    >;

export interface ChatJsonOptions<T extends z.ZodType> {
  /** First model is primary; the rest are OpenRouter fallbacks. */
  models: string[];
  system: string;
  user: ChatContent;
  schema: T;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
  /** Stable end-user id (hashed by OpenRouter) for abuse tracking. */
  userId?: string;
}

export interface ImageOptions {
  model: string;
  prompt: string;
  aspectRatio?: string;
  resolution?: '1K' | '2K' | '4K';
  references?: string[];
  background?: 'auto' | 'transparent' | 'opaque';
  outputFormat?: 'png' | 'jpeg' | 'webp';
  userId?: string;
}

export interface VideoSubmitOptions {
  model: string;
  prompt: string;
  durationSec: number;
  resolution: string;
  aspectRatio: string;
  firstFrameUrl?: string;
  generateAudio?: boolean;
  callbackUrl?: string;
}

export type VideoJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';

export class OpenRouterClient {
  private readonly baseUrl: string;

  constructor(private readonly config: OpenRouterConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...(this.config.appUrl ? { 'HTTP-Referer': this.config.appUrl } : {}),
      ...(this.config.appName ? { 'X-Title': this.config.appName } : {}),
    };
  }

  private async request<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(init.timeoutMs ?? this.config.timeoutMs ?? 60_000),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    if (!res.ok) {
      const message =
        (body as { error?: { message?: string } } | null)?.error?.message ?? `OpenRouter ${res.status}`;
      throw new OpenRouterError(message, res.status, body);
    }
    return body as T;
  }

  /**
   * Structured output: asks the model for JSON matching `schema`, validates with Zod,
   * and retries once with the validation error if the model drifts.
   */
  async chatJson<T extends z.ZodType>(opts: ChatJsonOptions<T>): Promise<{ data: z.infer<T>; usage: Usage }> {
    const jsonSchema = strictify(z.toJSONSchema(opts.schema, { target: 'draft-7' }));
    const messages: Array<{ role: string; content: ChatContent }> = [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ];

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.request<{
        model?: string;
        choices: Array<{ message: { content: string | null } }>;
        usage?: { cost?: number };
      }>('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: opts.models[0],
          models: opts.models.length > 1 ? opts.models : undefined,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 1500,
          response_format: {
            type: 'json_schema',
            json_schema: { name: opts.schemaName, strict: true, schema: jsonSchema },
          },
          provider: { require_parameters: true },
          usage: { include: true },
          user: opts.userId,
        }),
      });

      const raw = res.choices[0]?.message.content ?? '';
      const parsed = opts.schema.safeParse(safeJson(raw));
      const usage: Usage = { costUsd: res.usage?.cost ?? null, model: res.model ?? null };
      if (parsed.success) return { data: parsed.data, usage };

      messages.push(
        { role: 'assistant', content: raw },
        {
          role: 'user',
          content: `That JSON did not match the schema: ${parsed.error.message}. Reply with corrected JSON only.`,
        },
      );
    }
    throw new OpenRouterError('Model returned invalid JSON twice', 502);
  }

  async generateImage(opts: ImageOptions): Promise<{ buffer: Buffer; mediaType: string; usage: Usage }> {
    const res = await this.request<{
      data: Array<{ b64_json: string; media_type?: string }>;
      usage?: { cost?: number };
    }>('/images', {
      method: 'POST',
      timeoutMs: 120_000,
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        n: 1,
        aspect_ratio: opts.aspectRatio,
        resolution: opts.resolution,
        background: opts.background,
        output_format: opts.outputFormat,
        input_references: opts.references?.map((url) => ({ type: 'image_url', image_url: { url } })),
        user: opts.userId,
      }),
    });
    const first = res.data[0];
    if (!first) throw new OpenRouterError('No image returned', 502, res);
    return {
      buffer: Buffer.from(first.b64_json, 'base64'),
      mediaType: first.media_type ?? 'image/png',
      usage: { costUsd: res.usage?.cost ?? null, model: opts.model },
    };
  }

  async submitVideo(opts: VideoSubmitOptions): Promise<{ id: string; status: VideoJobStatus }> {
    return this.request<{ id: string; status: VideoJobStatus }>('/videos', {
      method: 'POST',
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        duration: opts.durationSec,
        resolution: opts.resolution,
        aspect_ratio: opts.aspectRatio,
        generate_audio: opts.generateAudio ?? false,
        callback_url: opts.callbackUrl,
        frame_images: opts.firstFrameUrl
          ? [{ type: 'image_url', image_url: { url: opts.firstFrameUrl }, frame_type: 'first_frame' }]
          : undefined,
      }),
    });
  }

  async getVideo(jobId: string): Promise<{
    status: VideoJobStatus;
    urls: string[];
    error: string | null;
    costUsd: number | null;
  }> {
    const res = await this.request<{
      status: VideoJobStatus;
      unsigned_urls?: string[];
      error?: string;
      usage?: { cost?: number };
    }>(`/videos/${encodeURIComponent(jobId)}`);
    return {
      status: res.status,
      urls: res.unsigned_urls ?? [],
      error: res.error ?? null,
      costUsd: res.usage?.cost ?? null,
    };
  }

  async download(url: string): Promise<Buffer> {
    const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new OpenRouterError(`Download failed (${res.status})`, res.status);
    return Buffer.from(await res.arrayBuffer());
  }
}

/** Strict structured-output mode needs closed objects with every property required. */
function strictify(node: unknown): Record<string, unknown> {
  if (Array.isArray(node)) return node.map(strictify) as unknown as Record<string, unknown>;
  if (!node || typeof node !== 'object') return node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    out[k] = typeof v === 'object' && v !== null ? strictify(v) : v;
  }
  if (out.type === 'object' && out.properties && typeof out.properties === 'object') {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties);
  }
  delete out.$schema;
  return out;
}

function safeJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
