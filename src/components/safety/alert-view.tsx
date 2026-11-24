"use client";
import { MapPin, Phone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { mapsLink, telLink } from "@/lib/safety/links";

type Props = {
  name: string;
  status: "active" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  phone: string | null;
  location: { lat: number; lng: number; accuracy: number; at?: number } | null;
  ack: { d: string; r: string } | null;
};

function ago(iso: string | number) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

export function AlertView({ name, status, createdAt, resolvedAt, phone, location, ack }: Props) {
  const router = useRouter();
  const [acked, setAcked] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [, setTick] = useState(0);
  const first = name.split(" ")[0];

  useEffect(() => {
    if (status !== "active") return;
    const id = window.setInterval(() => {
      router.refresh();
      setTick((t) => t + 1);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [router, status]);

  const time = new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="emergency-surface space-y-4">
      <Glass tier={1} petal className={status === "active" ? "border-2 border-sos-bg/60" : ""}>
        {status === "active" ? (
          <>
            <h1 className="text-3xl">{name} sent an SOS</h1>
            <p className="mt-1 text-fg">
              At {time} ({ago(createdAt)}). {first} may need help right now.
            </p>
          </>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-3xl">
              <ShieldCheck aria-hidden /> {name} is safe now
            </h1>
            <p className="mt-1 text-fg">They marked the SOS as resolved {resolvedAt ? ago(resolvedAt) : ""}.</p>
          </>
        )}
      </Glass>

      <Glass tier={2}>
        <h2 className="flex items-center gap-2 text-xl">
          <MapPin aria-hidden className="size-5" /> Location
        </h2>
        {location ? (
          <>
            <p className="mt-1 text-fg">
              Shared {location.at ? ago(location.at) : ""}, accurate to about {Math.round(location.accuracy)} m.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button asChild>
                <a href={mapsLink(location.lat, location.lng)} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`} target="_blank" rel="noopener noreferrer">
                  Open in OpenStreetMap
                </a>
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-muted">{first} hasn&apos;t shared a location. This page updates every few seconds while the SOS is active.</p>
        )}
      </Glass>

      <div className="grid gap-2">
        {phone ? (
          <Button asChild size="lg" className="h-16 text-xl">
            <a href={telLink(phone)}>
              <Phone aria-hidden /> Call {first}
            </a>
          </Button>
        ) : null}
        <Button asChild variant="danger" size="lg" className="h-16 text-xl">
          <a href="tel:112">
            <Phone aria-hidden /> Call emergency services (112)
          </a>
        </Button>
        {ack && status === "active" ? (
          <Button
            size="lg"
            variant="secondary"
            disabled={acked === "busy" || acked === "done"}
            onClick={async () => {
              setAcked("busy");
              const res = await fetch("/api/safety/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(ack) }).catch(() => null);
              setAcked(res?.ok ? "done" : "error");
            }}
          >
            {acked === "done" ? `${first} can see you're responding` : "I'm on it"}
          </Button>
        ) : null}
        {acked === "error" ? <p className="text-sm font-semibold text-sos-bg">Couldn&apos;t send that. Try calling {first} instead.</p> : null}
      </div>
      <p className="text-sm text-muted">BLOOM doesn&apos;t contact emergency services. If you think {first} is in danger, call 112 (or your local emergency number).</p>
    </div>
  );
}
