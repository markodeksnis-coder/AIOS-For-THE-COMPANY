import {
  Crown,
  Megaphone,
  Handshake,
  Package,
  UserCog,
  Cog,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  ceo: Crown,
  marketing: Megaphone,
  sales: Handshake,
  product: Package,
  "human-resources": UserCog,
  operations: Cog,
  finance: Wallet,
};

/** A distinct gradient per department — the "colorful module tile" look. */
export const DEPARTMENT_GRADIENTS: Record<string, string> = {
  ceo: "linear-gradient(135deg, #F59E0B, #F97316)",
  marketing: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
  sales: "linear-gradient(135deg, #3B82F6, #6366F1)",
  product: "linear-gradient(135deg, #14B8A6, #2DD4BF)",
  "human-resources": "linear-gradient(135deg, #EC4899, #F472B6)",
  operations: "linear-gradient(135deg, #22C55E, #4ADE80)",
  finance: "linear-gradient(135deg, #EAB308, #FACC15)",
};
