/** The copy of emergency details kept in this browser for /sos-offline.html. */
export const EMERGENCY_CARD_KEY = "bloom.emergencyCard.v1";

export interface EmergencyCard {
  v: 1;
  name: string;
  emergency: string;
  extras: { label: string; number: string }[];
  contacts: { name: string; phone: string }[];
  message: string | null;
  info: Record<string, string | undefined> | null;
  updatedAt: number;
}
