import { NextRequest, NextResponse } from "next/server";
import { stmt } from "@/lib/db";
import { getDocument } from "@/lib/docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DocRoute = { params: { id: string } };

function parseId(value: string) {
  const id = Number(value);
  if (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(id)) return id;
}

function invalidId() {
  return NextResponse.json({ error: "资料 ID 无效" }, { status: 400 });
}

function notFound() {
  return NextResponse.json({ error: "资料不存在" }, { status: 404 });
}

export function GET(_req: NextRequest, { params }: DocRoute) {
  const id = parseId(params.id);
  if (id === undefined) return invalidId();
  const doc = getDocument(id);
  return doc ? NextResponse.json({ doc }) : notFound();
}

export function DELETE(_req: NextRequest, { params }: DocRoute) {
  const id = parseId(params.id);
  if (id === undefined) return invalidId();
  return stmt.deleteDoc.run(id).changes
    ? NextResponse.json({ deleted: true })
    : notFound();
}
