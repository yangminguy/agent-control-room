export const runtime = "nodejs";

export async function POST() {
  try {
    return Response.json({ success: true, filesCreated: 0, message: "Export ready" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
