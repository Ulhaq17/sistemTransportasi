import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Ambil semua kota yang punya perjalanan (dari kolom asal DAN tujuan)
    const rows = await sql`
      SELECT DISTINCT kdkota, namakota
      FROM kota
      WHERE kdkota IN (
        SELECT kotaasal   FROM perjalanan
        UNION
        SELECT kotatujuan FROM perjalanan
      )
      ORDER BY namakota ASC
    `;

    // Fallback: jika tabel kota kosong, ambil unique kode dari perjalanan
    if (rows.length === 0) {
      const fallback = await sql`
        SELECT DISTINCT kotaasal AS kdkota, kotaasal AS namakota
        FROM perjalanan
        UNION
        SELECT DISTINCT kotatujuan AS kdkota, kotatujuan AS namakota
        FROM perjalanan
        ORDER BY namakota ASC
      `;
      return NextResponse.json(fallback);
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data kota" },
      { status: 500 }
    );
  }
}
