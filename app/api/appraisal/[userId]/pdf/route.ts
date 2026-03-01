import { NextResponse } from "next/server";

/**
 * GET /api/appraisal/[userId]/pdf
 *
 * Proxy to the Express backend: fetches the filled PDF and streams it back
 * to the browser so the client can download it without exposing the backend
 * URL or token directly.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
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

    const backendRes = await fetch(
      `${backendUrl}/appraisal/${userId}/pdf`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      return NextResponse.json(
        { success: false, message: errorText || "Failed to generate PDF" },
        { status: backendRes.status }
      );
    }

    // Stream the PDF buffer back to the browser
    const pdfBuffer = await backendRes.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="appraisal-${userId}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("[/api/appraisal/[userId]/pdf] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
