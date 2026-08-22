import { supabase } from "@/lib/supabase";

export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  product_type: string;
  pack_size: number | null;
  price_essence: number;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Lista produtos da loja. A RLS já filtra: jogadores veem apenas produtos
 * ativos dentro da janela de disponibilidade; admins veem todos.
 */
export async function listShopProducts(): Promise<ShopProduct[]> {
  const { data, error } = await (supabase.from("tcg_shop_products") as any)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShopProduct[];
}

export type PurchaseResult = {
  purchase_id: string;
  product_name: string;
  price: number;
  packs_added: number;
  packs_total: number;
  essence_left: number;
};

/**
 * Compra um produto da loja. O frontend envia SOMENTE o product_id —
 * preço, tipo, quantidade e comprador são determinados pelo banco.
 */
export async function purchaseShopProduct(productId: string): Promise<PurchaseResult> {
  const { data, error } = await (supabase as any).rpc("tcg_purchase_shop_product", {
    _product_id: productId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    purchase_id: row.out_purchase_id,
    product_name: row.out_product_name,
    price: row.out_price,
    packs_added: row.out_packs_added,
    packs_total: row.out_packs_total,
    essence_left: row.out_essence_left,
  };
}

/* ---------- admin ---------- */

export type ShopProductDraft = {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  pack_size: number;
  price_essence: number;
  sort_order: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export async function adminSaveShopProduct(draft: ShopProductDraft) {
  const payload = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    image_url: draft.image_url.trim() || null,
    product_type: "PACK",
    pack_size: Math.max(1, Math.floor(draft.pack_size || 5)),
    price_essence: Math.max(1, Math.floor(draft.price_essence || 0)),
    sort_order: Math.floor(draft.sort_order || 0),
    active: draft.active,
    starts_at: draft.starts_at || null,
    ends_at: draft.ends_at || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) throw new Error("Informe o nome do produto.");
  if (draft.id) {
    const { error } = await (supabase.from("tcg_shop_products") as any)
      .update(payload)
      .eq("id", draft.id);
    if (error) throw error;
  } else {
    const { error } = await (supabase.from("tcg_shop_products") as any).insert(payload);
    if (error) throw error;
  }
}

export async function adminDeleteShopProduct(id: string) {
  const { error } = await (supabase.from("tcg_shop_products") as any).delete().eq("id", id);
  if (error) throw error;
}

export async function adminToggleShopProduct(id: string, active: boolean) {
  const { error } = await (supabase.from("tcg_shop_products") as any)
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
