import type { LoadoutMove } from "@/lib/loadouts/types";

export type Pet = {
  id: string;
  user_id: string;
  image_url: string | null;
  name: string | null;
  tier: string | null;
  title: string | null;
  sexuality: string | null;
  gender: string | null;
  owner: string | null;
  description: string | null;
  moves: LoadoutMove[] | null;
  created_at: string;
  updated_at: string;
};

export type PetPatch = Partial<Omit<Pet, "id" | "user_id" | "created_at" | "updated_at">>;
