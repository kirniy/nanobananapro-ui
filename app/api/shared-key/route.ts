import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";

const VPS_API_URL = process.env.VPS_API_URL || "http://46.203.233.138/api";

export async function GET() {
  const session = await auth();

  // Only authenticated users can get the shared key
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch shared key from VPS
    const response = await fetch(`${VPS_API_URL}/app-settings/shared_gemini_key`);

    if (!response.ok) {
      return NextResponse.json({ error: "No shared key configured" }, { status: 404 });
    }

    const data = await response.json();

    if (!data?.value) {
      return NextResponse.json({ error: "No shared key configured" }, { status: 404 });
    }

    return NextResponse.json({ key: data.value });
  } catch (error) {
    console.error("Failed to fetch shared key:", error);
    return NextResponse.json({ error: "Failed to fetch shared key" }, { status: 500 });
  }
}
