import { StyleSheet, Text, View } from "react-native";
import type { OpicLevel } from "@/lib/api";

const LEVELS: OpicLevel[] = [
  "NL", "NM", "NH",
  "IL", "IM1", "IM2", "IM3", "IH",
  "AL", "AM", "AH", "Superior",
];

const LEVEL_GROUP: Record<OpicLevel, "Novice" | "Intermediate" | "Advanced" | "Superior"> = {
  NL: "Novice", NM: "Novice", NH: "Novice",
  IL: "Intermediate", IM1: "Intermediate", IM2: "Intermediate", IM3: "Intermediate", IH: "Intermediate",
  AL: "Advanced", AM: "Advanced", AH: "Advanced",
  Superior: "Superior",
};

const GROUP_COLOR: Record<string, string> = {
  Novice: "#f59e0b",
  Intermediate: "#16a34a",
  Advanced: "#2563eb",
  Superior: "#7c3aed",
};

export function OpicGaugeBar({ level }: { level: OpicLevel }) {
  const idx = LEVELS.indexOf(level);
  const percent = ((idx + 1) / LEVELS.length) * 100;
  const group = LEVEL_GROUP[level];
  const color = GROUP_COLOR[group];

  return (
    <View>
      <View style={styles.row}>
        <Text style={[styles.level, { color }]}>{level}</Text>
        <Text style={styles.group}>{group}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.scale}>
        {["NL", "IL", "AL", "Superior"].map((l) => (
          <Text key={l} style={styles.scaleText}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
  level: { fontSize: 32, fontWeight: "800" },
  group: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  track: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  scale: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  scaleText: { fontSize: 10, color: "#9ca3af" },
});
