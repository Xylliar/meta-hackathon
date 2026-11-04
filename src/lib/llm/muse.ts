import "server-only";
import { parseStudyMaterial, STUDY_MATERIAL_SCHEMA, SYSTEM_PROMPT, userPrompt } from "./prompt";
import type { LlmProvider } from "./types";

// Meta Model API, Chat Completions protocol: https://dev.meta.ai/docs/api-reference/chat-completions
const API_URL = "https://api.meta.ai/v1/chat/completions";
const MODEL = process.env.MUSE_MODEL || "muse-spark-1.3";
const TIMEOUT_MS = 180_000;

/** The docs call it MODEL_API_KEY; API_KEY is accepted too. */
export function museApiKey(): string | undefined {
  return (process.env.MODEL_API_KEY || process.env.API_KEY)?.trim() || undefined;
}

interface ChatCompletion {
  choices?: { finish_reason: string; message: { content: string | null; refusal: string | null } }[];
  error?: { message?: string };
}

export const museProvider: LlmProvider = {
  name: "muse",
  async generateStudyMaterial(input) {
    const key = museApiKey();
    if (!key) throw new Error("Clé API Muse absente du fichier .env.");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        // Reading handwriting and choosing good questions benefits from some reasoning;
        // max_tokens covers reasoning plus the visible answer.
        reasoning_effort: "medium",
        max_tokens: 32_000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "study_material", strict: true, schema: STUDY_MATERIAL_SCHEMA },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt(input) },
              ...input.images.map((img) => ({
                type: "image_url",
                image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
              })),
            ],
          },
        ],
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ChatCompletion;
    if (!res.ok) {
      const detail = data.error?.message ?? res.statusText;
      if (res.status === 401) throw new Error("Clé API refusée (401). Vérifie la clé dans .env.");
      if (res.status === 429) throw new Error("Trop de requêtes vers Muse (429). Réessaie dans un instant.");
      throw new Error(`Muse a répondu ${res.status} : ${detail}`);
    }

    const choice = data.choices?.[0];
    if (choice?.message.refusal) throw new Error(`Muse a refusé : ${choice.message.refusal}`);
    if (choice?.finish_reason === "length") throw new Error("La réponse de Muse a été coupée (cours trop long ?).");
    if (!choice?.message.content) throw new Error("Muse n'a renvoyé aucun contenu.");

    return parseStudyMaterial(choice.message.content, input.courseTitle.trim() || input.subjectName);
  },
};
