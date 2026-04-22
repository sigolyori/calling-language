import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getAdminUserId, unauthorized } from "@/lib/server/auth";

// DELETE /api/admin/schedules/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getAdminUserId(req)) return unauthorized();

  const existing = await prisma.schedule.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.schedule.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

// PATCH /api/admin/schedules/[id] — toggle isActive
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getAdminUserId(req)) return unauthorized();

  const body = await req.json();
  const updated = await prisma.schedule.update({
    where: { id: params.id },
    data: { isActive: body.isActive },
  });
  return NextResponse.json(updated);
}
