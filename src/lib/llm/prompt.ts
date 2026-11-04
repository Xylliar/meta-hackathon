import {
  BLOCK_TYPES,
  CARD_KINDS,
  VISUAL_KINDS,
  type BlockType,
  type CardKind,
  type CardVisual,
  type CourseBlock,
  type CourseSection,
  type VisualKind,
} from "../types";
import type { GeneratedCard, GeneratedQuestion, StudyMaterial, StudyMaterialInput } from "./types";

export const SYSTEM_PROMPT = `Tu es un professeur particulier expert en méthodes de révision. Un élève t'envoie les photos de ses notes de cours (manuscrites ou imprimées, parfois de travers, raturées, avec des schémas). Transforme-les en un support de révision parfait, en trois parties que l'élève utilisera dans cet ordre :
1. il LIT le cours restructuré (sections) ;
2. il s'interroge avec des FLASHCARDS, puis répond honnêtement « je connais » ou « je ne connais pas » ; les cartes non sues reviennent jusqu'à ce qu'elles soient sues ;
3. il vérifie sa compréhension avec un QUIZ.

RÈGLE D'OR : FIDÉLITÉ
- N'utilise que ce qui figure sur les photos. N'invente aucune définition, date, formule, valeur ou exemple.
- Tu peux reformuler pour clarifier, corriger l'orthographe et terminer une phrase évidemment tronquée, jamais ajouter une notion absente.
- Si un passage est illisible, écris [illisible] plutôt que de deviner.
- Écris les formules en Unicode lisible (x², x₁, √Δ, ≤, ≥, ≠, →, ⇔, α, β, π, Σ, ∫, ½), jamais en LaTeX ni avec des $.

AVANT D'ÉCRIRE
Lis toutes les photos en entier et dans l'ordre : titres, marges, encadrés, flèches, schémas, exemples, exercices corrigés. Repère le plan (I/II, A/B, 1/2/3) et ce que le professeur a souligné, encadré ou mis en couleur : ce sont les notions clés.

PARTIE 1 — LE COURS À LIRE
"title" : titre court du chapitre (celui des notes s'il existe).
"essentials" : 3 à 5 phrases courtes : ce qu'il faut absolument retenir si on n'avait que 30 secondes.
"sections" : le cours restructuré pour être relu vite et bien, en suivant le plan des notes.
- 2 à 6 sections ; "title" court et explicite (pas de numérotation).
- 2 à 6 blocs par section. Phrases courtes, une idée par phrase, 3 phrases maximum par bloc.
- Mise en valeur dans "text" (et dans "essentials") :
  - **gras** pour les termes et notions clés, 1 à 4 par bloc (au-delà, plus rien ne ressort) ;
  - ==surligné== pour LA phrase ou la valeur à connaître par cœur, au plus une par bloc.
- Types de blocs ("type") et champs utilisés :
  - "definition" : title = le terme ; text = sa définition exacte.
  - "formula" : title = la formule ; text = quand et comment l'utiliser ; items = chaque symbole (label) et sa signification (value).
  - "keypoint" : à retenir absolument (propriété, théorème, règle, idée principale) ; title facultatif.
  - "example" : exemple ou exercice type du cours, avec sa solution si elle est donnée.
  - "warning" : piège classique, erreur fréquente, confusion à éviter.
  - "list" : énumération ; title = intitulé ; items.label = élément, items.value = précision ou "".
  - "steps" : méthode ou processus ordonné ; items.label = étape, items.value = détail ou "".
  - "timeline" : chronologie ; items.label = date, items.value = événement.
  - "compare" : deux notions ; items[0] = { label: notion A, value: notion B }, puis une ligne par différence (label = côté A, value = côté B).
  - "quote" : citation exacte ; text = la citation, title = auteur et œuvre.
  - "text" : courte explication quand aucun autre type ne convient.
  Mets "" ou [] dans les champs inutilisés.
- Privilégie les blocs structurés (definition, formula, keypoint, steps…) au texte libre : c'est ce qui rend la relecture rapide.

PARTIE 2 — LES FLASHCARDS
- 1 flashcard = 1 seule notion (information minimale). Si la réponse contient deux informations, fais deux cartes.
- Couvre toutes les notions importantes des sections : chaque définition, formule, date, propriété, méthode et piège a sa carte. Chaque section a au moins une carte. 8 à 25 cartes selon la densité du cours.
- "section" : indice (à partir de 0) de la section dont vient la carte. Range les cartes dans l'ordre des sections.
- "question" (recto) : une vraie question précise, qui n'admet qu'une bonne réponse, 20 mots maximum. Pas de question oui/non, pas de « Parle de… ». Varie les tournures : « Qu'est-ce que… ? », « Quelle formule donne… ? », « En quelle année… ? », « Quelle différence entre… ? », « Que faut-il faire en premier pour… ? ».
- "answer" (verso) : la réponse la plus courte possible, idéalement moins de 15 mots : un terme, une valeur, une formule, une phrase. Elle apporte l'information à retenir et ne reformule jamais la question. Les détails vont dans "visual", "example" ou "mnemonic".
- "keywords" : 1 à 3 mots ou expressions recopiés à l'identique depuis "answer", à surligner.
- "kind" : definition, formule, date, schema (processus, méthode), comparaison, oeuvre (auteur et œuvre), citation, vocabulaire, plan (plan de chapitre ou d'argumentation), erreur (piège à éviter).
- "emoji" : un seul emoji concret et évocateur du contenu (🧬 ADN, ⚡ énergie, 📐 géométrie, 🏰 Bastille), pas un emoji générique.
- "visual" : mini-schéma du verso, mêmes règles que les blocs du même nom : "steps", "timeline", "compare", "formula" ou "list" quand il aide à mémoriser, sinon "none" (title "", items []). Environ un tiers des cartes en ont un. Il complète la réponse sans la répéter.
- "mnemonic" : une astuce mémo seulement si elle est vraiment efficace (acronyme, phrase, image mentale, rime), sinon "".
- "example" : un exemple concret tiré du cours quand il aide, sinon "".
- Une carte "erreur" pour chaque piège signalé dans le cours : question = « Quelle erreur éviter quand… ? » ou « Pourquoi … est-il faux ? », answer = la règle correcte en une phrase.
- Quand c'est utile, 1 ou 2 cartes inversées (donner le terme à partir de sa définition).

PARTIE 3 — LE QUIZ
- 4 à 8 QCM qui vérifient la compréhension et l'application : cas concrets, petits calculs, « que se passe-t-il si… ». Ne recopie pas les flashcards.
- "section" : indice de la section concernée.
- "answer" : LA bonne réponse, vérifiée (refais le calcul ou relis le cours avant de l'écrire).
- "distractors" : exactement 3 mauvaises réponses de longueur comparable à "answer", qui sont des erreurs plausibles d'élève (confusion entre deux notions, erreur de signe, date voisine), jamais absurdes, et toutes réellement fausses.
- L'application mélange elle-même l'ordre des choix : dans "explanation", ne parle jamais de leur position (« la première », « la réponse B »).
- "explanation" : 1 à 2 phrases qui disent pourquoi "answer" est juste et, si possible, pourquoi le piège principal est faux. Elle doit être cohérente avec "answer".

VÉRIFICATION FINALE
- Chaque section a au moins une flashcard ; chaque indice "section" existe.
- Chaque mot de "keywords" apparaît tel quel dans "answer".
- Pour chaque QCM, "answer" est juste, les 3 "distractors" sont faux, et "explanation" justifie bien "answer".
- Aucune formule en LaTeX, aucun contenu inventé.
- Tout est dans la langue du cours (français par défaut).`;

export function userPrompt(input: StudyMaterialInput): string {
  const title = input.courseTitle.trim() ? `Titre donné par l'élève : ${input.courseTitle}` : "Pas de titre donné : propose-le.";
  return `Matière : ${input.subjectName}\n${title}\nNombre de photos : ${input.images.length} (dans l'ordre des pages)`;
}

const str = { type: "string" } as const;
const strings = { type: "array", items: str } as const;
const pairs = {
  type: "array",
  items: { type: "object", properties: { label: str, value: str }, required: ["label", "value"], additionalProperties: false },
} as const;
const index = { type: "integer" } as const;

/** JSON schema sent with the request so the model's answer always has this shape. */
export const STUDY_MATERIAL_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    essentials: strings,
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: { type: { type: "string", enum: [...BLOCK_TYPES] }, title: str, text: str, items: pairs },
              required: ["type", "title", "text", "items"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "blocks"],
        additionalProperties: false,
      },
    },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: index,
          kind: { type: "string", enum: [...CARD_KINDS] },
          emoji: str,
          question: str,
          answer: str,
          keywords: strings,
          visual: {
            type: "object",
            properties: { kind: { type: "string", enum: [...VISUAL_KINDS] }, title: str, items: pairs },
            required: ["kind", "title", "items"],
            additionalProperties: false,
          },
          mnemonic: str,
          example: str,
        },
        required: ["section", "kind", "emoji", "question", "answer", "keywords", "visual", "mnemonic", "example"],
        additionalProperties: false,
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: { section: index, question: str, answer: str, distractors: strings, explanation: str },
        required: ["section", "question", "answer", "distractors", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "essentials", "sections", "flashcards", "questions"],
  additionalProperties: false,
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const list = (v: unknown) => (Array.isArray(v) ? v : []);
const parsePairs = (v: unknown) =>
  list(v)
    .filter(isRecord)
    .map((i) => ({ label: text(i.label), value: text(i.value) }))
    .filter((i) => i.label || i.value);

/** Removes LaTeX dollar delimiters if the model used them anyway (but leaves prices like "5 $" alone). */
const unLatex = (s: string) => s.replace(/\$\$?([^$]*[\\^_{}][^$]*)\$\$?/g, "$1");

function parseVisual(v: unknown): CardVisual {
  const none: CardVisual = { kind: "none", title: "", items: [] };
  if (!isRecord(v) || !VISUAL_KINDS.includes(v.kind as VisualKind)) return none;
  const kind = v.kind as VisualKind;
  const items = parsePairs(v.items).slice(0, 8);
  // A diagram with nothing to draw is noise.
  if (kind === "formula") return text(v.title) ? { kind, title: unLatex(text(v.title)), items } : none;
  if (items.length < 2) return none;
  return { kind, title: text(v.title), items };
}

function parseBlock(b: unknown): CourseBlock | null {
  if (!isRecord(b)) return null;
  const block: CourseBlock = {
    type: BLOCK_TYPES.includes(b.type as BlockType) ? (b.type as BlockType) : "text",
    title: unLatex(text(b.title)),
    text: unLatex(text(b.text)),
    items: parsePairs(b.items),
  };
  return block.title || block.text || block.items.length ? block : null;
}

function parseSection(s: unknown): CourseSection | null {
  if (!isRecord(s)) return null;
  const blocks = list(s.blocks).map(parseBlock).filter((b) => b !== null);
  return blocks.length ? { title: text(s.title), blocks } : null;
}

/** Keeps a section index valid even if the model miscounted. */
const clampSection = (v: unknown, count: number) => Math.min(Math.max(0, Math.trunc(Number(v)) || 0), Math.max(0, count - 1));

function parseCard(c: unknown, sectionCount: number): GeneratedCard | null {
  if (!isRecord(c)) return null;
  const question = text(c.question);
  const answer = unLatex(text(c.answer));
  if (!question || !answer) return null;
  return {
    section: clampSection(c.section, sectionCount),
    kind: CARD_KINDS.includes(c.kind as CardKind) ? (c.kind as CardKind) : "definition",
    emoji: text(c.emoji).slice(0, 8),
    question: unLatex(question),
    answer,
    // Only keep keywords that can actually be found in the answer, so highlighting works.
    keywords: list(c.keywords)
      .map(text)
      .filter((k) => k && answer.toLocaleLowerCase("fr").includes(k.toLocaleLowerCase("fr")))
      .slice(0, 3),
    visual: parseVisual(c.visual),
    mnemonic: text(c.mnemonic),
    example: unLatex(text(c.example)),
  };
}

/** Stable pseudo-random position, so the right answer isn't always in the same place. */
function positionFor(seed: string, slots: number): number {
  let h = 5381;
  for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h % slots;
}

/**
 * The model gives the right answer as text plus wrong ones, and we place it among
 * them: asking it for an index made it point at the wrong choice now and then.
 */
function parseQuestion(q: unknown, sectionCount: number): GeneratedQuestion | null {
  if (!isRecord(q) || !text(q.question)) return null;
  let choices: string[];
  let answerIndex: number;
  if (typeof q.answer === "string") {
    const answer = unLatex(text(q.answer));
    const distractors = [...new Set(list(q.distractors).map(text).filter(Boolean).map(unLatex))].filter((d) => d !== answer).slice(0, 5);
    if (!answer || distractors.length === 0) return null;
    answerIndex = positionFor(text(q.question), distractors.length + 1);
    choices = [...distractors.slice(0, answerIndex), answer, ...distractors.slice(answerIndex)];
  } else {
    // Older shape (choices + answerIndex), still accepted in case the model falls back to it.
    choices = list(q.choices).map(text).filter(Boolean).map(unLatex);
    answerIndex = Number(q.answerIndex);
    if (choices.length < 2 || choices.length > 6) return null;
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) return null;
  }
  return {
    section: clampSection(q.section, sectionCount),
    question: unLatex(text(q.question)),
    choices,
    answerIndex,
    explanation: unLatex(text(q.explanation)),
  };
}

/**
 * Validates the model's answer. Models sometimes wrap JSON in a ```json fence
 * or add a sentence around it, so we extract the outermost object first.
 */
export function parseStudyMaterial(raw: string, fallbackTitle: string): StudyMaterial {
  const startIdx = raw.indexOf("{");
  const endIdx = raw.lastIndexOf("}");
  if (startIdx === -1 || endIdx <= startIdx) throw new Error("La réponse du modèle ne contient pas de JSON.");

  const data = JSON.parse(raw.slice(startIdx, endIdx + 1)) as Record<string, unknown>;
  const sections = list(data.sections).map(parseSection).filter((s) => s !== null);
  const flashcards = list(data.flashcards).map((c) => parseCard(c, sections.length)).filter((c) => c !== null);
  if (flashcards.length === 0) throw new Error("Le modèle n'a produit aucune flashcard exploitable.");

  return {
    title: text(data.title) || fallbackTitle,
    essentials: list(data.essentials).map(text).filter(Boolean).slice(0, 6),
    sections,
    flashcards,
    questions: list(data.questions).map((q) => parseQuestion(q, sections.length)).filter((q) => q !== null),
  };
}
