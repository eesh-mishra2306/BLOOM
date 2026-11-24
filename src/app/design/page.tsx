import { notFound } from "next/navigation";
import { DesignShowcase } from "./showcase";

export const metadata = { title: "Design system" };

export default function DesignPage() {
  if (process.env.NODE_ENV === "production" && process.env.BLOOM_SHOW_DESIGN !== "1") notFound();
  return <DesignShowcase />;
}
