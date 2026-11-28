// منطق وضع الطفل "مستكشف المنطق" — نقي (بلا DOM)، يبني الكتل البصرية ومغامرة الروبوت والألعاب والدروس باللهجة الحالية
import { translate } from "../../core/translate.js";
import { executeAst } from "./engine.js";
import type { DialectState } from "./engine.js";

export type KidBand = "4-5" | "6-7" | "8-9";
export type KidBandChoice = "auto" | KidBand;
export type KidBlockKind = "say" | "move" | "jump" | "turn" | "gate" | "repeat" | "counter" | "ask" | "list" | "recipe";
export type KidGateMode = "switch" | "score_gte" | "score_lt";
export type KidRepeatAction = "say" | "move" | "jump";

export interface KidProgressionTier {
  band: KidBand;
  levelNumber: 1 | 2 | 3;
  stars: number;
  nextBandThreshold: number | null;
  progressPercent: number;
  optionCount: 2 | 3 | 4;
}

export interface KidBlockStep {
  id: string;
  kind: KidBlockKind;
  payload: string;
  truth?: boolean;
  elsePayload?: string;
  gateMode?: KidGateMode;
  compareTarget?: number;
  count?: number;
  incrementCounter?: number;
  innerActions?: KidRepeatAction[];
  startValue?: number;
  stepValue?: number;
  steps?: number;
  items?: string[];
}

export interface KidTraceStep {
  id: string;
  blockId: string;
  kind: KidBlockKind;
  stepNumber: number;
  output: string;
  branch?: "then" | "else";
  iteration?: number;
  totalIterations?: number;
  counterValue?: number;
  moveDelta?: number;
  jump?: boolean;
  turn?: boolean;
}

export interface KidStoryMission {
  id: string;
  emoji: string;
  titleKey: string;
  rule: "min_two_outputs" | "uses_if_gate" | "min_three_outputs" | "uses_motion" | "uses_fn_or_list";
  bands?: KidBand[];
}

export function resolveKidTier(stars: number, override: KidBandChoice = "auto"): KidProgressionTier {
  const s = Math.max(0, Math.floor(Number.isFinite(stars) ? stars : 0));
  const autoBand: KidBand = s >= 9 ? "8-9" : s >= 4 ? "6-7" : "4-5";
  const band: KidBand = override === "4-5" || override === "6-7" || override === "8-9" ? override : autoBand;
  if (band === "4-5") {
    return { band, levelNumber: 1, stars: s, nextBandThreshold: 4, progressPercent: Math.min(100, Math.round((s / 4) * 100)), optionCount: 2 };
  }
  if (band === "6-7") {
    return { band, levelNumber: 2, stars: s, nextBandThreshold: 9, progressPercent: Math.min(100, Math.round((Math.max(0, s - 4) / 5) * 100)), optionCount: 3 };
  }
  return { band: "8-9", levelNumber: 3, stars: s, nextBandThreshold: null, progressPercent: 100, optionCount: 4 };
}

export function findKw(keywords: Record<string, string>, concept: string): string | undefined {
  for (const k of Object.keys(keywords)) {
    if (keywords[k] === concept) return k;
  }
  return undefined;
}

const DIALECT_KW_DEFAULTS: Record<string, Record<string, string>> = {"dz-arab":{"print":"قول","if":"ايلا","else":"ولا","true":"صح","false":"غالط","while":"مادام","let":"خلي"},"dz-latn":{"print":"kteb","if":"ila","true":"sah","false":"ghalt","else":"wela","while":"madam","let":"khali"},"kab-latn":{"print":"aru","if":"ma","true":"tidett","false":"mgaz","else":"wela","while":"tawa","let":"eg"},"kab-tifinagh":{"if":"ⵉⴷⵀⴰ","else":"ⵡⴻⵍⵍⴰ","print":"ⴽⵜⴰⴱ","true":"ⵀⴰⵇⵇ","false":"ⴱⵍⴰ","while":"ⵜⴰⵡⴰ","let":"ⴻⴳ"},"ly-arab":{"print":"قول","if":"كان","else":"والا","true":"صحيح","false":"غالط","while":"مادام","let":"خلي"},"ly-latn":{"print":"kteb","if":"kan","true":"sahih","false":"ghalet","else":"wela","while":"madam","let":"khalli"},"ma-arab":{"print":"قول","if":"إلى","else":"ولا","true":"بصح","false":"كدوب","while":"مادام","let":"خلي"},"ma-latn":{"print":"goul","if":"ila","else":"wella","true":"s7i7","false":"ghalet","while":"madam","let":"khalli"},"mr-arab":{"print":"قول","if":"إذا","else":"والا","true":"حق","false":"باطل","while":"مادام","let":"خلي"},"mr-latn":{"print":"ktab","if":"idha","true":"haqq","false":"bla","else":"wela","while":"madam","let":"khalli"},"shi-latn":{"print":"aru","if":"ma","true":"tidett","false":"amgaz","else":"wela","while":"skud","let":"ajj"},"tn-arab":{"print":"قول","if":"إذا","else":"وإلا","true":"صحيح","false":"غالط","while":"مادام","let":"خلي"},"tn-latn":{"print":"ekteb","if":"idha","true":"s7i7","false":"ghalet","else":"wella","while":"madam","let":"khalli"}};
export function firstVocabWord(vocab: Record<string, string>): string {
  const ks = Object.keys(vocab);
  return ks.length ? ks[0] : "Salam!";
}

export function getKidTilePresets(vocab: Record<string, string>, uiLang: string = "ar") {
  const first = firstVocabWord(vocab);
  const custom = Object.keys(vocab).slice(0, 3).map((w, i) => ({ value: w, emoji: ["💬", "✨", "🎈"][i] || "💬" }));
  const base = uiLang === "ar"
    ? [
        { value: "🌟 سلام!", emoji: "🌟" },
        { value: "☀️ شمس!", emoji: "☀️" },
        { value: "🌧️ مطر!", emoji: "🌧️" },
        { value: "🐱 قطة", emoji: "🐱" },
        { value: "🚀 أحسنت!", emoji: "🚀" },
        { value: "🎉 مبروك!", emoji: "🎉" },
      ]
    : uiLang === "fr"
    ? [
        { value: "🌟 Salam !", emoji: "🌟" },
        { value: "☀️ Soleil !", emoji: "☀️" },
        { value: "🌧️ Pluie !", emoji: "🌧️" },
        { value: "🐱 Chat", emoji: "🐱" },
        { value: "🚀 Bravo !", emoji: "🚀" },
        { value: "🎉 Super !", emoji: "🎉" },
      ]
    : [
        { value: "🌟 Salam!", emoji: "🌟" },
        { value: "☀️ Sun!", emoji: "☀️" },
        { value: "🌧️ Rain!", emoji: "🌧️" },
        { value: "🐱 Cat", emoji: "🐱" },
        { value: "🚀 Bravo!", emoji: "🚀" },
        { value: "🎉 Great!", emoji: "🎉" },
      ];
  return { firstWord: first, tiles: [...base, ...custom] };
}

export function buildKidStarterBlocks(band: KidBand, state: DialectState, uiLang: string = "ar"): KidBlockStep[] {
  const sw = KID_STARTER_WORDS[state.id || ""];
  const firstWord = sw ? sw.salam : firstVocabWord(state.vocabulary);
  const isAr = uiLang === "ar", isFr = uiLang === "fr";
  const cheer = sw ? ("\uD83C\uDF89 " + sw.ahlan) : (isAr ? "\uD83C\uDF89 \u0623\u062D\u0633\u0646\u062A!" : isFr ? "\uD83C\uDF89 Bravo !" : "\uD83C\uDF89 Bravo!");
  const sun = "\u2600\uFE0F " + (sw ? sw.sun : (isAr ? "\u0634\u0645\u0633!" : isFr ? "Soleil !" : "Sun!"));
  const rain = "\uD83C\uDF27\uFE0F " + (sw ? sw.rain : (isAr ? "\u0645\u0637\u0631!" : isFr ? "Pluie !" : "Rain!"));
  const star = "\u2B50 " + (sw ? sw.ahlan : (isAr ? "\u0646\u062C\u0645\u0629!" : isFr ? "\u00c9toile !" : "Star!"));
  const score = isAr ? "\uD83C\uDFC6 \u0627\u0644\u0646\u0642\u0627\u0637" : "\uD83C\uDFC6 Score";
  if (band === "4-5") return [{ id: "kb-1", kind: "say", payload: "\uD83C\uDF1F " + firstWord }, { id: "kb-2", kind: "move", payload: "\uD83D\uDC3E", steps: 1 }, { id: "kb-3", kind: "say", payload: cheer }];
  if (band === "6-7") return [{ id: "kb-1", kind: "say", payload: "\uD83C\uDF1F " + firstWord }, { id: "kb-2", kind: "gate", truth: true, payload: sun, elsePayload: rain, gateMode: "switch", compareTarget: 3 }];
  return [{ id: "kb-1", kind: "say", payload: "\uD83D\uDE80 " + firstWord }, { id: "kb-2", kind: "repeat", count: 3, payload: star, innerActions: ["say"], incrementCounter: 0 }, { id: "kb-3", kind: "counter", payload: score, startValue: 1, stepValue: 2 }];
}

export function buildCodeFromKidBlocks(blocks: KidBlockStep[], keywords: Record<string, string>): string {
  if (!blocks.length) return "";
  const printKw = findKw(keywords, "print") || "kteb";
  const ifKw = findKw(keywords, "if") || "ila";
  const elseKw = findKw(keywords, "else") || "olla";
  const trueKw = findKw(keywords, "true") || "s7i7";
  const falseKw = findKw(keywords, "false") || "ghalet";
  const whileKw = findKw(keywords, "while");
  const letKw = findKw(keywords, "let") || "dir";
  const inputKw = findKw(keywords, "input") || "qra";
  const pushKw = findKw(keywords, "push") || "zid";
  const lenKw = findKw(keywords, "len") || "toul";
  const fnKw = findKw(keywords, "fn") || "dala";
  const hasLet = Boolean(findKw(keywords, "let"));

  const lines: string[] = [];
  let ptsDeclared = false;
  let runningScore = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === "say") {
      lines.push(`${printKw}(${JSON.stringify(b.payload)})`);
    } else if (b.kind === "move") {
      const stepsCount = Math.max(1, Math.min(4, Math.round(b.steps ?? 1)));
      lines.push(`${printKw}(${JSON.stringify("🐾 " + b.payload + " +" + stepsCount)})`);
    } else if (b.kind === "jump") {
      lines.push(`${printKw}(${JSON.stringify("🦘 " + b.payload)})`);
    } else if (b.kind === "turn") {
      lines.push(`${printKw}(${JSON.stringify("🔄 " + b.payload)})`);
    } else if (b.kind === "ask") {
      const v = "ans" + (i + 1);
      if (hasLet) lines.push(`${letKw} ${v} = ${inputKw}(${JSON.stringify(b.payload)})`);
      else lines.push(`${v} = ${inputKw}(${JSON.stringify(b.payload)})`);
      lines.push(`${printKw}("💬", ${v})`);
    } else if (b.kind === "list") {
      const listVar = "bag" + (i + 1);
      const listItems = b.items && b.items.length ? b.items : ["🍎", "⭐"];
      const serialized = "[" + listItems.map((it) => JSON.stringify(it)).join(", ") + "]";
      if (hasLet) lines.push(`${letKw} ${listVar} = ${serialized}`);
      else lines.push(`${listVar} = ${serialized}`);
      lines.push(`${pushKw}(${listVar}, ${JSON.stringify(b.payload || "🎁")})`);
      lines.push(`${printKw}("🎒", ${lenKw}(${listVar}))`);
    } else if (b.kind === "recipe") {
      const fnName = "recipe_" + (i + 1);
      const reps = Math.max(1, Math.min(3, Math.round(b.count ?? 2)));
      lines.push(`${fnKw} ${fnName}() {`);
      for (let r = 0; r < reps; r++) lines.push(`  ${printKw}(${JSON.stringify("✨ " + b.payload)})`);
      lines.push("}");
      lines.push(`${fnName}()`);
    } else if (b.kind === "gate") {
      const hasIf = Boolean(findKw(keywords, "if"));
      const hasElse = Boolean(findKw(keywords, "else"));
      const hasTrue = Boolean(findKw(keywords, "true"));
      const hasFalse = Boolean(findKw(keywords, "false"));
      const gMode: KidGateMode = b.gateMode || "switch";
      const target = Math.max(1, Math.min(15, Math.round(b.compareTarget ?? 3)));
      const condPassed = gMode === "score_gte" ? runningScore >= target : gMode === "score_lt" ? runningScore < target : b.truth !== false;
      if (!hasIf) {
        lines.push(`${printKw}(${JSON.stringify(condPassed ? b.payload : (b.elsePayload || "🌧️"))})`);
      } else {
        if ((gMode === "score_gte" || gMode === "score_lt") && hasLet) {
          if (!ptsDeclared) {
            lines.push(`${letKw} pts = ${runningScore}`);
            ptsDeclared = true;
          }
          const op = gMode === "score_gte" ? ">=" : "<";
          lines.push(`${ifKw} (pts ${op} ${target}) {`);
        } else {
          const condExpr = condPassed ? (hasTrue ? trueKw : "1 == 1") : (hasFalse ? falseKw : "1 == 2");
          lines.push(`${ifKw} (${condExpr}) {`);
        }
        lines.push(`  ${printKw}(${JSON.stringify(b.payload)})`);
        if (hasElse) {
          lines.push(`} ${elseKw} {`);
          lines.push(`  ${printKw}(${JSON.stringify(b.elsePayload || "🌧️")})`);
          lines.push("}");
        } else {
          lines.push("}");
          if (!condPassed) lines.push(`${printKw}(${JSON.stringify(b.elsePayload || "🌧️")})`);
        }
      }
    } else if (b.kind === "repeat") {
      const count = Math.max(1, Math.min(5, Math.round(b.count ?? 2)));
      const inc = Math.max(0, Math.min(3, Math.round(b.incrementCounter ?? 0)));
      const innerList: KidRepeatAction[] = b.innerActions && b.innerActions.length ? b.innerActions.slice(0, 4) : ["say"];
      runningScore += count * inc;
      const fmt = (act: KidRepeatAction) =>
        act === "move" ? `${printKw}("🐾 +1")` : act === "jump" ? `${printKw}("🦘")` : `${printKw}(${JSON.stringify(b.payload)})`;
      if (whileKw && hasLet) {
        if (inc > 0 && !ptsDeclared) {
          lines.push(`${letKw} pts = 0`);
          ptsDeclared = true;
        }
        const v = "k" + (i + 1);
        lines.push(`${letKw} ${v} = 1`);
        lines.push(`${whileKw} (${v} <= ${count}) {`);
        for (const act of innerList) lines.push("  " + fmt(act));
        if (inc > 0) lines.push(`  pts = pts + ${inc}`);
        lines.push(`  ${v} = ${v} + 1`);
        lines.push("}");
      } else {
        for (let r = 0; r < count; r++) {
          for (const act of innerList) lines.push(fmt(act));
        }
      }
    } else if (b.kind === "counter") {
      const base = Math.max(0, Math.min(10, Math.round(b.startValue ?? 1)));
      const step = Math.max(1, Math.min(5, Math.round(b.stepValue ?? 1)));
      runningScore = base + step;
      if (hasLet) {
        if (!ptsDeclared) { lines.push(`${letKw} pts = ${base}`); ptsDeclared = true; }
        else lines.push(`pts = ${base}`);
        lines.push(`pts = pts + ${step}`);
      }
      lines.push(`${printKw}(${JSON.stringify(b.payload + ": " + runningScore)})`);
    }
  }
  return lines.join("\n");
}

export function buildKidVisualTrace(blocks: KidBlockStep[]): KidTraceStep[] {
  const steps: KidTraceStep[] = [];
  let seq = 0;
  let runningScore = 0;
  for (const b of blocks) {
    if (b.kind === "say") {
      seq++;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "say", stepNumber: seq, output: b.payload });
    } else if (b.kind === "move") {
      seq++;
      const d = Math.max(1, Math.min(4, Math.round(b.steps ?? 1)));
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "move", stepNumber: seq, output: b.payload + " +" + d, moveDelta: d });
    } else if (b.kind === "jump") {
      seq++;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "jump", stepNumber: seq, output: b.payload, jump: true });
    } else if (b.kind === "turn") {
      seq++;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "turn", stepNumber: seq, output: b.payload, turn: true });
    } else if (b.kind === "ask") {
      seq++;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "ask", stepNumber: seq, output: "💬 " + b.payload });
    } else if (b.kind === "list") {
      seq++;
      const c = (b.items?.length ?? 2) + 1;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "list", stepNumber: seq, output: "🎒 " + c + " (" + (b.payload || "🎁") + ")" });
    } else if (b.kind === "recipe") {
      const reps = Math.max(1, Math.min(3, Math.round(b.count ?? 2)));
      for (let it = 1; it <= reps; it++) {
        seq++;
        steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "recipe", stepNumber: seq, output: "✨ " + b.payload, iteration: it, totalIterations: reps });
      }
    } else if (b.kind === "gate") {
      seq++;
      const gm = b.gateMode || "switch";
      const target = Math.max(1, Math.min(15, Math.round(b.compareTarget ?? 3)));
      const pass = gm === "score_gte" ? runningScore >= target : gm === "score_lt" ? runningScore < target : b.truth !== false;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "gate", stepNumber: seq, output: pass ? b.payload : (b.elsePayload || "🌧️"), branch: pass ? "then" : "else" });
    } else if (b.kind === "repeat") {
      const count = Math.max(1, Math.min(5, Math.round(b.count ?? 2)));
      const inc = Math.max(0, Math.min(3, Math.round(b.incrementCounter ?? 0)));
      const innerList: KidRepeatAction[] = b.innerActions && b.innerActions.length ? b.innerActions.slice(0, 4) : ["say"];
      for (let it = 1; it <= count; it++) {
        if (inc > 0) runningScore += inc;
        innerList.forEach((act, aIdx) => {
          seq++;
          const last = aIdx === innerList.length - 1;
          steps.push({
            id: b.id + "-" + seq,
            blockId: b.id,
            kind: "repeat",
            stepNumber: seq,
            output: act === "move" ? "🐾 +1" : act === "jump" ? "🦘" : b.payload,
            iteration: it,
            totalIterations: count,
            ...(act === "move" ? { moveDelta: 1 } : {}),
            ...(act === "jump" ? { jump: true } : {}),
            ...(inc > 0 && last ? { counterValue: runningScore } : {}),
          });
        });
      }
    } else if (b.kind === "counter") {
      seq++;
      const tot = Math.max(0, Math.min(10, Math.round(b.startValue ?? 1))) + Math.max(1, Math.min(5, Math.round(b.stepValue ?? 1)));
      runningScore = tot;
      steps.push({ id: b.id + "-" + seq, blockId: b.id, kind: "counter", stepNumber: seq, output: b.payload + ": " + tot, counterValue: tot });
    }
  }
  return steps;
}

export const KID_STORY_MISSIONS: KidStoryMission[] = [
  { id: "story-greet-twice", emoji: "👋", titleKey: "ksMissionGreet", rule: "min_two_outputs" },
  { id: "story-open-door", emoji: "🚪", titleKey: "ksMissionDoor", rule: "uses_if_gate", bands: ["6-7", "8-9"] },
  { id: "story-move-jump", emoji: "🦘", titleKey: "ksMissionJump", rule: "uses_motion" },
  { id: "story-three-stars", emoji: "🌟", titleKey: "ksMissionTriple", rule: "min_three_outputs" },
  { id: "story-recipe-bag", emoji: "🧪", titleKey: "ksMissionRecipe", rule: "uses_fn_or_list", bands: ["8-9"] },
];

export function getStoryMissionsForBand(band: KidBand): KidStoryMission[] {
  return KID_STORY_MISSIONS.filter((m) => !m.bands || m.bands.includes(band));
}

export function evaluateStoryMission(
  mission: KidStoryMission,
  code: string,
  keywords: Record<string, string>,
  outputs: string[],
  execOk: boolean
): boolean {
  if (!execOk || !outputs.length) return false;
  if (mission.rule === "min_two_outputs") return outputs.length >= 2;
  if (mission.rule === "min_three_outputs") return outputs.length >= 3;
  if (mission.rule === "uses_motion") return outputs.some((ln) => /[🐾🦘🔄]/.test(ln));
  if (mission.rule === "uses_fn_or_list") {
    const words = Object.keys(keywords).filter((w) => ["fn", "push", "len"].includes(keywords[w])).map((w) => w.toLowerCase());
    const lo = code.toLowerCase();
    return words.some((w) => lo.includes(w)) || code.includes("[");
  }
  const ifWords = Object.keys(keywords).filter((w) => keywords[w] === "if").map((w) => w.toLowerCase());
  const lo = code.toLowerCase();
  return ifWords.some((w) => lo.includes(w));
}

/* ============================================================================
 * مـغامرة الـروبـوت 4x4
 * ============================================================================ */
export type RobotCommand = "forward" | "right" | "left" | "collect" | "up" | "down" | "dir_right" | "dir_left";
export type RobotDir = 0 | 1 | 2 | 3;

export interface RobotMission {
  id: string;
  size: number;
  start: { x: number; y: number };
  startDir: RobotDir;
  stars: { x: number; y: number }[];
  rocks: { x: number; y: number }[];
  titleHint: string;
  titleHintDirect?: string;
}

export const KID_ROBOT_MISSIONS: RobotMission[] = [
  { id: "oasis-walk", size: 4, start: { x: 0, y: 3 }, startDir: 0, stars: [{ x: 0, y: 1 }], rocks: [{ x: 1, y: 2 }], titleHint: "⬆️ × 2 → ⭐", titleHintDirect: "⬆️ → ⬆️ → ⭐" },
  { id: "corner-star", size: 4, start: { x: 0, y: 3 }, startDir: 0, stars: [{ x: 2, y: 2 }], rocks: [{ x: 1, y: 3 }, { x: 0, y: 1 }], titleHint: "⬆️ → ↪️ → ⬆️ × 2 → ⭐", titleHintDirect: "⬆️ → ➡️ → ➡️ → ⭐" },
  { id: "double-stars", size: 4, start: { x: 0, y: 3 }, startDir: 1, stars: [{ x: 2, y: 3 }, { x: 2, y: 1 }], rocks: [{ x: 1, y: 2 }, { x: 3, y: 2 }], titleHint: "⬆️ × 2 → ↩️ → ⬆️ × 2" },
  { id: "zigzag-oasis", size: 4, start: { x: 0, y: 2 }, startDir: 1, stars: [{ x: 1, y: 1 }, { x: 3, y: 1 }], rocks: [{ x: 1, y: 2 }, { x: 2, y: 0 }], titleHint: "↩️ → ⬆️ → ↪️ → ⬆️ × 3" },
  { id: "treasure-turn", size: 4, start: { x: 3, y: 3 }, startDir: 0, stars: [{ x: 3, y: 0 }, { x: 1, y: 0 }], rocks: [{ x: 2, y: 2 }, { x: 2, y: 1 }], titleHint: "⬆️ × 3 → ↩️ → ⬆️ × 2" },
];

export function getRobotMissionsForBand(band: KidBand): RobotMission[] {
  return band === "4-5" ? KID_ROBOT_MISSIONS.slice(0, 2) : KID_ROBOT_MISSIONS;
}

const DELTAS: Record<RobotDir, { dx: number; dy: number }> = { 0: { dx: 0, dy: -1 }, 1: { dx: 1, dy: 0 }, 2: { dx: 0, dy: 1 }, 3: { dx: -1, dy: 0 } };
const CARDINAL: Partial<Record<RobotCommand, RobotDir>> = { up: 0, dir_right: 1, down: 2, dir_left: 3 };

export function simulateRobotRun(commands: RobotCommand[], mission: RobotMission) {
  let x = mission.start.x;
  let y = mission.start.y;
  let dir: RobotDir = mission.startDir;
  const key = (cx: number, cy: number) => cx + "," + cy;
  const starSet = new Set(mission.stars.map((s) => key(s.x, s.y)));
  const rockSet = new Set(mission.rocks.map((r) => key(r.x, r.y)));
  const collected = new Set<string>();
  const trace = [{ x, y, dir, collectedCount: 0, hitRock: false, outOfBounds: false }];
  let hitRock = false;
  let outOfBounds = false;

  for (const cmd of commands) {
    if (cmd === "right") dir = ((dir + 1) % 4) as RobotDir;
    else if (cmd === "left") dir = ((dir + 3) % 4) as RobotDir;
    else if (cmd === "collect") {
      if (starSet.has(key(x, y))) collected.add(key(x, y));
    } else {
      const card = CARDINAL[cmd];
      if (card !== undefined) dir = card;
      const nx = x + DELTAS[dir].dx;
      const ny = y + DELTAS[dir].dy;
      if (nx < 0 || ny < 0 || nx >= mission.size || ny >= mission.size) {
        outOfBounds = true;
        trace.push({ x, y, dir, collectedCount: collected.size, hitRock: false, outOfBounds: true });
        break;
      }
      if (rockSet.has(key(nx, ny))) {
        hitRock = true;
        trace.push({ x, y, dir, collectedCount: collected.size, hitRock: true, outOfBounds: false });
        break;
      }
      x = nx;
      y = ny;
      if (starSet.has(key(x, y))) collected.add(key(x, y));
    }
    trace.push({ x, y, dir, collectedCount: collected.size, hitRock: false, outOfBounds: false });
  }
  return { trace, finalX: x, finalY: y, finalDir: dir, collectedKeys: Array.from(collected), hitRock, outOfBounds, solved: !hitRock && !outOfBounds && collected.size === starSet.size };
}

/* ============================================================================
 * الألعاب التعليمية + الدروس البصرية باللهجة
 * ============================================================================ */
function runSafe(code: string, state: DialectState): string[] {
  try {
    const tr = translate(code, { keywords: state.keywords, id: state.id || "kid", target: "js" });
    const ex = executeAst(tr.ast);
    return ex.outputs;
  } catch {
    return [];
  }
}

export function buildMiniGamesForBand(band: KidBand, state: DialectState) {
  const kw = state.keywords || {}, dk = DIALECT_KW_DEFAULTS[state.id || ""] || {};
  const dkw = (c: string, fb: string) => findKw(kw, c) || dk[c] || fb;
  const printKw = dkw("print", "kteb"), ifKw = dkw("if", "ila"), elseKw = dkw("else", "olla");
  const trueKw = dkw("true", "s7i7"), falseKw = dkw("false", "ghalet"), whileKw = findKw(kw, "while");
  const letKw = findKw(kw, "let") || "";
  const decl = (n: string, expr: string) => (letKw ? `${letKw} ${n} = ${expr}` : `${n} = ${expr}`);
  const vocab = Object.entries(state.vocabulary || {});
  const sw = KID_STARTER_WORDS[state.id || ""] || { salam: "salam", ahlan: "ahlan", sun: "SUN", rain: "RAIN" };
  const distinct = vocab.filter(([w]) => !/^(salam|\u0633\u0644\u0627\u0645)$/i.test(w));
  const v1 = distinct[0] || vocab[0] || [sw.salam, "hello"];
  const v2 = distinct[1] || vocab[1] || [sw.ahlan, "welcome"];

  if (band === "4-5") {
    return {
      soundMatch: [
        { id: "sm-1", word: printKw, emoji: "🗣️", options: [{ emoji: "🗣️", conceptKey: "print" }, { emoji: "🚪", conceptKey: "if" }] },
        { id: "sm-2", word: ifKw, emoji: "🚪", options: [{ emoji: "✅", conceptKey: "true" }, { emoji: "🚪", conceptKey: "if" }] },
        { id: "sm-3", word: trueKw, emoji: "✅", options: [{ emoji: "✅", conceptKey: "true" }, { emoji: "❌", conceptKey: "false" }] },
        { id: "sm-4", word: v1[0], emoji: "👋", options: [{ emoji: "❌", conceptKey: "false" }, { emoji: "👋", conceptKey: "hello" }] },
      ],
      patternTrail: [
        { id: "pt-1", seq: ["👋", null, "🗣️"], correct: "🚪", hint: `${ifKw} (${trueKw}) → ${printKw}`, options: [{ emoji: "🚪", label: ifKw }, { emoji: "🔀", label: elseKw }] },
        { id: "pt-2", seq: ["☀️", "🗣️", null], correct: "⭐", hint: `${printKw}("☀️") → ⭐`, options: [{ emoji: "❌", label: falseKw }, { emoji: "⭐", label: trueKw }] },
        { id: "pt-3", seq: ["🚪", null, "🌟"], correct: "✅", hint: `${ifKw} (${trueKw})`, options: [{ emoji: "✅", label: trueKw }, { emoji: "🔀", label: elseKw }] },
      ],
      memoryPairs: [
        { id: "mm-1", cards: [{ id: "c1", pair: "p", disp: "🗣️", isEmoji: true }, { id: "c2", pair: "i", disp: ifKw, isEmoji: false }, { id: "c3", pair: "p", disp: printKw, isEmoji: false }, { id: "c4", pair: "i", disp: "🚪", isEmoji: true }] },
        { id: "mm-2", cards: [{ id: "c1", pair: "t", disp: trueKw, isEmoji: false }, { id: "c2", pair: "h", disp: "👋", isEmoji: true }, { id: "c3", pair: "h", disp: v1[0], isEmoji: false }, { id: "c4", pair: "t", disp: "✅", isEmoji: true }] },
      ],
    };
  }

  if (band === "6-7") {
    return {
      storyBlocks: [
        { id: "sb-1", hint: `"${sw.salam}" \u2192 "${sw.ahlan}"`, blocks: [{ id: "b2", label: `\uD83D\uDDE3\uFE0F "${sw.ahlan}"`, code: `${printKw}(${JSON.stringify(sw.ahlan)})` }, { id: "b1", label: `\uD83D\uDDE3\uFE0F "${sw.salam}"`, code: `${printKw}(${JSON.stringify(sw.salam)})` }], order: ["b1", "b2"] },
        { id: "sb-2", hint: `\uD83D\uDEAA \u2705 \u2192 "${sw.sun}"`, blocks: [{ id: "b2", label: `\u2600\uFE0F "${sw.sun}"`, code: `  ${printKw}(${JSON.stringify(sw.sun)})\n}` }, { id: "b1", label: `\uD83D\uDEAA ${ifKw} (${trueKw})`, code: `${ifKw} (${trueKw}) {` }], order: ["b1", "b2"] },
        { id: "sb-3", hint: `\u274C \u2192 \uD83D\uDD00 "${sw.rain}"`, blocks: [{ id: "b2", label: `\uD83C\uDF27\uFE0F ${elseKw} \u2192 "${sw.rain}"`, code: ` ${elseKw} {\n  ${printKw}(${JSON.stringify(sw.rain)})\n}` }, { id: "b1", label: `\uD83D\uDD12 ${ifKw} (${falseKw}) \u2192 "${sw.sun}"`, code: `${ifKw} (${falseKw}) {\n  ${printKw}(${JSON.stringify(sw.sun)})\n}` }], order: ["b1", "b2"] },
      ],
      wordDetective: [
        { id: "wd-1", cards: [{ word: trueKw, emoji: "✅", odd: false }, { word: printKw, emoji: "🗣️", odd: true }, { word: falseKw, emoji: "❌", odd: false }] },
        { id: "wd-2", cards: [{ word: ifKw, emoji: "🚪", odd: false }, { word: v1[0], emoji: "👋", odd: true }, { word: elseKw, emoji: "🔀", odd: false }] },
        { id: "wd-3", cards: [{ word: v1[0], emoji: "🌟", odd: false }, { word: v2[0], emoji: "😊", odd: false }, { word: ifKw, emoji: "🚪", odd: true }] },
      ],
      bridgeBuilder: [
        {
          id: "br-1",
          goal: `🐸 "hop" → 🎉 "yay"`,
          planks: [
            { id: "p2", label: `🎉 "yay"`, code: `${printKw}("yay")` },
            { id: "p1", label: `🐸 "hop"`, code: `${printKw}("hop")` },
          ],
          order: ["p1", "p2"],
        },
        {
          id: "br-2",
          goal: `🚪 ✅ → 🚀 "go" → 🏆 "win"`,
          planks: [
            { id: "p3", label: `🏆 "win"`, code: `  ${printKw}("win")
}` },
            { id: "p1", label: `🔑 ${ifKw} (${trueKw})`, code: `${ifKw} (${trueKw}) {` },
            { id: "p2", label: `🚀 "go"`, code: `  ${printKw}("go")` },
          ],
          order: ["p1", "p2", "p3"],
        },
      ],
    };
  }

  
  const loopCode1 = whileKw ? `${decl("i", "1")}\n${whileKw} (i <= 3) {\n  ${printKw}(i)\n  i = i + 1\n}` : `${decl("x", "2 + 3")}\n${printKw}(x)\n${printKw}(x + 1)`;
  const loopCode2 = `${decl("a", "4")}\n${decl("b", "a * 2")}\n${ifKw} (b > 6) {\n  ${printKw}(b)\n} ${elseKw} {\n  ${printKw}(a)\n}`;
  const out1 = runSafe(loopCode1, state).join(", ") || "1, 2, 3";
  const out2 = runSafe(loopCode2, state).join(", ") || "8";
  const makeOpts = (right: string, dists: string[], shift: number) => { const arr = [right, ...dists.filter((d) => d !== right)].slice(0, 4); const s = shift % arr.length; return [...arr.slice(s), ...arr.slice(0, s)]; };
  return {
    loopTracer: [
      { id: "lt-1", code: loopCode1, steps: [whileKw ? `\uD83D\uDD01 i=1..3 \u2192 \uD83D\uDDE3\uFE0F i` : `\uD83D\uDCE6 x = 5 \u2192 \uD83D\uDDE3\uFE0F x`, `\uD83D\uDDE3\uFE0F ...`.replace("...", out1)], correct: out1, options: makeOpts(out1, ["1, 2", "0, 1, 2", "5, 7", "1, 3"], 0) },
      { id: "lt-2", code: loopCode2, steps: [`\uD83D\uDCE6 a = 4, b = a \u00D7 2`, `\uD83D\uDEAA b > 6 ? \u2192 \uD83D\uDDE3\uFE0F`, `\uD83D\uDD00 ${elseKw} \u2192 \uD83D\uDDE3\uFE0F a`], correct: out2, options: makeOpts(out2, ["4", "6", "2"], 1) },
    ],
    conditionLab: [
      { id: "cl-1", before: `${ifKw} (`, after: `) {\n  ${printKw}("GOLD")\n} ${elseKw} {\n  ${printKw}("EMPTY")\n}`, goal: "\uD83C\uDFC6 \u2192 GOLD", options: [{ expr: "9 > 4", ok: true }, { expr: "2 > 8", ok: false }, { expr: "5 == 3", ok: false }, { expr: falseKw, ok: false }] },
      { id: "cl-2", before: `${ifKw} (`, after: `) {\n  ${printKw}("WIN")\n} ${elseKw} {\n  ${printKw}("WAIT")\n}`, goal: "\uD83C\uDFC6 \u2192 WIN", options: [{ expr: "4 == 7", ok: false }, { expr: "6 == 6", ok: true }, { expr: "3 > 9", ok: false }, { expr: falseKw, ok: false }] },
    ],
    vaultCracker: [
      { id: "vc-1", steps: ["\uD83D\uDCE6 a = 4", "\uD83D\uDD10 code = a + 3"], code: `${decl("a", "4")}\n${decl("code", "a + 3")}\n${printKw}(code)`, answer: 7 },
      { id: "vc-2", steps: ["\uD83D\uDCE6 x = 3", "\uD83D\uDCE6 y = x \u00D7 4", "\uD83D\uDD10 pin = y - 2"], code: `${decl("x", "3")}\n${decl("y", "x * 4")}\n${decl("pin", "y - 2")}\n${printKw}(pin)`, answer: 10 },
    ],
  };
}
export interface KidLessonDef { id: string; band: KidBand; emoji: string; titleKey: string; goalKey: string; buildTiles: (kw: Record<string, string>) => { id: string; emoji: string; label: string; code: string }[]; expectedOutputs: string[]; requiredWords?: string[]; }
export const KID_STARTER_WORDS: Record<string, { salam: string; ahlan: string; sun: string; rain: string }> = {
  "dz-arab": { salam: "\u0633\u0644\u0627\u0645", ahlan: "\u0645\u0631\u062d\u0628\u0627", sun: "\u0634\u0645\u0633", rain: "\u0634\u062a\u0627\u0621" },
  "dz-latn": { salam: "salam", ahlan: "marhba", sun: "chems", rain: "chta" },
  "tn-arab": { salam: "\u0639\u0633\u0644\u0627\u0645\u0629", ahlan: "\u0645\u0631\u062d\u0628\u0627", sun: "\u0634\u0645\u0633", rain: "\u0645\u0637\u0631" },
  "tn-latn": { salam: "aslema", ahlan: "marhba", sun: "chams", rain: "mthar" },
  "ma-arab": { salam: "\u0633\u0644\u0627\u0645", ahlan: "\u0645\u0631\u062d\u0628\u0627", sun: "\u0634\u0645\u0633", rain: "\u0634\u062a\u0627" },
  "ma-latn": { salam: "salam", ahlan: "mrhba", sun: "chems", rain: "chta" },
  "ly-arab": { salam: "\u0633\u0644\u0627\u0645", ahlan: "\u0623\u0647\u0644\u0627\u064b", sun: "\u0634\u0645\u0633", rain: "\u0645\u0637\u0631" },
  "ly-latn": { salam: "salam", ahlan: "ahlan", sun: "shams", rain: "matar" },
  "mr-arab": { salam: "\u0633\u0644\u0627\u0645", ahlan: "\u0645\u0631\u062d\u0628\u0627", sun: "\u0634\u0645\u0633", rain: "\u0645\u0637\u0631" },
  "mr-latn": { salam: "salam", ahlan: "marhba", sun: "shams", rain: "mtar" },
  "kab-latn": { salam: "azul", ahlan: "ansuf", sun: "itij", rain: "ageffur" },
  "shi-latn": { salam: "azul", ahlan: "marhba", sun: "tafukt", rain: "anzar" },
  "kab-tifinagh": { salam: "\u2D30\u2D63\u2D53\u2D4D", ahlan: "\u2D30\u2D4F\u2D59\u2D53\u2D3C", sun: "\u2D49\u2D5F\u2D49\u2D4A", rain: "\u2D30\u2D33\u2D3B\u2D3C\u2D3C\u2D53\u2D54" }
};
export function localizeKidLesson(lesson: KidLessonDef, dialectId?: string): KidLessonDef {
  const map = dialectId ? KID_STARTER_WORDS[dialectId] : undefined;
  if (!map) return lesson;
  const swap = (s: string) => s.replace(/\b(salam|ahlan|sun|rain)\b/g, (w) => map[w as keyof typeof map] || w);
  return { ...lesson, buildTiles: (kw) => lesson.buildTiles(kw).map((t) => ({ ...t, label: swap(t.label), code: swap(t.code) })), expectedOutputs: lesson.expectedOutputs.map(swap) };
}
export const KID_LESSONS: KidLessonDef[] = [
  { id: "kid-talk", band: "4-5", emoji: "\uD83D\uDDE3\uFE0F", titleKey: "ksLesTalkTitle", goalKey: "ksLesTalkGoal", buildTiles: (kw) => { const p = findKw(kw, "print") || "kteb"; return [{ id: "t1", emoji: "\uD83D\uDDE3\uFE0F", label: `${p}("salam")`, code: `${p}("salam")` }, { id: "t2", emoji: "\uD83D\uDCA4", label: `${p}("zzz")`, code: `${p}("zzz")` }]; }, expectedOutputs: ["salam"] },
  { id: "kid-twice", band: "4-5", emoji: "\uD83D\uDC3E", titleKey: "ksLesTwiceTitle", goalKey: "ksLesTwiceGoal", buildTiles: (kw) => { const p = findKw(kw, "print") || "kteb"; return [{ id: "t2", emoji: "\uD83C\uDF1F", label: `${p}("ahlan")`, code: `${p}("ahlan")` }, { id: "t1", emoji: "\uD83D\uDC4B", label: `${p}("salam")`, code: `${p}("salam")` }]; }, expectedOutputs: ["salam", "ahlan"] },
  { id: "kid-door", band: "6-7", emoji: "\uD83D\uDEAA", titleKey: "ksLesDoorTitle", goalKey: "ksLesDoorGoal", buildTiles: (kw) => { const p = findKw(kw, "print") || "kteb"; const i = findKw(kw, "if") || "ila"; const tr = findKw(kw, "true") || "1 == 1"; return [{ id: "t2", emoji: "\u2600\uFE0F", label: `${p}("sun")`, code: `  ${p}("sun")\n}` }, { id: "t1", emoji: "\uD83D\uDEAA", label: `${i} (${tr})`, code: `${i} (${tr}) {` }]; }, expectedOutputs: ["sun"] },
  { id: "kid-sun-rain", band: "8-9", emoji: "\uD83C\uDF26\uFE0F", titleKey: "ksLesRainTitle", goalKey: "ksLesRainGoal", buildTiles: (kw) => { const pKw = findKw(kw, "print") || "kteb"; const iKw = findKw(kw, "if") || "ila"; const eKw = findKw(kw, "else"); const faKw = findKw(kw, "false") || "1 == 2"; return [{ id: "t2", emoji: "\uD83C\uDF27\uFE0F", label: eKw ? `${eKw} \u2192 ${pKw}("rain")` : `${iKw} (1 == 1) \u2192 ${pKw}("rain")`, code: eKw ? `${eKw} {\n  ${pKw}("rain")\n}` : `${iKw} (1 == 1) {\n  ${pKw}("rain")\n}` }, { id: "t1", emoji: "\uD83D\uDD12", label: `${iKw} (${faKw}) \u2192 ${pKw}("sun")`, code: `${iKw} (${faKw}) {\n  ${pKw}("sun")\n}` }]; }, expectedOutputs: ["rain"] },
];
export function verifyKidLesson(lesson: KidLessonDef, chosenCodes: string[], state: DialectState): { ok: boolean; outputs: string[]; error?: string } {
  const code = chosenCodes.join("\n"); if (!code.trim()) return { ok: false, outputs: [], error: "empty" };
  try { const tr = translate(code, { keywords: state.keywords, id: state.id || "kid", target: "js" }); const ex = executeAst(tr.ast); if (ex.error) return { ok: false, outputs: ex.outputs, error: ex.error }; const exactMatch = ex.outputs.length === lesson.expectedOutputs.length && lesson.expectedOutputs.every((val, idx) => ex.outputs[idx] === val); return { ok: exactMatch, outputs: ex.outputs }; } catch (e) { return { ok: false, outputs: [], error: e instanceof Error ? e.message : "err" }; }
}
export function createMathGateChallenge(seed?: number) { const s = seed ?? Math.floor(Math.random() * 100); const a = 3 + (s % 6); const b = 2 + (Math.floor(s / 3) % 5); return { a, b, answer: a + b }; }
export const BaydaKidEngine = Object.freeze({ resolveKidTier, getKidTilePresets, buildKidStarterBlocks, buildCodeFromKidBlocks, buildKidVisualTrace, getStoryMissionsForBand, evaluateStoryMission, getRobotMissionsForBand, simulateRobotRun, buildMiniGamesForBand, KID_STARTER_WORDS, KID_LESSONS, verifyKidLesson, localizeKidLesson, createMathGateChallenge });
declare global { interface Window { BaydaKidEngine?: typeof BaydaKidEngine; } }
if (typeof window !== "undefined") { try { Object.defineProperty(window, "BaydaKidEngine", { value: BaydaKidEngine, writable: false, configurable: false }); } catch {} }
