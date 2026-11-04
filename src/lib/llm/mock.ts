import { parseStudyMaterial } from "./prompt";
import type { LlmProvider } from "./types";

/**
 * Offline stand-in used when no API key is configured. It returns the same JSON
 * shape the real model is asked for, so it goes through the same parser.
 */
export const mockProvider: LlmProvider = {
  name: "mock",
  async generateStudyMaterial({ subjectName, courseTitle, images }) {
    await new Promise((r) => setTimeout(r, 800));
    const title = courseTitle.trim() || `${subjectName} — cours du jour`;
    const none = { kind: "none", title: "", items: [] };
    const block = (type: string, blockTitle: string, text: string, items: { label: string; value: string }[] = []) => ({ type, title: blockTitle, text, items });

    const raw = JSON.stringify({
      title,
      essentials: [
        `Contenu d'exemple généré sans IA (${images.length} photo${images.length > 1 ? "s" : ""} reçue${images.length > 1 ? "s" : ""}).`,
        "Ajoute ta clé API Muse dans **.env** pour obtenir le vrai contenu.",
      ],
      sections: [
        {
          title: "Notions clés",
          blocks: [
            block("definition", "Notion 1", "La **définition principale** du chapitre, ==à connaître par cœur==."),
            block("keypoint", "", "Une **propriété importante** à retenir."),
          ],
        },
        {
          title: "Méthode",
          blocks: [
            block("steps", "", "", [
              { label: "Étape A", value: "" },
              { label: "Étape B", value: "" },
              { label: "Étape C", value: "" },
            ]),
            block("warning", "", "Ne pas confondre la **notion 1** et la **notion 2**."),
          ],
        },
      ],
      flashcards: [
        { section: 0, kind: "definition", emoji: "📘", question: "Quelle est la notion 1 ?", answer: "La définition principale du chapitre.", keywords: ["définition principale"], visual: none, mnemonic: "", example: "" },
        {
          section: 1,
          kind: "schema",
          emoji: "🔁",
          question: "Quelles sont les étapes de la méthode ?",
          answer: "A, puis B, puis C.",
          keywords: [],
          visual: { kind: "steps", title: "", items: [{ label: "Étape A", value: "" }, { label: "Étape B", value: "" }, { label: "Étape C", value: "" }] },
          mnemonic: "Dans l'ordre de l'alphabet.",
          example: "",
        },
        { section: 1, kind: "erreur", emoji: "⚠️", question: "Quelle erreur éviter avec la notion 2 ?", answer: "La confondre avec la notion 1.", keywords: ["confondre"], visual: none, mnemonic: "", example: "" },
      ],
      questions: [
        {
          section: 0,
          question: "Exemple de question : quelle affirmation est correcte ?",
          answer: "Affirmation correcte",
          distractors: ["Affirmation fausse", "Autre affirmation fausse", "Encore une fausse"],
          explanation: "Question d'exemple : branche la clé Muse pour de vraies questions.",
        },
      ],
    });

    return parseStudyMaterial(raw, title);
  },
};
