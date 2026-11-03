import type { LlmConfig } from '../lib/config';

/**
 * Minimal chat client for a LOCAL model. Two wire formats:
 *  - ollama: native /api/chat (lets us switch Qwen's thinking off and
 *    reports exact prompt/eval token counts);
 *  - openai: /chat/completions on any OpenAI-compatible server, e.g.
 *    llama.cpp `llama-server --jinja -m Qwen3.5-4B-Q4_K_M.gguf`.
 * No external API, no keys.
 */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /** Set when the model emitted arguments that are not a JSON object. */
  rawArguments?: string;
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export interface ChatResponse {
  content: string;
  thinking?: string;
  toolCalls: ToolCall[];
  promptTokens: number | null;
  outputTokens: number | null;
  ms: number;
}

export interface ChatModel {
  readonly label: string;
  chat(messages: ChatMessage[], tools: ToolSpec[], opts?: { seed?: number }): Promise<ChatResponse>;
}

const parseArgs = (raw: unknown): { args: Record<string, unknown>; raw?: string } => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { args: raw as Record<string, unknown> };
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw || '{}');
      if (v && typeof v === 'object' && !Array.isArray(v)) return { args: v };
    } catch {
      /* fall through */
    }
    return { args: {}, raw };
  }
  return { args: {} };
};

/** Qwen sometimes leaves <think> blocks in content even with thinking off. */
const stripThink = (s: string) => s.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

export function createChatModel(cfg: LlmConfig): ChatModel {
  return cfg.provider === 'openai' ? openAiModel(cfg) : ollamaModel(cfg);
}

function ollamaModel(cfg: LlmConfig): ChatModel {
  return {
    label: `ollama:${cfg.model}`,
    async chat(messages, tools, opts = {}) {
      const started = Date.now();
      const body = {
        model: cfg.model,
        stream: false,
        think: cfg.think,
        options: { temperature: cfg.temperature, top_p: 0.8, top_k: 20, num_ctx: cfg.numCtx, ...(opts.seed != null ? { seed: opts.seed } : {}) },
        tools: tools.map((t) => ({ type: 'function', function: t })),
        messages: messages.map((m) =>
          m.role === 'assistant'
            ? { role: 'assistant', content: m.content, tool_calls: m.toolCalls?.map((c) => ({ function: { name: c.name, arguments: c.arguments } })) }
            : m.role === 'tool'
              ? { role: 'tool', tool_name: m.name, content: m.content }
              : m,
        ),
      };
      const res = await fetch(`${cfg.baseUrl}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const j = (await res.json()) as {
        message: { content?: string; thinking?: string; tool_calls?: { function: { name: string; arguments: unknown } }[] };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      return {
        content: stripThink(j.message.content ?? ''),
        thinking: j.message.thinking,
        toolCalls: (j.message.tool_calls ?? []).map((c, i) => {
          const { args, raw } = parseArgs(c.function.arguments);
          return { id: `call_${i}`, name: c.function.name, arguments: args, ...(raw ? { rawArguments: raw } : {}) };
        }),
        promptTokens: j.prompt_eval_count ?? null,
        outputTokens: j.eval_count ?? null,
        ms: Date.now() - started,
      };
    },
  };
}

function openAiModel(cfg: LlmConfig): ChatModel {
  return {
    label: `openai-compatible:${cfg.model}@${cfg.baseUrl}`,
    async chat(messages, tools, opts = {}) {
      const started = Date.now();
      const body = {
        model: cfg.model,
        temperature: cfg.temperature,
        top_p: 0.8,
        ...(opts.seed != null ? { seed: opts.seed } : {}),
        // llama.cpp: forwarded to Qwen's chat template to switch thinking on/off.
        chat_template_kwargs: { enable_thinking: cfg.think },
        tools: tools.map((t) => ({ type: 'function', function: t })),
        messages: messages.map((m) =>
          m.role === 'assistant'
            ? {
                role: 'assistant',
                content: m.content,
                ...(m.toolCalls?.length
                  ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.arguments) } })) }
                  : {}),
              }
            : m.role === 'tool'
              ? { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
              : m,
        ),
      };
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Model server ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const j = (await res.json()) as {
        choices: { message: { content?: string | null; reasoning_content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const msg = j.choices[0]?.message ?? {};
      return {
        content: stripThink(msg.content ?? ''),
        thinking: msg.reasoning_content,
        toolCalls: (msg.tool_calls ?? []).map((c, i) => {
          const { args, raw } = parseArgs(c.function.arguments);
          return { id: c.id ?? `call_${i}`, name: c.function.name, arguments: args, ...(raw ? { rawArguments: raw } : {}) };
        }),
        promptTokens: j.usage?.prompt_tokens ?? null,
        outputTokens: j.usage?.completion_tokens ?? null,
        ms: Date.now() - started,
      };
    },
  };
}
