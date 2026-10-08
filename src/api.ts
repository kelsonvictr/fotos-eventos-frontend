export type Event = {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  price_cents: number;
  open_gallery: boolean;
  status: "draft" | "published";
  photo_count: number;
  cover_url: string | null;
};
export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  preview_url: string;
};
export type Quote = {
  quantity: number;
  total_cents: number;
  unit_price_cents: number;
  checkout_available: boolean;
};
export type Health = {
  mode: "local" | "aws";
  stage: string;
  capabilities: {
    local_admin: boolean;
    admin_login: "local" | "otp";
    face_search: boolean;
    payments: boolean;
    downloads: boolean;
    email: boolean;
  };
};
export type OrderStatus =
  "awaiting_payment" | "paid" | "expired" | "cancelled" | "review";
export type Order = {
  id: string;
  event_id: string;
  event_name: string;
  status: OrderStatus;
  email: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  photos: { id: string; filename: string; preview_url: string | null }[];
  downloads_available: boolean;
  download_until: string | null;
  payment?: {
    method: "pix";
    pix_code: string;
    pix_qr_base64: string | null;
    expires_at: string;
  };
  provider?: string;
  provider_ref?: string | null;
};
export type Checkout = { order: Order; access_key: string; access_url: string };
export type DownloadLink = {
  photo_id: string;
  filename: string;
  url: string;
  expires_at: string;
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  expired: "Expirado",
  cancelled: "Cancelado",
  review: "Em análise",
};

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const content = await response.text();
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(
      "Não foi possível acessar a API. Confira se o backend está em execução.",
    );
  }
  if (!response.ok)
    throw new Error(
      data.error?.message || "Não foi possível concluir a solicitação.",
    );
  return data;
}
/** A chave do pedido viaja no fragmento (#k=…): o navegador nunca a envia ao servidor por URL. */
export const orderKeyFromHash = () =>
  new URLSearchParams(window.location.hash.replace(/^#/, "")).get("k") || "";
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const eventDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
