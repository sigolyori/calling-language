import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getUserId, unauthorized } from "@/lib/server/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = getUserId(req);
  if (!uid) return unauthorized();
  const session = await prisma.session.findFirst({ where: { id: params.id, userId: uid }, include: { feedback: true } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.feedback) return NextResponse.json({ error: "Feedback not available yet" }, { status: 404 });
  return NextResponse.json(session.feedback);
}
