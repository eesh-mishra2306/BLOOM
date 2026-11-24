import { notFound } from "next/navigation";
import { MochiLab } from "./lab";

export default function MochiLabPage() {
  if (process.env.NODE_ENV === "production" && process.env.BLOOM_SHOW_DESIGN !== "1") notFound();
  return <MochiLab />;
}
