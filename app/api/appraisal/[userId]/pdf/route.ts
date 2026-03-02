import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing userId" },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized – no Bearer token" },
        { status: 401 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json(
        { success: false, message: "Backend URL not configured" },
        { status: 500 }
      );
    }

    const upstream = await axios.get(
      `${backendUrl}/appraisal/${userId}/pdf`,
      {
        headers: { Authorization: authHeader },
        responseType: "arraybuffer",
        validateStatus: () => true,
      }
    );

    if (upstream.status !== 200) {
      return NextResponse.json(
        { success: false, message: "Backend returned an error" },
        { status: upstream.status }
      );
    }

    return new NextResponse(upstream.data as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="appraisal-${userId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[/api/appraisal/[userId]/pdf] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate appraisal PDF" },
      { status: 500 }
    );
  }
}
