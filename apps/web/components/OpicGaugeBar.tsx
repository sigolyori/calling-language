import clsx from "clsx";
import type { OpicLevel } from "@/lib/api";

interface Props {
  level: OpicLevel;
}

const LEVELS: OpicLevel[] = [
  "NL",
  "NM",
  "NH",
  "IL",
  "IM1",
  "IM2",
  "IM3",
  "IH",
  "AL",
  "AM",
  "AH",
  "Superior",
];

const LEVEL_DESCRIPTIONS: Record<OpicLevel, { full: string; blurb: string }> = {
  NL: { full: "Novice Low", blurb: "단어 수준의 발화. 간단한 개인 질문에도 응답이 어려움." },
  NM: { full: "Novice Mid", blurb: "외운 구문 위주, 후속 질문 대응 어려움." },
  NH: { full: "Novice High", blurb: "익숙한 주제에 짧은 문장 가능, 후속 질문에서 무너짐." },
  IL: { full: "Intermediate Low", blurb: "일상 주제에 단문으로 질문·답변 가능." },
  IM1: { full: "Intermediate Mid 1", blurb: "단문 생성이 안정적이지만 어휘 범위가 제한적." },
  IM2: { full: "Intermediate Mid 2", blurb: "2–3 문장을 이어 단순한 사건을 서술 가능." },
  IM3: { full: "Intermediate Mid 3", blurb: "과거·현재 시제로 개인 주제를 비교적 상세히 설명." },
  IH: { full: "Intermediate High", blurb: "주요 시제를 모두 시도, 문단 수준 담화 가능." },
  AL: { full: "Advanced Low", blurb: "모든 시제에서 안정적 문단 서술. 추상 주제는 약함." },
  AM: { full: "Advanced Mid", blurb: "복잡한 상황·예기치 않은 전개에 대응 가능." },
  AH: { full: "Advanced High", blurb: "추상적·가설적 주제 논의 가능. Superior에 근접." },
  Superior: { full: "Superior", blurb: "정교한 어휘로 추상·전문 주제 장문 담화 가능." },
};

const TIER_BOUNDARIES = [
  { label: "Novice", startIdx: 0, endIdx: 2 },
  { label: "Intermediate", startIdx: 3, endIdx: 7 },
  { label: "Advanced", startIdx: 8, endIdx: 10 },
  { label: "Superior", startIdx: 11, endIdx: 11 },
];

function tierColor(idx: number): string {
  if (idx <= 2) return "bg-red-500";
  if (idx <= 7) return "bg-yellow-500";
  if (idx <= 10) return "bg-green-500";
  return "bg-blue-500";
}

export function OpicGaugeBar({ level }: Props) {
  const currentIdx = LEVELS.indexOf(level);
  const percent = (currentIdx / (LEVELS.length - 1)) * 100;
  const desc = LEVEL_DESCRIPTIONS[level];
  const fillColor = tierColor(currentIdx);

  return (
    <div className="w-full">
      {/* Tier labels */}
      <div className="relative h-4 mb-1">
        {TIER_BOUNDARIES.map((tier) => {
          const left = (tier.startIdx / (LEVELS.length - 1)) * 100;
          const width = ((tier.endIdx - tier.startIdx) / (LEVELS.length - 1)) * 100;
          return (
            <div
              key={tier.label}
              className="absolute text-[10px] text-gray-500 font-medium"
              style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }}
            >
              {tier.label}
            </div>
          );
        })}
      </div>

      {/* Gauge track */}
      <div className="relative h-3 bg-gray-100 rounded-full">
        {/* Filled portion */}
        <div
          className={clsx("absolute top-0 left-0 h-full rounded-full transition-all", fillColor)}
          style={{ width: `${percent}%` }}
        />
        {/* Milestone ticks */}
        {LEVELS.map((l, i) => {
          const tickLeft = (i / (LEVELS.length - 1)) * 100;
          const isCurrent = i === currentIdx;
          const isPassed = i < currentIdx;
          return (
            <div
              key={l}
              className={clsx(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                isCurrent
                  ? "w-5 h-5 border-white shadow-md z-10 " + fillColor
                  : isPassed
                  ? "w-2 h-2 bg-white border-transparent"
                  : "w-2 h-2 bg-gray-300 border-transparent",
              )}
              style={{ left: `${tickLeft}%` }}
              aria-label={l}
            />
          );
        })}
      </div>

      {/* Level labels row — show only key ones to avoid clutter */}
      <div className="relative h-4 mt-1">
        {LEVELS.map((l, i) => {
          const showLabel = i === 0 || i === 3 || i === 8 || i === 11 || i === currentIdx;
          if (!showLabel) return null;
          const labelLeft = (i / (LEVELS.length - 1)) * 100;
          return (
            <div
              key={l}
              className={clsx(
                "absolute -translate-x-1/2 text-[10px] font-mono",
                i === currentIdx ? "text-gray-900 font-bold" : "text-gray-400",
              )}
              style={{ left: `${labelLeft}%` }}
            >
              {l}
            </div>
          );
        })}
      </div>

      {/* Current level detail */}
      <div className="mt-5 text-center">
        <div className="text-2xl font-bold text-gray-900">{level}</div>
        <div className="text-sm text-gray-500 mt-0.5">{desc.full}</div>
        <p className="text-xs text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">{desc.blurb}</p>
      </div>
    </div>
  );
}
