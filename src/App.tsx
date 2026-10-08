import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Aperture,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  ImagePlus,
  Images,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Plus,
  Receipt,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  ShoppingBag,
  Upload,
  X,
} from "lucide-react";
import {
  ORDER_STATUS_LABEL,
  api,
  dateTime,
  eventDate,
  money,
  orderKeyFromHash,
} from "./api";
import type {
  Checkout,
  DownloadLink,
  Event,
  Health,
  Order,
  Photo,
  Quote,
} from "./api";

function Brand() {
  return (
    <a className="brand" href="/">
      <span className="brand-icon">
        <Aperture size={27} />
      </span>
      <span>
        fotos<span className="brand-light">deeventos</span>
        <small>SEU MOMENTO FICA.</small>
      </span>
    </a>
  );
}
function Button({
  children,
  onClick,
  disabled,
  kind = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: string;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className={`button ${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="alert">
      {children}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" /> Carregando…
    </div>
  );
}

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Fechar">
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Health>("/health")
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);
  const path = window.location.pathname;
  const eventId = /^\/evento\/([a-f0-9]{32})$/.exec(path)?.[1];
  const orderId = /^\/pedido\/([a-f0-9]{32})$/.exec(path)?.[1];
  return (
    <>
      <div className="environment">
        {health?.mode === "aws"
          ? `AMBIENTE DE TESTES${health.stage === "prod" ? "" : ` (${health.stage})`}`
          : "PRÉVIA LOCAL"}{" "}
        <span>•</span> Busca por selfie e pagamento por Pix: em breve
      </div>
      {error ? (
        <main className="page">
          <Brand />
          <Notice>{error}</Notice>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </main>
      ) : !health ? (
        <Loading />
      ) : eventId ? (
        <Gallery eventId={eventId} health={health} />
      ) : orderId ? (
        <OrderPage orderId={orderId} />
      ) : path === "/pedido" ? (
        <RecoverPage health={health} />
      ) : path === "/" || path === "/admin" ? (
        <Admin health={health} />
      ) : (
        <main className="page">
          <Brand />
          <h1>Página não encontrada.</h1>
          <a href="/">Voltar ao início</a>
        </main>
      )}
    </>
  );
}

function Admin({ health }: { health: Health }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploadState, setUploadState] = useState<{
    completed: number;
    total: number;
    failures: string[];
    duplicates: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Photo | null>(null);
  async function refresh(id?: string) {
    const data = await api<{ events: Event[] }>("/admin/events");
    setEvents(data.events);
    if (id) {
      setSelected(data.events.find((e) => e.id === id) || null);
      setPhotos(
        (await api<{ photos: Photo[] }>(`/admin/events/${id}/photos`)).photos,
      );
      setOrders(
        (await api<{ orders: Order[] }>(`/admin/events/${id}/orders`)).orders,
      );
    }
  }
  useEffect(() => {
    api<{ authenticated: boolean }>("/admin/session")
      .then((s) => setAuthenticated(s.authenticated))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (authenticated) refresh().catch((e) => setError(e.message));
  }, [authenticated]);
  async function login() {
    setBusy(true);
    setError("");
    try {
      await api("/admin/session", { method: "POST" });
      setAuthenticated(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openEvent(event: Event) {
    setError("");
    setSelected(event);
    setPhotos([]);
    setOrders([]);
    setUploadState(null);
    try {
      setPhotos(
        (await api<{ photos: Photo[] }>(`/admin/events/${event.id}/photos`))
          .photos,
      );
      setOrders(
        (await api<{ orders: Order[] }>(`/admin/events/${event.id}/orders`))
          .orders,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveEvent(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const saved = await api<Event>(
        editing && selected ? `/admin/events/${selected.id}` : "/admin/events",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      await refresh(saved.id);
      setForm(false);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/events/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selected.status === "published" ? "draft" : "published",
        }),
      });
      await refresh(selected.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files || !selected || busy) return;
    const eventId = selected.id;
    const list = Array.from(files);
    const failures: string[] = [];
    let duplicates = 0;
    setBusy(true);
    setError("");
    setUploadState({
      completed: 0,
      total: list.length,
      failures: [],
      duplicates: 0,
    });
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        if (file.size > 20 * 1024 * 1024)
          throw new Error("Limite de 20 MB por foto.");
        const result = await uploadPhoto(eventId, file);
        if (result.duplicate) duplicates++;
      } catch (e) {
        failures.push(`${file.name}: ${(e as Error).message}`);
      }
      setUploadState({
        completed: i + 1,
        total: list.length,
        failures: [...failures],
        duplicates,
      });
    }
    try {
      await refresh(eventId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function copyLink() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/evento/${selected.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError(
        "Não foi possível copiar. Use Abrir galeria e copie o endereço.",
      );
    }
  }
  if (authenticated === null) return <Loading />;
  if (!authenticated)
    return (
      <>
        <nav className="topbar">
          <Brand />
          <span className="pill">ESPAÇO DO FOTÓGRAFO</span>
        </nav>
        <main className="welcome">
          <div>
            <span className="eyebrow">MENOS ENVIO MANUAL. MAIS MOMENTOS.</span>
            <h1>
              Você registra.
              <br />A memória <em>fica.</em>
            </h1>
            <p>
              Organize as fotos dos seus eventos em um só lugar. Prepare a
              galeria e compartilhe cada história.
            </p>
            {error && <Notice>{error}</Notice>}
            {health.capabilities.admin_login === "otp" ? (
              <OtpLogin onSuccess={() => setAuthenticated(true)} />
            ) : (
              <>
                <Button
                  onClick={() => void login()}
                  disabled={busy || !health.capabilities?.local_admin}
                >
                  Abrir painel local <ArrowRight size={18} />
                </Button>
                <small className="muted">
                  Acesso de desenvolvimento, disponível apenas neste computador.
                </small>
              </>
            )}
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-frame">
              <Aperture size={150} strokeWidth={1} />
              <span>
                CADA ENCONTRO.
                <br />
                UM NOVO ÁLBUM.
              </span>
              <small>01 / FOTOS DE EVENTOS</small>
            </div>
            <div className="art-label">
              <Camera size={18} /> Pronto para o próximo clique.
            </div>
          </div>
        </main>
        <footer>
          Fotos de eventos{" "}
          <span>Uma nova forma de guardar o que foi vivido.</span>
        </footer>
      </>
    );
  const filtered = events.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || e.status === filter),
  );
  const photoCount = events.reduce((sum, e) => sum + e.photo_count, 0);
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">ESPAÇO DO FOTÓGRAFO</div>
        <button
          className="nav-item active"
          disabled={busy}
          onClick={() => {
            setSelected(null);
            setError("");
          }}
        >
          <LayoutGrid size={19} /> Meus eventos <span>{events.length}</span>
        </button>
        <div className="sidebar-note">
          <ShieldCheck size={23} />
          <strong>O original fica protegido.</strong>
          <p>Suas galerias mostram apenas prévias com marca d’água.</p>
        </div>
        <button
          className="nav-item logout"
          onClick={async () => {
            try {
              await api("/admin/logout", { method: "POST" });
              setAuthenticated(false);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
          disabled={busy}
        >
          <LogOut size={18} /> Sair do painel
        </button>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span>
            Seu espaço <ChevronRight size={14} />{" "}
            {selected ? selected.name : "Meus eventos"}
          </span>
          <div className="profile">
            F
            <span>
              Fotógrafo{" "}
              <small>
                {health.mode === "aws"
                  ? "Ambiente de testes"
                  : "Ambiente local"}
              </small>
            </span>
          </div>
        </header>
        <main className="workspace-main">
          {error && <Notice>{error}</Notice>}
          {!selected ? (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">SEU TRABALHO, ORGANIZADO.</span>
                  <h1>
                    Meus eventos<span className="title-dot">.</span>
                  </h1>
                  <p>Do primeiro clique à próxima lembrança.</p>
                </div>
                <Button
                  onClick={() => {
                    setEditing(false);
                    setForm(true);
                  }}
                >
                  <Plus size={18} /> Novo evento
                </Button>
              </div>
              <div className="stats">
                <Stat
                  icon={<CalendarDays />}
                  label="Eventos criados"
                  value={events.length}
                />
                <Stat
                  icon={<Images />}
                  label="Fotos organizadas"
                  value={photoCount}
                />
                <Stat
                  icon={<Eye />}
                  label="Eventos publicados"
                  value={events.filter((e) => e.status === "published").length}
                />
              </div>
              <section className="event-section">
                <div className="section-toolbar">
                  <div className="tabs">
                    {[
                      ["all", "Todos"],
                      ["published", "Publicados"],
                      ["draft", "Rascunhos"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={filter === value ? "active" : ""}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    aria-label="Buscar evento"
                    placeholder="Buscar evento…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {filtered.length ? (
                  <div className="event-grid">
                    {filtered.map((e) => (
                      <button
                        className="event-card"
                        key={e.id}
                        onClick={() => openEvent(e)}
                      >
                        <div className="event-cover">
                          {e.cover_url ? (
                            <img src={e.cover_url} alt="" />
                          ) : (
                            <div className="cover-empty">
                              <Aperture size={58} strokeWidth={1} />
                              <span>SEU PRÓXIMO ÁLBUM</span>
                            </div>
                          )}
                          <span className={`status ${e.status}`}>
                            {e.status === "published"
                              ? "Publicado"
                              : "Rascunho"}
                          </span>
                        </div>
                        <div className="event-card-body">
                          <small>{eventDate(e.date)}</small>
                          <h3>{e.name}</h3>
                          <p>
                            <MapPin size={14} />{" "}
                            {e.location || "Local não informado"}
                          </p>
                          <div>
                            <span>
                              <Images size={15} /> {e.photo_count} fotos
                            </span>
                            <strong>
                              {money(e.price_cents)} <small>/ foto</small>
                            </strong>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-event">
                    <div className="empty-symbol">
                      <ImagePlus size={42} strokeWidth={1.3} />
                    </div>
                    <span className="eyebrow">TODA GALERIA COMEÇA AQUI</span>
                    <h2>
                      {events.length
                        ? "Nenhum evento por aqui."
                        : "Seu primeiro evento merece um álbum."}
                    </h2>
                    <p>
                      {events.length
                        ? "Experimente outro filtro ou uma nova busca."
                        : "Crie um evento, envie suas fotos e prepare uma galeria para compartilhar."}
                    </p>
                    {!events.length && (
                      <Button
                        onClick={() => {
                          setEditing(false);
                          setForm(true);
                        }}
                      >
                        <Plus size={17} /> Criar meu primeiro evento
                      </Button>
                    )}
                  </div>
                )}
              </section>
              <div className="workflow-strip">
                <span>UM CAMINHO SIMPLES</span>
                <p>
                  <b>01</b> Crie o evento
                </p>
                <ChevronRight size={15} />
                <p>
                  <b>02</b> Envie as fotos
                </p>
                <ChevronRight size={15} />
                <p>
                  <b>03</b> Compartilhe a galeria
                </p>
              </div>
            </>
          ) : (
            <>
              <button
                className="back"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setError("");
                }}
              >
                <ArrowLeft size={16} /> Todos os eventos
              </button>
              <div className="page-title">
                <div>
                  <span className={`status inline ${selected.status}`}>
                    {selected.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                  <h1 className="event-title">{selected.name}</h1>
                  <p>
                    {eventDate(selected.date)}{" "}
                    {selected.location && `· ${selected.location}`}
                  </p>
                </div>
                <Button
                  kind="secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditing(true);
                    setForm(true);
                  }}
                >
                  Editar evento
                </Button>
              </div>
              <div className="detail-summary">
                <span>
                  <Images size={18} /> {selected.photo_count} fotos
                </span>
                <span>{money(selected.price_cents)} por foto</span>
                <span>
                  <ShieldCheck size={18} /> Prévias protegidas
                </span>
              </div>
              <div className="publish-bar">
                <div>
                  <strong>
                    {selected.status === "published"
                      ? "Seu evento está publicado."
                      : "Prepare sua galeria antes de compartilhar."}
                  </strong>
                  <p>
                    {selected.open_gallery
                      ? "Galeria aberta: participantes com o link podem ver todas as prévias."
                      : "Galeria geral fechada. A busca por selfie ainda precisa ser habilitada."}
                  </p>
                </div>
                <div className="button-row">
                  {selected.status === "published" && (
                    <>
                      <Button kind="secondary" onClick={copyLink}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? "Copiado" : "Copiar link"}
                      </Button>
                      <a
                        className="button secondary"
                        href={`/evento/${selected.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir galeria <ExternalLink size={16} />
                      </a>
                    </>
                  )}
                  <Button
                    disabled={busy || !selected.photo_count}
                    onClick={publish}
                  >
                    {selected.status === "published"
                      ? "Despublicar"
                      : "Publicar evento"}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
              <section
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void upload(e.dataTransfer.files);
                }}
              >
                <div className="upload-icon">
                  <Upload size={25} />
                </div>
                <div>
                  <h3>As melhores lembranças começam com suas fotos.</h3>
                  <p>
                    Arraste seus arquivos ou selecione no computador. JPG, até
                    20 MB por foto.
                  </p>
                </div>
                <Button
                  kind="secondary"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  <Plus size={17} /> Enviar fotos
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,.jpg,.jpeg"
                  multiple
                  hidden
                  onChange={(e) => void upload(e.target.files)}
                />
              </section>
              {uploadState && (
                <div className="upload-progress" role="status">
                  <span>
                    {busy ? "Processando" : "Envio concluído"}:{" "}
                    {uploadState.completed} de {uploadState.total} arquivos
                    {uploadState.duplicates > 0 &&
                      ` · ${uploadState.duplicates} já existentes`}
                  </span>
                  <progress
                    value={uploadState.completed}
                    max={uploadState.total}
                  />
                  {uploadState.failures.map((f, i) => (
                    <p className="error-text" key={i}>
                      {f}
                    </p>
                  ))}
                </div>
              )}
              <div className="section-heading">
                <h2>
                  Fotos do evento <span>{photos.length}</span>
                </h2>
                <small>
                  A marca d’água é aplicada automaticamente na prévia.
                </small>
              </div>
              {photos.length ? (
                <div className="photo-grid">
                  {photos.map((p) => (
                    <button
                      className="photo-card"
                      key={p.id}
                      onClick={() => setPreview(p)}
                    >
                      <img
                        src={p.preview_url}
                        alt={p.filename}
                        loading="lazy"
                      />
                      <div>
                        <span>{p.filename}</span>
                        <small>
                          {p.width} × {p.height}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="photo-empty">
                  <Images size={35} />
                  <h3>Esperando os primeiros cliques.</h3>
                  <p>
                    As fotos enviadas aparecem aqui, já com a prévia protegida.
                  </p>
                </div>
              )}
              <OrdersPanel
                orders={orders}
                paymentsEnabled={health.capabilities.payments}
                onReconcile={async (order) => {
                  setError("");
                  try {
                    const updated = await api<Order>(
                      `/admin/orders/${order.id}/reconcile`,
                      { method: "POST" },
                    );
                    setOrders((list) =>
                      list.map((o) => (o.id === updated.id ? updated : o)),
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </>
          )}
          <footer className="workspace-footer">
            Fotos de eventos <span>Feito para o que vale lembrar.</span>
          </footer>
        </main>
      </div>
      {form && (
        <EventForm
          initial={editing ? selected : null}
          save={saveEvent}
          busy={busy}
          close={() => {
            if (!busy) setForm(false);
          }}
        />
      )}
      {preview && (
        <Modal title={preview.filename} close={() => setPreview(null)}>
          <img
            className="large-preview"
            src={preview.preview_url}
            alt={preview.filename}
          />
          <p className="muted">
            Prévia com marca d’água. O arquivo original permanece privado.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value.toString().padStart(2, "0")}</strong>
      </div>
    </div>
  );
}

function EventForm({
  initial,
  save,
  busy,
  close,
}: {
  initial: Event | null;
  save: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  close: () => void;
}) {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError("");
    try {
      await save({
        name: data.get("name"),
        date: data.get("date"),
        location: data.get("location"),
        description: data.get("description"),
        price_cents: Math.round(Number(data.get("price")) * 100),
        open_gallery: data.get("open_gallery") === "on",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={initial ? "Editar evento" : "Um novo evento, muitas histórias."}
      close={close}
    >
      <p className="modal-intro">
        Comece com os detalhes. Você envia as fotos na próxima etapa.
      </p>
      <form onSubmit={submit}>
        {error && <Notice>{error}</Notice>}
        <label>
          Nome do evento
          <input
            name="name"
            required
            minLength={3}
            maxLength={100}
            defaultValue={initial?.name}
            placeholder="Como esse momento será lembrado?"
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            Data do evento
            <input
              name="date"
              type="date"
              required
              defaultValue={initial?.date}
            />
          </label>
          <label>
            Preço por foto (R$)
            <input
              name="price"
              type="number"
              required
              min="0.01"
              max="1000"
              step="0.01"
              defaultValue={initial ? initial.price_cents / 100 : undefined}
              placeholder="0,00"
            />
          </label>
        </div>
        <label>
          Local
          <input
            name="location"
            maxLength={120}
            defaultValue={initial?.location}
            placeholder="Espaço, bairro ou cidade"
          />
        </label>
        <label>
          Descrição <span className="optional">opcional</span>
          <textarea
            name="description"
            maxLength={600}
            rows={3}
            defaultValue={initial?.description}
            placeholder="Conte um pouco sobre esse encontro."
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="open_gallery"
            defaultChecked={initial?.open_gallery ?? false}
          />
          <span>
            <strong>Permitir galeria aberta pelo link</strong>
            <small>
              Quem tiver o link poderá ver todas as prévias, sem busca facial.
            </small>
          </span>
        </label>
        <div className="modal-actions">
          <Button kind="secondary" disabled={busy} onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
            {initial ? "Salvar alterações" : "Criar evento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Gallery({ eventId, health }: { eventId: string; health: Health }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [preview, setPreview] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const e = await api<Event>(`/events/${eventId}`);
        if (!active) return;
        setEvent(e);
        if (e.open_gallery) {
          const p = await api<{ photos: Photo[] }>(`/events/${eventId}/photos`);
          if (active) setPhotos(p.photos);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id)
        ? s.filter((v) => v !== id)
        : s.length < 100
          ? [...s, id]
          : s,
    );
  }
  async function review() {
    setBusy(true);
    setError("");
    try {
      setQuote(
        await api<Quote>(`/events/${eventId}/quote`, {
          method: "POST",
          body: JSON.stringify({ photo_ids: selected }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <nav className="topbar">
        <Brand />
        <span className="gallery-bag">
          <ShoppingBag size={20} /> {selected.length}{" "}
          {selected.length === 1 ? "foto" : "fotos"}
        </span>
      </nav>
      {!event ? (
        <main className="page">
          {error ? <Notice>{error}</Notice> : <Loading />}
        </main>
      ) : (
        <main className="gallery-page">
          <section className="gallery-hero">
            <div>
              <span className="eyebrow">
                VOCÊ ESTAVA LÁ. SUA HISTÓRIA TAMBÉM.
              </span>
              <h1>
                {event.name}
                <span className="title-dot">.</span>
              </h1>
              <div className="event-meta">
                <span>
                  <CalendarDays size={17} />
                  {eventDate(event.date)}
                </span>
                {event.location && (
                  <span>
                    <MapPin size={17} />
                    {event.location}
                  </span>
                )}
              </div>
              {event.description && <p>{event.description}</p>}
              <a className="gallery-anchor" href="#fotos">
                Explore as fotos <ArrowDown size={17} />
              </a>
            </div>
            <div className="hero-picture">
              {event.cover_url ? (
                <img
                  src={event.cover_url}
                  alt={`Prévia do evento ${event.name}`}
                />
              ) : (
                <Aperture size={120} strokeWidth={1} />
              )}
              <span>
                <Camera size={17} /> {event.photo_count} momentos registrados
              </span>
            </div>
          </section>
          <section className="selfie-panel">
            <div className="selfie-icon">
              <ScanFace size={35} strokeWidth={1.4} />
            </div>
            <div>
              <h2>Encontre seus melhores momentos.</h2>
              <p>
                A busca por selfie estará disponível após a validação do
                reconhecimento facial.
              </p>
            </div>
            <span className="coming-soon">Em breve</span>
          </section>
          <section id="fotos">
            <div className="gallery-section-title">
              <div>
                <span className="eyebrow">UM ENCONTRO. MUITAS MEMÓRIAS.</span>
                <h2>
                  Fotos do evento{" "}
                  <span>{event.open_gallery ? photos.length : ""}</span>
                </h2>
              </div>
              <div className="price-tag">
                <strong>{money(event.price_cents)}</strong>
                <span>por foto em alta resolução</span>
              </div>
            </div>
            {error && <Notice>{error}</Notice>}
            {event.open_gallery ? (
              <>
                <p className="gallery-help">
                  Galeria aberta pelo fotógrafo. Escolha suas fotos para
                  conferir a seleção.
                </p>
                <div className="gallery-grid">
                  {photos.map((p, i) => (
                    <article
                      className={`gallery-photo ${selected.includes(p.id) ? "chosen" : ""}`}
                      key={p.id}
                    >
                      <button
                        className="photo-open"
                        onClick={() => setPreview(p)}
                        aria-label={`Ampliar foto ${i + 1}`}
                      >
                        <img
                          src={p.preview_url}
                          alt={`Foto ${i + 1} de ${event.name}`}
                          loading="lazy"
                        />
                      </button>
                      <button
                        className="select-photo"
                        aria-label={`${selected.includes(p.id) ? "Remover" : "Selecionar"} foto ${i + 1}`}
                        aria-pressed={selected.includes(p.id)}
                        onClick={() => toggle(p.id)}
                      >
                        {selected.includes(p.id) ? (
                          <Check size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                      </button>
                      <div>
                        <span>FOTO {String(i + 1).padStart(3, "0")}</span>
                        <strong>{money(event.price_cents)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
                {!photos.length && (
                  <div className="photo-empty">
                    <Images />
                    <h3>As fotos estão sendo preparadas.</h3>
                  </div>
                )}
              </>
            ) : (
              <div className="photo-empty">
                <ShieldCheck size={35} />
                <h3>Este evento não tem galeria aberta.</h3>
                <p>
                  O fotógrafo ainda está preparando a forma de encontrar suas
                  fotos.
                </p>
              </div>
            )}
          </section>
          <div className="gallery-promise">
            <ShieldCheck size={22} />
            <p>
              As imagens exibidas são prévias protegidas.
              <br />
              <strong>
                Os originais permanecem em alta resolução com o fotógrafo.
              </strong>
            </p>
          </div>
        </main>
      )}
      <footer className="gallery-footer">
        Fotos de eventos <span>Porque o momento passa. A foto fica.</span>
        <a href="/pedido">Já comprou? Recuperar acesso ao pedido</a>
      </footer>
      {selected.length > 0 && (
        <div className="selection-bar">
          <span className="selection-count">
            <ShoppingBag size={21} />
            <strong>{selected.length}</strong>{" "}
            {selected.length === 1 ? "foto selecionada" : "fotos selecionadas"}
          </span>
          <div>
            <span className="selection-total">
              {money(selected.length * (event?.price_cents || 0))}
            </span>
            <Button onClick={review} disabled={busy}>
              Conferir seleção <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      )}
      {quote && (
        <Modal title="Sua seleção de lembranças" close={() => setQuote(null)}>
          <div className="quote-icon">
            <ShoppingBag size={35} />
          </div>
          <div className="quote-line">
            <span>
              {quote.quantity} {quote.quantity === 1 ? "foto" : "fotos"} ×{" "}
              {money(quote.unit_price_cents)}
            </span>
            <strong>{money(quote.total_cents)}</strong>
          </div>
          {quote.checkout_available && health.capabilities.payments ? (
            <CheckoutForm eventId={eventId} photoIds={selected} />
          ) : (
            <>
              <div className="checkout-notice">
                <CheckCircle2 size={21} />
                <div>
                  <strong>Seleção conferida.</strong>
                  <p>
                    Pagamento por Pix em breve. Por enquanto, nenhuma cobrança
                    ou pedido é criado.
                  </p>
                </div>
              </div>
              <Button kind="wide" onClick={() => setQuote(null)}>
                Continuar escolhendo
              </Button>
            </>
          )}
        </Modal>
      )}
      {preview && (
        <Modal title="Veja seu momento de perto" close={() => setPreview(null)}>
          <img
            className="large-preview"
            src={preview.preview_url}
            alt="Prévia da foto selecionada"
          />
          <div className="modal-actions">
            <span className="muted">Prévia com marca d’água</span>
            <Button
              onClick={() => {
                toggle(preview.id);
                setPreview(null);
              }}
            >
              {selected.includes(preview.id)
                ? "Remover da seleção"
                : "Escolher esta foto"}
              <Check size={17} />
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function CheckoutForm({
  eventId,
  photoIds,
}: {
  eventId: string;
  photoIds: string[];
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    setBusy(true);
    setError("");
    try {
      const result = await api<Checkout>(`/events/${eventId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ photo_ids: photoIds, email }),
      });
      // A chave fica no fragmento: não é enviada ao servidor nem registrada em logs.
      window.location.assign(
        `/pedido/${result.order.id}#k=${encodeURIComponent(result.access_key)}`,
      );
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form className="checkout-form" onSubmit={submit}>
      {error && <Notice>{error}</Notice>}
      <label>
        Seu e-mail
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="para receber o acesso ao pedido"
        />
      </label>
      <small className="muted">
        Usamos o e-mail apenas para enviar o acesso a este pedido e às fotos
        compradas. O download é liberado depois que o pagamento for confirmado
        no servidor.
      </small>
      <Button type="submit" kind="wide" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Receipt size={17} />
        )}
        Gerar cobrança Pix
      </Button>
    </form>
  );
}

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={`order-status ${status}`}>
      {status === "paid" ? (
        <CheckCircle2 size={14} />
      ) : status === "awaiting_payment" ? (
        <Clock size={14} />
      ) : (
        <Receipt size={14} />
      )}
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

function OrderPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState<DownloadLink[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const key = orderKeyFromHash();
  async function load() {
    try {
      setOrder(
        await api<Order>(`/orders/${orderId}`, {
          headers: { "X-Order-Key": key },
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!key) {
      setError(
        "Este link não contém a chave de acesso do pedido. Use o link completo recebido por e-mail.",
      );
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  useEffect(() => {
    if (order?.status !== "awaiting_payment") return;
    const timer = setInterval(() => void load(), 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);
  async function requestDownloads() {
    setBusy(true);
    setError("");
    try {
      setDownloads(
        (
          await api<{ downloads: DownloadLink[] }>(
            `/orders/${orderId}/downloads`,
            { method: "POST", headers: { "X-Order-Key": key } },
          )
        ).downloads,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copyPix() {
    if (!order?.payment) return;
    try {
      await navigator.clipboard.writeText(order.payment.pix_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError(
        "Não foi possível copiar. Selecione o código e copie manualmente.",
      );
    }
  }
  return (
    <>
      <nav className="topbar">
        <Brand />
        <span className="pill">SEU PEDIDO</span>
      </nav>
      <main className="order-page">
        {!order ? (
          error ? (
            <>
              <Notice>{error}</Notice>
              <a className="back" href="/pedido">
                Recuperar acesso por e-mail
              </a>
            </>
          ) : (
            <Loading />
          )
        ) : (
          <>
            <div className="order-head">
              <div>
                <span className="eyebrow">PEDIDO · {order.event_name}</span>
                <h1>
                  {order.quantity} {order.quantity === 1 ? "foto" : "fotos"} em
                  alta resolução
                </h1>
                <p>
                  Criado em {dateTime(order.created_at)} · {order.email}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            {error && <Notice>{error}</Notice>}
            {order.status === "awaiting_payment" && order.payment && (
              <section className="order-card">
                <h2>Pague com Pix para liberar o download.</h2>
                <p>
                  Código válido até {dateTime(order.payment.expires_at)}. A
                  página atualiza sozinha quando o pagamento for confirmado.
                </p>
                <div className="pix-box">
                  <div>
                    <textarea
                      readOnly
                      value={order.payment.pix_code}
                      aria-label="Pix copia e cola"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button kind="secondary" onClick={copyPix}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copiado" : "Copiar código Pix"}
                    </Button>
                  </div>
                  {order.payment.pix_qr_base64 && (
                    <img
                      src={`data:image/png;base64,${order.payment.pix_qr_base64}`}
                      alt="QR Code Pix"
                    />
                  )}
                </div>
              </section>
            )}
            {order.status === "paid" && (
              <section className="order-card">
                <h2>Pagamento confirmado.</h2>
                <p>
                  {order.downloads_available
                    ? `Baixe os arquivos originais, sem marca d'água, até ${order.download_until ? dateTime(order.download_until) : ""}. Os links gerados valem por 15 minutos; gere novos quando precisar.`
                    : "O prazo de download deste pedido terminou. Fale com o fotógrafo para nova liberação."}
                </p>
                {order.downloads_available && !downloads && (
                  <Button onClick={requestDownloads} disabled={busy}>
                    {busy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Download size={17} />
                    )}
                    Gerar links de download
                  </Button>
                )}
              </section>
            )}
            {order.status === "expired" && (
              <section className="order-card">
                <h2>Esta cobrança expirou.</h2>
                <p>
                  Nenhum valor foi cobrado. Volte à galeria e faça uma nova
                  seleção. Se você pagou após o prazo, a confirmação ainda será
                  aplicada automaticamente.
                </p>
                <a className="back" href={`/evento/${order.event_id}`}>
                  Voltar à galeria
                </a>
              </section>
            )}
            {order.status === "cancelled" && (
              <section className="order-card">
                <h2>Pedido cancelado.</h2>
                <p>
                  Nenhum download foi liberado. Você pode fazer uma nova seleção
                  na galeria.
                </p>
                <a className="back" href={`/evento/${order.event_id}`}>
                  Voltar à galeria
                </a>
              </section>
            )}
            {order.status === "review" && (
              <section className="order-card">
                <h2>Pagamento em análise.</h2>
                <p>
                  O provedor informou um pagamento que não confere com o valor
                  deste pedido. O fotógrafo vai verificar antes de liberar os
                  arquivos.
                </p>
              </section>
            )}
            <section className="order-card">
              <h2>Fotos deste pedido</h2>
              <ul className="order-items">
                {order.photos.map((p, i) => {
                  const link = downloads?.find((d) => d.photo_id === p.id);
                  return (
                    <li key={p.id}>
                      <OrderThumb src={p.preview_url} index={i + 1} />
                      <span>{p.filename}</span>
                      {link && (
                        <a href={link.url} download={link.filename}>
                          <Download size={14} /> Baixar original
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="order-total">
                <span>
                  {order.quantity} × {money(order.unit_price_cents)}
                </span>
                <strong>{money(order.total_cents)}</strong>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="gallery-footer">
        Fotos de eventos <span>Guarde este link para voltar ao pedido.</span>
      </footer>
    </>
  );
}

function OrderThumb({ src, index }: { src: string | null; index: number }) {
  const [failed, setFailed] = useState(false);
  // A prévia depende de o evento seguir publicado com galeria aberta; o download não depende disso.
  return failed || !src ? (
    <div className="no-preview" aria-label={`Foto ${index}`}>
      <Images size={22} />
    </div>
  ) : (
    <img
      src={src}
      alt={`Prévia da foto ${index}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function RecoverPage({ health }: { health: Health }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    setBusy(true);
    setError("");
    try {
      await api("/orders/recover", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <nav className="topbar">
        <Brand />
        <span className="pill">RECUPERAR PEDIDO</span>
      </nav>
      <main className="order-page">
        <span className="eyebrow">SEM SENHA, SEM CADASTRO.</span>
        <h1>Recuperar acesso ao pedido.</h1>
        <p className="muted">
          Informe o e-mail usado na compra. Enviaremos novos links de acesso; os
          anteriores deixam de valer.
        </p>
        {!health.capabilities.email ? (
          <Notice>
            O envio de e-mails ainda não está habilitado neste ambiente. Guarde
            o link do pedido mostrado após a compra.
          </Notice>
        ) : sent ? (
          <div className="checkout-notice">
            <Mail size={21} />
            <div>
              <strong>Pedido de recuperação recebido.</strong>
              <p>
                Se houver pedidos para este e-mail, os links chegam em alguns
                minutos. Confira também a caixa de spam.
              </p>
            </div>
          </div>
        ) : (
          <form className="recover-form" onSubmit={submit}>
            {error && <Notice>{error}</Notice>}
            <label>
              E-mail da compra
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Mail size={17} />
              )}
              Enviar links de acesso
            </Button>
          </form>
        )}
      </main>
      <footer className="gallery-footer">
        Fotos de eventos <span>Porque o momento passa. A foto fica.</span>
      </footer>
    </>
  );
}

function OrdersPanel({
  orders,
  paymentsEnabled,
  onReconcile,
}: {
  orders: Order[];
  paymentsEnabled: boolean;
  onReconcile: (order: Order) => Promise<void>;
}) {
  const paid = orders.filter((o) => o.status === "paid");
  const gross = paid.reduce((sum, o) => sum + o.total_cents, 0);
  return (
    <section className="orders-panel">
      <div className="section-heading">
        <h2>
          Pedidos <span>{orders.length}</span>
        </h2>
        <small>
          {paymentsEnabled
            ? "Pagamentos confirmados somente pelo provedor Pix."
            : "Sem provedor Pix configurado: nenhum pedido pode ser criado neste ambiente."}
        </small>
      </div>
      {orders.length > 0 && (
        <div className="orders-summary">
          <span>
            Pagos: <strong>{paid.length}</strong>
          </span>
          <span>
            Fotos vendidas:{" "}
            <strong>{paid.reduce((sum, o) => sum + o.quantity, 0)}</strong>
          </span>
          <span>
            Total bruto pago: <strong>{money(gross)}</strong>
          </span>
        </div>
      )}
      {orders.length ? (
        <table>
          <thead>
            <tr>
              <th>Criado</th>
              <th>E-mail</th>
              <th>Fotos</th>
              <th>Total</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{dateTime(o.created_at)}</td>
                <td className="email" title={o.email}>
                  {o.email}
                </td>
                <td>{o.quantity}</td>
                <td>{money(o.total_cents)}</td>
                <td>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td>
                  {o.status !== "paid" && (
                    <Button
                      kind="secondary"
                      disabled={!paymentsEnabled}
                      onClick={() => void onReconcile(o)}
                    >
                      <RefreshCw size={14} /> Reconsultar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">
          Nenhum pedido neste evento. Pedidos aparecem aqui quando um
          participante gera uma cobrança Pix.
        </p>
      )}
    </section>
  );
}

/** Envio em duas etapas: o servidor autoriza, o arquivo vai direto ao armazenamento
 * (S3 por URL assinada na nuvem, rota local em desenvolvimento) e o servidor valida e gera a prévia. */
async function uploadPhoto(eventId: string, file: File) {
  const target = await api<{
    id: string;
    upload_url: string;
    method: string;
    headers: Record<string, string>;
  }>(`/admin/events/${eventId}/uploads`, {
    method: "POST",
    body: JSON.stringify({ filename: file.name, size: file.size }),
  });
  const sameOrigin = target.upload_url.startsWith("/");
  let sent: Response;
  try {
    sent = await fetch(target.upload_url, {
      method: target.method,
      body: file,
      headers: target.headers,
      credentials: sameOrigin ? "same-origin" : "omit",
    });
  } catch {
    throw new Error("Falha de rede ao enviar a foto. Tente novamente.");
  }
  if (!sent.ok)
    throw new Error("O envio da foto foi recusado. Tente novamente.");
  return api<{ id: string; duplicate: boolean }>(
    `/admin/events/${eventId}/uploads/${target.id}/complete`,
    { method: "POST" },
  );
}

function OtpLogin({ onSuccess }: { onSuccess: () => void }) {
  const [challenge, setChallenge] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ challenge_id: string; message: string }>(
        "/admin/otp/request",
        { method: "POST", body: JSON.stringify({ email }) },
      );
      setChallenge(result.challenge_id);
      setInfo(result.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") || "");
    setBusy(true);
    setError("");
    try {
      await api("/admin/otp/verify", {
        method: "POST",
        body: JSON.stringify({ challenge_id: challenge, code }),
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-form">
      {error && <Notice>{error}</Notice>}
      {!challenge ? (
        <form onSubmit={requestCode}>
          <label>
            E-mail do fotógrafo
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Mail size={17} />
            )}
            Enviar código de acesso
          </Button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p className="muted">{info}</p>
          <label>
            Código de 6 dígitos
            <input
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
            />
          </label>
          <div className="button-row">
            <Button type="submit" disabled={busy}>
              Entrar no painel <ArrowRight size={18} />
            </Button>
            <Button
              kind="secondary"
              disabled={busy}
              onClick={() => {
                setChallenge(null);
                setError("");
              }}
            >
              Usar outro e-mail
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
