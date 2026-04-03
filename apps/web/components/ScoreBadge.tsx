import clsx from "clsx";

interface Props {
  label: string;
  score: number;
}

const colors = [
  "",
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-yellow-100 text-yellow-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
];

export function ScoreBadge({ label, score }: Props) {
  return (
    <div className="text-center">
      <div
        className={clsx(
          "inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold",
          colors[score] ?? colors[3]
        )}
      >
        {score}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
