import { describe, expect, it } from "vitest";
import { parseStudyMaterial } from "./prompt";

const card = (extra: object = {}) => ({
  section: 0,
  kind: "definition",
  emoji: "📘",
  question: "Q ?",
  answer: "R",
  keywords: ["R"],
  visual: { kind: "none", title: "", items: [] },
  mnemonic: "",
  example: "",
  ...extra,
});

const section = (title: string) => ({ title, blocks: [{ type: "keypoint", title: "", text: `**${title}**`, items: [] }] });

describe("parseStudyMaterial", () => {
  it("reads JSON wrapped in a code fence and surrounding text", () => {
    const raw = `Voici :\n\`\`\`json\n${JSON.stringify({ title: "Cellule", essentials: ["A"], sections: [section("S")], flashcards: [card()], questions: [] })}\n\`\`\``;
    const material = parseStudyMaterial(raw, "x");
    expect(material.title).toBe("Cellule");
    expect(material.essentials).toEqual(["A"]);
    expect(material.sections).toHaveLength(1);
    expect(material.flashcards).toHaveLength(1);
  });

  it("drops malformed cards and falls back to the given title", () => {
    const raw = JSON.stringify({ flashcards: [card({ answer: "" }), { question: 3 }, card({ question: " Q2 ", answer: " R2 ", keywords: [] })] });
    const material = parseStudyMaterial(raw, "Titre");
    expect(material.title).toBe("Titre");
    expect(material.flashcards.map((c) => c.question)).toEqual(["Q2"]);
    expect(material.questions).toEqual([]);
  });

  it("normalizes unknown types and empty diagrams", () => {
    const raw = JSON.stringify({
      sections: [{ title: "S", blocks: [{ type: "inconnu", title: "", text: "texte", items: [] }, { type: "list", title: "", text: "", items: [] }] }],
      flashcards: [
        card({ kind: "inconnu", visual: { kind: "steps", title: "", items: [{ label: "seule", value: "" }] } }),
        card({ visual: { kind: "formula", title: "E = mc²", items: [{ label: "E", value: "énergie" }] } }),
      ],
    });
    const material = parseStudyMaterial(raw, "x");
    expect(material.sections[0].blocks).toEqual([{ type: "text", title: "", text: "texte", items: [] }]);
    const [a, b] = material.flashcards;
    expect(a.kind).toBe("definition");
    expect(a.visual.kind).toBe("none");
    expect(b.visual).toEqual({ kind: "formula", title: "E = mc²", items: [{ label: "E", value: "énergie" }] });
  });

  it("keeps section links valid and keywords that appear in the answer", () => {
    const raw = JSON.stringify({
      sections: [section("A"), section("B")],
      flashcards: [card({ section: 7, answer: "La mitochondrie produit l'ATP", keywords: ["mitochondrie", "noyau", "ATP"] })],
      questions: [{ section: -2, question: "Q", choices: ["a", "b"], answerIndex: 0, explanation: "" }],
    });
    const material = parseStudyMaterial(raw, "x");
    expect(material.flashcards[0].section).toBe(1);
    expect(material.flashcards[0].keywords).toEqual(["mitochondrie", "ATP"]);
    expect(material.questions[0].section).toBe(0);
  });

  it("strips LaTeX delimiters but leaves prices alone", () => {
    const raw = JSON.stringify({ flashcards: [card({ answer: "$\\Delta = b^2 - 4ac$", keywords: [] }), card({ answer: "Il coûte 5 $", keywords: [] })] });
    const [a, b] = parseStudyMaterial(raw, "x").flashcards;
    expect(a.answer).toBe("\\Delta = b^2 - 4ac");
    expect(b.answer).toBe("Il coûte 5 $");
  });

  it("places the right answer among the wrong ones, at varying positions", () => {
    const q = (question: string) => ({ section: 0, question, answer: "juste", distractors: ["faux 1", "faux 2", "faux 3"], explanation: "car" });
    const raw = JSON.stringify({ flashcards: [card()], questions: ["Q1 ?", "Q2 ?", "Q3 ?", "Q4 ?", "Q5 ?", "Q6 ?"].map(q) });
    const questions = parseStudyMaterial(raw, "x").questions;
    for (const parsed of questions) {
      expect(parsed.choices).toHaveLength(4);
      expect(parsed.choices[parsed.answerIndex]).toBe("juste");
      expect([...parsed.choices].sort()).toEqual(["faux 1", "faux 2", "faux 3", "juste"]);
    }
    expect(new Set(questions.map((p) => p.answerIndex)).size).toBeGreaterThan(1);
  });

  it("drops a distractor that repeats the right answer, and questions with none left", () => {
    const raw = JSON.stringify({
      flashcards: [card()],
      questions: [
        { section: 0, question: "A ?", answer: "x", distractors: ["x", "y"], explanation: "" },
        { section: 0, question: "B ?", answer: "x", distractors: ["x"], explanation: "" },
      ],
    });
    const questions = parseStudyMaterial(raw, "x").questions;
    expect(questions).toHaveLength(1);
    expect([...questions[0].choices].sort()).toEqual(["x", "y"]);
  });

  it("keeps only questions whose answer index points at a choice", () => {
    const q = (answerIndex: number) => ({ section: 0, question: "Q", choices: ["a", "b", "c", "d"], answerIndex, explanation: "car" });
    const raw = JSON.stringify({ flashcards: [card()], questions: [q(2), q(4), q(-1)] });
    expect(parseStudyMaterial(raw, "x").questions).toEqual([q(2)]);
  });

  it("rejects answers without usable flashcards", () => {
    expect(() => parseStudyMaterial("désolé", "x")).toThrow();
    expect(() => parseStudyMaterial('{"flashcards":[]}', "x")).toThrow();
  });
});
