import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";

const VPS_API_URL = process.env.VPS_API_URL || "http://46.203.233.138/api";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiToken = (session.user as { apiToken?: string }).apiToken;

  if (!apiToken) {
    return NextResponse.json({ error: "No API token" }, { status: 401 });
  }

  try {
    // First check if user is admin
    const adminCheck = await fetch(`${VPS_API_URL}/admin/check`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!adminCheck.ok) {
      return NextResponse.json({ error: "Admin check failed" }, { status: 500 });
    }

    const { isAdmin } = await adminCheck.json();

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get the current shared key
    const response = await fetch(`${VPS_API_URL}/app-settings/shared_gemini_key`);

    if (!response.ok) {
      return NextResponse.json({ key: null });
    }

    const data = await response.json();
    return NextResponse.json({ key: data?.value || null });
  } catch (error) {
    console.error("Failed to get shared key:", error);
    return NextResponse.json({ error: "Failed to get shared key" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiToken = (session.user as { apiToken?: string }).apiToken;

  if (!apiToken) {
    return NextResponse.json({ error: "No API token" }, { status: 401 });
  }

  try {
    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    // Update the shared key via VPS API (admin check happens server-side)
    const response = await fetch(`${VPS_API_URL}/app-settings/shared_gemini_key`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ value: key }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 403) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }
      return NextResponse.json({ error: error || "Failed to update key" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, key: data.value });
  } catch (error) {
    console.error("Failed to update shared key:", error);
    return NextResponse.json({ error: "Failed to update shared key" }, { status: 500 });
  }
}
