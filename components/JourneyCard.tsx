"use client";

import type { GabunganPerjalanan, Perjalanan } from "@/lib/types";

const ICONS: Record<string, string> = {
  "Penyeberangan":   "⛴",
  "Perjalanan Bus":  "🚌",
  "Penerbangan":     "✈️",
  "Perjalanan Kereta": "🚂",
};

function fmt(dateStr: string, part: "time" | "date"): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  if (part === "time")
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function fmtDurasi(menit: number): string {
  if (menit < 0) return "-";
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j === 0) return `${m}m`;
  if (m === 0) return `${j}j`;
  return `${j}j ${m}m`;
}

function transportClass(jenis: string): string {
  if (jenis.toLowerCase().includes("bus")) return "bus";
  if (jenis.toLowerCase().includes("kereta")) return "kereta";
  return "";
}

function LegView({ leg }: { leg: Perjalanan }) {
  return (
    <div className="leg">
      <div className="leg-city">
        <div className="leg-time">{fmt(leg.waktukeberangkatan, "time")}</div>
        <div className="leg-date">{fmt(leg.waktukeberangkatan, "date")}</div>
        <div className="leg-city-name">{leg.namaasalkota ?? leg.kotaasal}</div>
        <div className="leg-city-code">{leg.kotaasal}</div>
      </div>

      <div className="leg-arrow">
        <div className="leg-arrow-icon">▶</div>
        <div className="leg-arrow-line" />
        <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center" }}>
          {fmtDurasi(leg.durasi_menit ?? 0)}
        </div>
      </div>

      <div className="leg-city leg-right">
        <div className="leg-time">{fmt(leg.waktutiba, "time")}</div>
        <div className="leg-date">{fmt(leg.waktutiba, "date")}</div>
        <div className="leg-city-name">{leg.namatujuankota ?? leg.kotatujuan}</div>
        <div className="leg-city-code">{leg.kotatujuan}</div>
      </div>
    </div>
  );
}

export default function JourneyCard({ journey }: { journey: GabunganPerjalanan }) {
  const isDirect = journey.type === "direct";
  const mainJenis = isDirect
    ? journey.legs[0].jenisperjalanan
    : "Gabungan";

  return (
    <div className="journey-card">
      <div className="card-top">
        <span className={`transport-badge ${isDirect ? transportClass(mainJenis) : "gabungan"}`}>
          {isDirect
            ? `${ICONS[journey.legs[0].jenisperjalanan] ?? "🚀"} ${journey.legs[0].jenisperjalanan}`
            : `🔀 Gabungan — ${journey.legs.map(l => ICONS[l.jenisperjalanan] ?? "🚀").join(" + ")}`
          }
        </span>
        <span className="durasi-total">⏱ Total {fmtDurasi(journey.total_durasi_menit)}</span>
      </div>

      {journey.legs.map((leg, i) => (
        <div key={leg.kdperjalanan}>
          <LegView leg={leg} />
          {i < journey.legs.length - 1 && (
            <div className="transit-connector">
              <div className="transit-line" />
              <div className="transit-pill">
                🔄 Transit: {journey.transit_nama_kota ?? journey.transit_kota}
              </div>
              <div className="transit-line" />
            </div>
          )}
        </div>
      ))}

      <div className="kd-perjalanan">
        {isDirect
          ? `# ${journey.legs[0].kdperjalanan}`
          : `# ${journey.legs.map(l => l.kdperjalanan).join(" → ")}`
        }
      </div>
    </div>
  );
}
