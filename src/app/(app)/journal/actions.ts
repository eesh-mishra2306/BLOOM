"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { deleteJournal, saveJournal, type JournalInput } from "@/lib/wellness/repo";

type Result = { ok: true; id: string } | { ok: false; error: string };

export async function saveEntry(input: JournalInput): Promise<Result> {
  const user = await requireUser();
  if (!input.body?.trim()) return { ok: false, error: "Write something first." };
  try {
    const id = await saveJournal(user.id, input);
    revalidatePath("/journal");
    revalidatePath("/dashboard");
    revalidatePath("/bloomverse");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Couldn't save this entry. Your words are still here — try again." };
  }
}

export async function deleteEntry(id: string): Promise<{ ok: true }> {
  const user = await requireUser();
  await deleteJournal(user.id, id);
  revalidatePath("/journal");
  return { ok: true };
}
