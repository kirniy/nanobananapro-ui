import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";

const VPS_API_URL = process.env.VPS_API_URL || "http://46.203.233.138/api";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ isAdmin: false });
  }

  try {
    const apiToken = (session.user as { apiToken?: string }).apiToken;

    if (!apiToken) {
      return NextResponse.json({ isAdmin: false });
    }

    const response = await fetch(`${VPS_API_URL}/admin/check`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ isAdmin: false });
    }

    const data = await response.json();
    return NextResponse.json({ isAdmin: data.isAdmin || false });
  } catch (error) {
    console.error("Failed to check admin status:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
