import { supabase } from "@/lib/supabase";
import type { TcgCard } from "@/lib/tcg/api";

export type ListingKind = "SALE" | "TRADE";

export type MarketListing = {
  id: string;
  seller_id: string;
  card_id: string;
  kind: ListingKind;
  price_essence: number | null;
  status: "ACTIVE" | "SOLD" | "CANCELED" | "EXPIRED" | "TRADED";
  buyer_id: string | null;
  created_at: string;
  sold_at: string | null;
  expires_at: string;
  /** joined */
  card?: TcgCard;
  seller_name?: string;
};

export type TradeOffer = {
  id: string;
  listing_id: string;
  offerer_id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  created_at: string;
  responded_at: string | null;
  /** joined */
  offered_cards: TcgCard[];
  listing?: MarketListing;
  offerer_name?: string;
};

const sb = supabase as any;

const LISTING_COLS =
  "id, seller_id, card_id, kind, price_essence, status, buyer_id, created_at, sold_at, expires_at";

function mapListing(r: any): MarketListing {
  return {
    id: r.id,
    seller_id: r.seller_id,
    card_id: r.card_id,
    kind: (r.kind ?? "SALE") as ListingKind,
    price_essence: r.price_essence ?? null,
    status: r.status,
    buyer_id: r.buyer_id,
    created_at: r.created_at,
    sold_at: r.sold_at,
    expires_at: r.expires_at,
    card: r.card as TcgCard,
    seller_name: r.seller?.username || undefined,
  };
}

function mapOffer(r: any): TradeOffer {
  return {
    id: r.id,
    listing_id: r.listing_id,
    offerer_id: r.offerer_id,
    status: r.status,
    created_at: r.created_at,
    responded_at: r.responded_at,
    offered_cards: (r.offered_cards ?? [])
      .map((t: any) => t.card as TcgCard)
      .filter(Boolean),
    listing: r.listing ? mapListing(r.listing) : undefined,
    offerer_name: r.offerer?.username || undefined,
  };
}

/** Busca usernames sem depender de relacionamento (FK) no PostgREST. */
async function fetchUsernames(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};
  const { data, error } = await sb
    .from("tcg_players")
    .select("user_id, username")
    .in("user_id", unique);
  if (error) return {};
  const map: Record<string, string> = {};
  for (const r of data ?? []) if (r.username) map[r.user_id] = r.username;
  return map;
}

export async function listMarketListings(): Promise<MarketListing[]> {
  const { data, error } = await sb
    .from("market_listings")
    .select(`${LISTING_COLS}, card:cards(*)`)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows: MarketListing[] = (data ?? []).map(mapListing);
  const names = await fetchUsernames(rows.map((r) => r.seller_id));
  return rows.map((r) => ({ ...r, seller_name: names[r.seller_id] }));

}

export async function listMyListings(userId: string): Promise<MarketListing[]> {
  const { data, error } = await sb
    .from("market_listings")
    .select(`${LISTING_COLS}, card:cards(*)`)
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

const OFFER_COLS =
  "id, listing_id, offerer_id, status, created_at, responded_at, offered_cards:trade_offer_cards(card:cards(*))";

export async function listReceivedTradeOffers(userId: string): Promise<TradeOffer[]> {
  const { data: myListings } = await sb
    .from("market_listings")
    .select("id")
    .eq("seller_id", userId)
    .eq("status", "ACTIVE");
  const ids = (myListings ?? []).map((l: any) => l.id);
  if (!ids.length) return [];
  const { data, error } = await sb
    .from("trade_offers")
    .select(`${OFFER_COLS}, listing:market_listings(${LISTING_COLS}, card:cards(*))`)
    .in("listing_id", ids)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows: TradeOffer[] = (data ?? []).map(mapOffer);
  const names = await fetchUsernames(rows.map((r) => r.offerer_id));
  return rows.map((r) => ({ ...r, offerer_name: names[r.offerer_id] }));
}

export async function listSentTradeOffers(userId: string): Promise<TradeOffer[]> {
  const { data, error } = await sb
    .from("trade_offers")
    .select(`${OFFER_COLS}, listing:market_listings(${LISTING_COLS}, card:cards(*))`)
    .eq("offerer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOffer);
}



export type CreateListingResult = { id: string; name: string; kind: ListingKind; price: number | null };

export async function createListing(
  cardId: string,
  kind: ListingKind,
  priceEssence: number | null,
): Promise<CreateListingResult> {
  const { data, error } = await sb.rpc("tcg_create_listing", {
    _card_id: cardId,
    _kind: kind,
    _price_essence: kind === "SALE" ? priceEssence : null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.out_id, name: row.out_name, kind: row.out_kind, price: row.out_price ?? null };
}

export async function cancelListing(listingId: string): Promise<void> {
  const { error } = await sb.rpc("tcg_cancel_listing", { _listing_id: listingId });
  if (error) throw error;
}

export type BuyResult = { name: string; price: number; seller_name: string };

export async function buyListing(listingId: string): Promise<BuyResult> {
  const { data, error } = await sb.rpc("tcg_buy_listing", { _listing_id: listingId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { name: row.out_name, price: row.out_price, seller_name: row.out_seller_name };
}

export async function createTradeOffer(
  listingId: string,
  offeredCardIds: string[],
): Promise<{ id: string; count: number }> {
  const { data, error } = await sb.rpc("tcg_create_trade_offer", {
    _listing_id: listingId,
    _offered_card_ids: offeredCardIds,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.out_id, count: row.out_count };
}

export async function acceptTradeOffer(offerId: string): Promise<{ listing_card: string; offered_card: string }> {
  const { data, error } = await sb.rpc("tcg_accept_trade_offer", { _offer_id: offerId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { listing_card: row.out_listing_card, offered_card: row.out_offered_card };
}

export async function declineTradeOffer(offerId: string): Promise<void> {
  const { error } = await sb.rpc("tcg_decline_trade_offer", { _offer_id: offerId });
  if (error) throw error;
}
