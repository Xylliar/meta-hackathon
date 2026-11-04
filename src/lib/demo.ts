import { newId, SUBJECT_COLORS } from "./actions";
import { addDays } from "./date";
import type { GeneratedCard, GeneratedQuestion } from "./llm/types";
import { materialToItems } from "./material";
import { emptyDb, type BlockType, type Course, type CourseBlock, type CourseSection, type DB, type ISODate } from "./types";

interface DemoCourse {
  title: string;
  daysAgo: number;
  essentials: string[];
  sections: CourseSection[];
  cards: GeneratedCard[];
  questions: GeneratedQuestion[];
}

const block = (type: BlockType, title: string, text: string, items: [string, string][] = []): CourseBlock => ({
  type,
  title,
  text,
  items: items.map(([label, value]) => ({ label, value })),
});

const card = (c: Partial<GeneratedCard> & Pick<GeneratedCard, "section" | "question" | "answer">): GeneratedCard => ({
  kind: "definition",
  emoji: "",
  keywords: [],
  visual: { kind: "none", title: "", items: [] },
  mnemonic: "",
  example: "",
  ...c,
});

const steps = (...labels: string[]) => ({ kind: "steps" as const, title: "", items: labels.map((label) => ({ label, value: "" })) });

const SUBJECTS: {
  name: string;
  slots: [number, string, string, string][];
  examIn: number;
  examTitle: string;
  courses: DemoCourse[];
}[] = [
  {
    name: "Biologie",
    slots: [
      [1, "08:00", "10:00", "B204"],
      [4, "14:00", "16:00", "Labo 2"],
    ],
    examIn: 6,
    examTitle: "Contrôle — la cellule",
    courses: [
      {
        title: "La cellule eucaryote",
        daysAgo: 7,
        essentials: [
          "Une cellule **eucaryote** a un ==noyau délimité par une enveloppe==.",
          "La **mitochondrie** produit l'énergie de la cellule (**ATP**).",
          "Une bactérie est **procaryote** : pas de noyau.",
        ],
        sections: [
          {
            title: "Qu'est-ce qu'une cellule eucaryote ?",
            blocks: [
              block("definition", "Cellule eucaryote", "Cellule qui possède un **noyau** ==délimité par une enveloppe nucléaire==, contenant l'ADN."),
              block("keypoint", "", "Animaux, plantes et champignons sont faits de cellules **eucaryotes**."),
              block("compare", "", "", [
                ["Eucaryote", "Procaryote"],
                ["Noyau délimité", "ADN libre"],
                ["Organites", "Pas d'organites"],
                ["Animaux, plantes", "Bactéries"],
              ]),
            ],
          },
          {
            title: "Les organites et leur rôle",
            blocks: [
              block("list", "Organites à connaître", "", [
                ["Mitochondrie", "produit l'ATP (respiration)"],
                ["Chloroplaste", "photosynthèse, cellules végétales"],
                ["Réticulum endoplasmique", "fabrique protéines et lipides"],
                ["Appareil de Golgi", "modifie et expédie les protéines"],
              ]),
              block("steps", "Trajet d'une protéine sécrétée", "", [
                ["Ribosome", ""],
                ["Réticulum", ""],
                ["Golgi", ""],
                ["Membrane", ""],
              ]),
              block("warning", "", "Les **chloroplastes** n'existent que dans les cellules **végétales**, pas animales."),
            ],
          },
        ],
        cards: [
          card({ section: 0, emoji: "🧫", question: "Qu'est-ce qui définit une cellule eucaryote ?", answer: "Un noyau délimité par une enveloppe nucléaire.", keywords: ["noyau"] }),
          card({
            section: 0,
            kind: "comparaison",
            emoji: "⚖️",
            question: "Quelle différence clé entre cellule eucaryote et procaryote ?",
            answer: "L'eucaryote a un noyau, la procaryote non.",
            keywords: ["noyau"],
            visual: {
              kind: "compare",
              title: "",
              items: [
                { label: "Eucaryote", value: "Procaryote" },
                { label: "Noyau délimité", value: "ADN libre" },
                { label: "Animaux, plantes", value: "Bactéries" },
              ],
            },
          }),
          card({ section: 0, kind: "erreur", emoji: "🦠", question: "Quelle erreur éviter à propos des bactéries ?", answer: "Croire qu'elles ont un noyau : elles sont procaryotes.", keywords: ["procaryotes"] }),
          card({
            section: 1,
            emoji: "⚡",
            question: "Quel organite produit l'énergie de la cellule ?",
            answer: "La mitochondrie, qui fabrique l'ATP.",
            keywords: ["mitochondrie", "ATP"],
            mnemonic: "Mito = moteur : la centrale électrique de la cellule.",
          }),
          card({ section: 1, emoji: "🌿", question: "Où a lieu la photosynthèse ?", answer: "Dans les chloroplastes.", keywords: ["chloroplastes"], example: "Les cellules des feuilles en sont remplies, d'où leur couleur verte." }),
          card({
            section: 1,
            kind: "schema",
            emoji: "📦",
            question: "Quel trajet suit une protéine destinée à être sécrétée ?",
            answer: "Ribosome → réticulum → Golgi → membrane.",
            keywords: ["Golgi"],
            visual: steps("Ribosome", "Réticulum", "Golgi", "Membrane"),
          }),
        ],
        questions: [
          {
            section: 0,
            question: "Une cellule observée au microscope n'a ni noyau ni mitochondrie. De quoi s'agit-il probablement ?",
            choices: ["Une cellule de feuille", "Une bactérie", "Un globule blanc", "Une cellule de levure"],
            answerIndex: 1,
            explanation: "L'absence de noyau et d'organites est la marque des procaryotes, comme les bactéries.",
          },
          {
            section: 1,
            question: "Pourquoi les cellules musculaires contiennent-elles beaucoup de mitochondries ?",
            choices: ["Pour stocker l'ADN", "Pour faire la photosynthèse", "Pour produire beaucoup d'ATP", "Pour fabriquer la membrane"],
            answerIndex: 2,
            explanation: "Les muscles consomment beaucoup d'énergie : les mitochondries produisent l'ATP nécessaire.",
          },
        ],
      },
      {
        title: "La division cellulaire",
        daysAgo: 2,
        essentials: [
          "La **mitose** donne ==2 cellules filles identiques==.",
          "Ses 4 phases : **prophase, métaphase, anaphase, télophase**.",
          "La **méiose** donne ==4 gamètes génétiquement différents==.",
        ],
        sections: [
          {
            title: "La mitose",
            blocks: [
              block("definition", "Mitose", "Division d'une cellule mère en ==deux cellules filles identiques==, pour la croissance et la réparation."),
              block("steps", "Les 4 phases", "", [
                ["Prophase", "les chromosomes se condensent"],
                ["Métaphase", "ils s'alignent au centre"],
                ["Anaphase", "les chromatides se séparent"],
                ["Télophase", "deux noyaux se forment"],
              ]),
            ],
          },
          {
            title: "La méiose",
            blocks: [
              block("definition", "Méiose", "Division qui produit ==4 cellules haploïdes== (les **gamètes**), génétiquement différentes."),
              block("warning", "", "Ne pas confondre : **mitose = copie**, **méiose = reproduction**."),
            ],
          },
        ],
        cards: [
          card({
            section: 0,
            kind: "schema",
            emoji: "🔄",
            question: "Quelles sont les 4 phases de la mitose, dans l'ordre ?",
            answer: "Prophase, métaphase, anaphase, télophase.",
            keywords: ["métaphase", "anaphase"],
            visual: steps("Prophase", "Métaphase", "Anaphase", "Télophase"),
            mnemonic: "« Pour Mon Anniversaire, Tarte ! » : P-M-A-T.",
          }),
          card({ section: 0, emoji: "📏", question: "Que se passe-t-il en métaphase ?", answer: "Les chromosomes s'alignent sur la plaque équatoriale.", keywords: ["plaque équatoriale"], mnemonic: "MÉtaphase = MÉdiane." }),
          card({ section: 0, emoji: "👯", question: "Combien de cellules produit une mitose, et comment sont-elles ?", answer: "Deux cellules filles identiques.", keywords: ["identiques"] }),
          card({
            section: 1,
            kind: "comparaison",
            emoji: "🧬",
            question: "Que produit la méiose, contrairement à la mitose ?",
            answer: "4 gamètes génétiquement différents.",
            keywords: ["4 gamètes"],
            visual: {
              kind: "compare",
              title: "",
              items: [
                { label: "Mitose", value: "Méiose" },
                { label: "2 cellules", value: "4 cellules" },
                { label: "Identiques", value: "Différentes" },
              ],
            },
          }),
        ],
        questions: [
          {
            section: 0,
            question: "Une plaie de la peau cicatrise. Quel type de division remplace les cellules ?",
            choices: ["La méiose", "La mitose", "La fécondation", "La photosynthèse"],
            answerIndex: 1,
            explanation: "La réparation des tissus produit des cellules identiques : c'est la mitose.",
          },
        ],
      },
    ],
  },
  {
    name: "Histoire",
    slots: [
      [2, "10:00", "12:00", "A101"],
      [5, "08:00", "09:00", "A101"],
    ],
    examIn: 13,
    examTitle: "Examen — la Révolution française",
    courses: [
      {
        title: "1789, la fin de l'Ancien Régime",
        daysAgo: 5,
        essentials: [
          "En 1789, la France passe de la **monarchie absolue** aux débuts d'une **monarchie constitutionnelle**.",
          "==14 juillet 1789== : prise de la **Bastille**.",
          "==26 août 1789== : **Déclaration des droits de l'homme et du citoyen**.",
        ],
        sections: [
          {
            title: "Les grandes dates de 1789",
            blocks: [
              block("timeline", "", "", [
                ["5 mai", "Ouverture des États généraux"],
                ["20 juin", "Serment du Jeu de paume"],
                ["14 juillet", "Prise de la Bastille"],
                ["4 août", "Abolition des privilèges"],
                ["26 août", "Déclaration des droits de l'homme"],
              ]),
              block("keypoint", "", "La nuit du **4 août** supprime la **société d'ordres** : c'est la ==fin de l'Ancien Régime==."),
            ],
          },
          {
            title: "La Déclaration des droits de l'homme",
            blocks: [
              block("quote", "Article 1 de la DDHC", "« Les hommes naissent et demeurent libres et égaux en droits. »"),
              block("text", "", "Elle affirme la **liberté**, l'**égalité devant la loi** et la **souveraineté de la nation**."),
            ],
          },
        ],
        cards: [
          card({
            section: 0,
            kind: "date",
            emoji: "🗓️",
            question: "Quels sont les 5 grands moments de 1789, dans l'ordre ?",
            answer: "États généraux, Jeu de paume, Bastille, privilèges, DDHC.",
            keywords: ["Bastille", "DDHC"],
            visual: {
              kind: "timeline",
              title: "",
              items: [
                { label: "5 mai", value: "États généraux" },
                { label: "20 juin", value: "Jeu de paume" },
                { label: "14 juillet", value: "Bastille" },
                { label: "4 août", value: "Abolition des privilèges" },
                { label: "26 août", value: "DDHC" },
              ],
            },
          }),
          card({ section: 0, kind: "date", emoji: "🏰", question: "Quand a lieu la prise de la Bastille ?", answer: "Le 14 juillet 1789.", keywords: ["14 juillet 1789"], example: "C'est devenu la fête nationale." }),
          card({ section: 0, kind: "date", emoji: "✋", question: "Qu'est-ce que le serment du Jeu de paume ?", answer: "Les députés jurent de donner une constitution à la France.", keywords: ["constitution"] }),
          card({
            section: 1,
            kind: "citation",
            emoji: "📜",
            question: "Que dit l'article 1 de la DDHC ?",
            answer: "« Les hommes naissent et demeurent libres et égaux en droits. »",
            keywords: ["libres et égaux"],
          }),
        ],
        questions: [
          {
            section: 0,
            question: "Pourquoi la nuit du 4 août 1789 marque-t-elle la fin de l'Ancien Régime ?",
            choices: ["Le roi est exécuté", "Les privilèges sont abolis", "La Bastille est prise", "La République est proclamée"],
            answerIndex: 1,
            explanation: "L'abolition des privilèges supprime la société d'ordres, base de l'Ancien Régime.",
          },
          {
            section: 0,
            question: "Dans quel ordre se sont déroulés ces événements ?",
            choices: ["Bastille, Jeu de paume, DDHC", "Jeu de paume, Bastille, DDHC", "DDHC, Bastille, Jeu de paume", "Jeu de paume, DDHC, Bastille"],
            answerIndex: 1,
            explanation: "20 juin (Jeu de paume), 14 juillet (Bastille), 26 août (DDHC).",
          },
        ],
      },
    ],
  },
  {
    name: "Mathématiques",
    slots: [
      [1, "10:00", "12:00", "C302"],
      [3, "08:00", "10:00", "C302"],
    ],
    examIn: 20,
    examTitle: "Partiel — dérivées",
    courses: [
      {
        title: "Dérivées usuelles",
        daysAgo: 3,
        essentials: [
          "==(xⁿ)' = n·xⁿ⁻¹== : l'exposant descend devant.",
          "L'**exponentielle** est sa propre dérivée : ==(eˣ)' = eˣ==.",
          "Produit : ==(u·v)' = u'v + uv'==, jamais u'·v'.",
        ],
        sections: [
          {
            title: "Dérivées de référence",
            blocks: [
              block("formula", "(xⁿ)' = n·xⁿ⁻¹", "Pour toute puissance entière : l'**exposant descend** devant et ==diminue de 1==.", [["n", "exposant"]]),
              block("list", "À connaître par cœur", "", [
                ["(eˣ)'", "eˣ"],
                ["(ln x)'", "1/x"],
                ["(sin x)'", "cos x"],
                ["(cos x)'", "−sin x"],
              ]),
              block("example", "Exemple", "(x³)' = **3x²** et (5x⁴)' = 5 × 4x³ = **20x³**."),
            ],
          },
          {
            title: "Dériver un produit",
            blocks: [
              block("formula", "(u·v)' = u'v + uv'", "On dérive **chacun son tour**, l'autre reste tel quel.", [["u, v", "deux fonctions dérivables"]]),
              block("warning", "", "Erreur classique : ==(u·v)' n'est pas u'·v'==."),
            ],
          },
        ],
        cards: [
          card({
            section: 0,
            kind: "formule",
            emoji: "📈",
            question: "Quelle est la dérivée de xⁿ ?",
            answer: "n·xⁿ⁻¹",
            visual: { kind: "formula", title: "(xⁿ)' = n·xⁿ⁻¹", items: [{ label: "n", value: "l'exposant, qui descend devant" }] },
            example: "(x³)' = 3x²",
          }),
          card({ section: 0, kind: "formule", emoji: "🌀", question: "Quelle est la dérivée de eˣ ?", answer: "eˣ", keywords: ["eˣ"], mnemonic: "L'exponentielle est sa propre dérivée." }),
          card({ section: 0, kind: "formule", emoji: "🪵", question: "Quelle est la dérivée de ln x ?", answer: "1/x", example: "En x = 2, (ln x)' vaut 1/2." }),
          card({
            section: 1,
            kind: "formule",
            emoji: "✖️",
            question: "Quelle est la dérivée d'un produit u·v ?",
            answer: "u'v + uv'",
            visual: { kind: "formula", title: "(u·v)' = u'v + uv'", items: [{ label: "u, v", value: "deux fonctions dérivables" }] },
            mnemonic: "Chacun son tour : on dérive l'un, l'autre reste tel quel.",
          }),
          card({ section: 1, kind: "erreur", emoji: "⚠️", question: "Quelle erreur éviter en dérivant un produit ?", answer: "Écrire (u·v)' = u'·v' : c'est u'v + uv'.", keywords: ["u'v + uv'"] }),
        ],
        questions: [
          {
            section: 1,
            question: "Quelle est la dérivée de f(x) = x²·eˣ ?",
            choices: ["2x·eˣ", "x²·eˣ", "(2x + x²)·eˣ", "2·eˣ"],
            answerIndex: 2,
            explanation: "Produit u = x², v = eˣ : u'v + uv' = 2x·eˣ + x²·eˣ = (2x + x²)·eˣ.",
          },
          {
            section: 0,
            question: "Quelle est la dérivée de f(x) = 5x⁴ ?",
            choices: ["20x³", "5x³", "20x⁴", "4x³"],
            answerIndex: 0,
            explanation: "(xⁿ)' = n·xⁿ⁻¹ donc (5x⁴)' = 5 × 4x³ = 20x³.",
          },
        ],
      },
    ],
  },
];

/** A ready-to-show dataset for demos, with dates relative to today. */
export function demoDb(today: ISODate): DB {
  const db = emptyDb();
  SUBJECTS.forEach((s, i) => {
    const subjectId = newId();
    db.subjects.push({ id: subjectId, name: s.name, color: SUBJECT_COLORS[(i + 1) % SUBJECT_COLORS.length] });
    for (const [weekday, start, end, room] of s.slots) {
      db.classes.push({ id: newId(), subjectId, weekday, start, end, room });
    }
    const courseIds: string[] = [];
    for (const c of s.courses) {
      const id = newId();
      const { course, cards, questions } = materialToItems(id, {
        title: c.title,
        essentials: c.essentials,
        sections: c.sections,
        flashcards: c.cards,
        questions: c.questions,
      });
      const full: Course = {
        id,
        subjectId,
        date: addDays(today, -c.daysAgo),
        createdAt: new Date().toISOString(),
        images: [],
        source: "mock",
        ...course,
      };
      db.courses.push(full);
      courseIds.push(id);
      db.cards.push(...cards);
      db.questions.push(...questions);
    }
    db.exams.push({ id: newId(), subjectId, title: s.examTitle, date: addDays(today, s.examIn), courseIds });
  });
  return db;
}
