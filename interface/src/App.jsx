import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Brain,
  CaretRight,
  CheckCircle,
  FilmSlate,
  GearSix,
  ListPlus,
  PlayCircle,
  SlidersHorizontal,
  WarningCircle,
} from "@phosphor-icons/react";

const navItems = [
  { id: "overview", label: "Visão geral", icon: Brain },
  { id: "create", label: "Nova produção", icon: ListPlus },
  { id: "settings", label: "Configurações", icon: GearSix },
];

const initialForm = {
  topic: "Why Your Brain Replays Embarrassing Memories",
  script:
    "You are trying to fall asleep when your brain suddenly replays something embarrassing you did years ago. The moment is over, the people involved probably forgot it, and yet the memory returns with surprising force. This is not your brain trying to punish you. Emotional events receive more attention, and attention gives memories more chances to be revisited. In the quiet of the night, fewer distractions leave more room for that internal review. Sometimes the brain is checking what happened so it can predict what might happen next. The useful question is not why you remembered it, but whether the memory is helping you learn or keeping you trapped in a loop.",
  terms: "person trying to sleep\nembarrassing memory\nperson thinking\nbrain scan\ncity at night",
  duration: "8–10 minutos",
  voice: "en-US-ChristopherNeural",
  footage: "Pexels + Pixabay",
  sections: "15 seções visuais",
};

function loadDraft() {
  try {
    const stored = window.localStorage.getItem("mindtrace:draft");
    if (!stored) return initialForm;
    const draft = { ...initialForm, ...JSON.parse(stored) };
    return {
      ...draft,
      voice: draft.voice === "en-US-GuyNeural" ? "en-US-ChristopherNeural" : draft.voice,
      duration: draft.duration === "8–10 minutes" ? "8–10 minutos" : draft.duration,
      sections: draft.sections === "15 visual sections" ? "15 seções visuais" : draft.sections,
      footage: draft.footage === "Pexels only" ? "Somente Pexels" : draft.footage === "Pixabay only" ? "Somente Pixabay" : draft.footage,
    };
  } catch {
    return initialForm;
  }
}

function App() {
  const [activeView, setActiveView] = useState("overview");
  const [form, setForm] = useState(loadDraft);
  const [notice, setNotice] = useState("");
  const [engineOnline, setEngineOnline] = useState(null);
  const [productionId, setProductionId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [job, setJob] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        setEngineOnline(response.ok && body.status === "online");
      })
      .catch(() => setEngineOnline(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!taskId) return undefined;
    let timer;
    let cancelled = false;
    const terminalStates = new Set(["success", "completed", "complete", "failed", "error"]);

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${taskId}`);
        const body = await response.json();
        if (cancelled) return;
        if (response.ok) {
          setJob({ taskId, state: body.state, progress: body.progress, data: body.data });
          if (!terminalStates.has(String(body.state).toLowerCase())) {
            timer = window.setTimeout(poll, 2000);
          }
        }
      } catch {
        if (!cancelled) timer = window.setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [taskId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveDraft = async (showNotice = true) => {
    window.localStorage.setItem(
      "mindtrace:draft",
      JSON.stringify({ ...form, savedAt: new Date().toISOString() }),
    );
    const payload = {
      ...form,
      video_terms: form.terms
        .split(/[\n,]/)
        .map((term) => term.trim())
        .filter(Boolean),
    };
    const response = await fetch("/api/productions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.detail || "Não foi possível salvar a produção");
    setProductionId(body.production_id);
    if (showNotice) setNotice(`Rascunho salvo: ${body.production_id}`);
    return body;
  };

  const queueRender = async () => {
    try {
      const draft = await saveDraft(false);
      const response = await fetch(`/api/productions/${draft.production_id}/render`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "O MPT recusou o render");
      setTaskId(body.mpt.task_id);
      setJob({ taskId: body.mpt.task_id, state: "queued", progress: 0 });
      setNotice(`Render enfileirado: ${body.mpt.task_id}`);
    } catch (error) {
      setNotice(`Render bloqueado: ${error.message}`);
    }
    setActiveView("overview");
  };

  return (
    <div className="min-h-screen bg-ink text-paper selection:bg-ember selection:text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1560px] grid-cols-1 lg:grid-cols-[230px_1fr]">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />

        <main className="min-w-0 border-l border-white/10">
        <Topbar activeView={activeView} engineOnline={engineOnline} />
          <div className="px-5 pb-12 pt-8 sm:px-8 lg:px-12 lg:pt-12">
            {notice && <Notice message={notice} onDismiss={() => setNotice("")} />}
            {job && <JobStrip job={job} />}
            {activeView === "overview" && (
              <Overview onCreate={() => setActiveView("create")} engineOnline={engineOnline} />
            )}
            {activeView === "create" && (
              <CreateView
                form={form}
                updateField={updateField}
                onSave={saveDraft}
                onRender={queueRender}
                productionId={productionId}
              />
            )}
            {activeView === "settings" && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="flex flex-col border-b border-white/10 px-5 py-6 lg:min-h-screen lg:border-b-0 lg:px-6 lg:py-8">
      <div className="flex items-center justify-between lg:block">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-ember/60 text-ember">
              <Brain size={19} weight="regular" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ember">
                estúdio local
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[0.22em]">MINDTRACE</p>
            </div>
          </div>
          <p className="mt-8 hidden max-w-[170px] text-xs leading-6 text-paper/45 lg:block">
            Uma máquina silenciosa para histórias sobre as coisas estranhas que sua mente faz.
          </p>
        </div>
        <div className="font-mono text-[10px] text-paper/35 lg:mt-12">v0.1 / offline primeiro</div>
      </div>

      <nav className="mt-8 grid grid-cols-3 gap-1 lg:mt-20 lg:block lg:space-y-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`group flex w-full items-center justify-center gap-3 border px-3 py-3 text-xs transition duration-300 active:scale-[0.98] lg:justify-start ${
                active
                  ? "border-ember/40 bg-ember/10 text-paper"
                  : "border-transparent text-paper/45 hover:border-white/10 hover:text-paper"
              }`}
            >
              <Icon size={17} weight={active ? "fill" : "regular"} />
              <span className="hidden sm:inline">{label}</span>
              {active && <CaretRight className="ml-auto hidden lg:block" size={14} />}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-white/10 pt-5 lg:block">
        <div className="flex items-center gap-2 text-xs text-paper/55">
          <span className="h-2 w-2 animate-pulse rounded-full bg-ember" />
          Espaço pronto
        </div>
        <p className="mt-2 font-mono text-[10px] text-paper/30">C:/.../AAA CANAL 1</p>
      </div>
    </aside>
  );
}

function Topbar({ activeView, engineOnline }) {
  const current = navItems.find((item) => item.id === activeView);
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8 lg:px-12">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/35">
        <span>Estúdio</span>
        <CaretRight size={12} />
        <span className="text-paper/70">{current?.label}</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px] text-paper/35">
        <span className="hidden sm:inline">Conexão do motor</span>
        <span className={`h-1.5 w-1.5 rounded-full ${engineOnline ? "bg-emerald-300" : "bg-amber-300"}`} />
        {engineOnline ? "online" : engineOnline === false ? "offline" : "verificando"}
      </div>
    </header>
  );
}

function Overview({ onCreate, engineOnline }) {
  return (
    <>
      <section className="grid gap-10 border-b border-white/10 pb-12 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Controle de produção / 001</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-[1.03] tracking-[-0.05em] text-paper sm:text-6xl">
            Torne impossível ignorar o lado invisível de ser humano.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-paper/55">
            O MINDTRACE transforma uma pergunta forte em um documentário em inglês, um plano
            visual e um caminho limpo para os cortes curtos.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button type="button" onClick={onCreate} className="button-primary">
              <PlayCircle size={18} weight="fill" />
              Criar uma produção
            </button>
            <button type="button" className="button-secondary">
              Ver o fluxo de trabalho
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        <EngineStatus online={engineOnline} />
      </section>

      <section className="grid gap-10 py-10 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-20">
        <div>
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <p className="eyebrow">Fila</p>
              <h2 className="mt-2 text-xl tracking-tight">Produções recentes</h2>
            </div>
            <span className="font-mono text-[10px] text-paper/35">0 ativas</span>
          </div>
          <EmptyQueue onCreate={onCreate} />
        </div>

        <div className="space-y-8">
          <Metric label="Duração do long-form" value="08–10 min" detail="16:9 / 1920×1080" />
          <Metric label="Ritmo visual" value="05 seg" detail="por clipe de stock" />
          <Metric label="Cortes derivados" value="03–05" detail="após aprovação do long-form" />
        </div>
      </section>
    </>
  );
}

function EngineStatus({ online }) {
  const title = online ? "API local conectada" : online === false ? "Motor não acessível" : "Verificando o motor local";
  const description = online
    ? "A API local do MPT respondeu pela ponte do MINDTRACE. A geração está liberada para o próximo teste curto."
    : "A interface está pronta. A conexão com a API/CLI do MoneyPrinterTurbo será ativada após a validação do ambiente e de um render curto.";
  return (
    <div className="border-t border-ember/50 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-ember">Ponte do motor</p>
          <h2 className="mt-3 text-2xl tracking-tight">{title}</h2>
        </div>
        <WarningCircle size={22} className="text-amber-300" />
      </div>
      <p className="mt-5 text-sm leading-6 text-paper/50">
        {description}
      </p>
      <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
        <StatusRow label="Código do MPT" value="extraído" good />
        <StatusRow label="API local" value={online ? "online" : online === false ? "offline" : "verificando"} good={online === true} />
        <StatusRow label="Ponte de renderização" value="pronta" good />
      </div>
    </div>
  );
}

function StatusRow({ label, value, good = false }) {
  return (
    <div className="flex items-center justify-between py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
      <span className="text-paper/40">{label}</span>
      <span className={good ? "flex items-center gap-2 text-emerald-300" : "text-amber-200"}>
        {good && <CheckCircle size={13} weight="fill" />}
        {value}
      </span>
    </div>
  );
}

function EmptyQueue({ onCreate }) {
  return (
    <div className="flex min-h-[240px] flex-col items-start justify-center border-b border-white/10 py-10">
      <FilmSlate size={34} weight="thin" className="text-paper/30" />
      <h3 className="mt-5 text-lg tracking-tight">Nenhuma produção entrou na fila.</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-paper/45">
        Comece com uma pergunta. O primeiro rascunho será a origem do vídeo longo, das seções
        visuais e dos Shorts futuros.
      </p>
      <button type="button" onClick={onCreate} className="mt-6 text-xs text-ember underline decoration-ember/40 underline-offset-4 transition hover:text-paper">
        Criar o primeiro rascunho
      </button>
    </div>
  );
}

function Metric({ label, value, detail }) {
  return (
    <div className="border-t border-white/10 pt-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl tracking-tight text-paper">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/35">{detail}</p>
    </div>
  );
}

function CreateView({ form, updateField, onSave, onRender, productionId }) {
  return (
    <section className="max-w-5xl">
      <div className="border-b border-white/10 pb-8">
        <p className="eyebrow">Nova produção / rascunho</p>
        <h1 className="mt-4 text-4xl tracking-[-0.04em] sm:text-5xl">Defina a pergunta primeiro.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-paper/50">
          Estes controles descrevem a intenção da produção. Eles serão traduzidos para um job do
          MPT depois que a ponte do motor passar pelo smoke test.
        </p>
      </div>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-20">
          <div className="space-y-8">
          <Field label="Tema de trabalho" helper="A pergunta que o documentário precisa responder.">
            <textarea value={form.topic} onChange={(event) => updateField("topic", event.target.value)} rows={3} className="input resize-none" />
          </Field>
          <Field label="Roteiro de narração em inglês" helper="Roteiro manual para o smoke test sem LLM e para o primeiro long-form aprovado.">
            <textarea value={form.script} onChange={(event) => updateField("script", event.target.value)} rows={8} className="input resize-none" />
          </Field>
          <Field label="Termos visuais de busca" helper="Um grupo de busca em inglês por linha; eles seguem a ordem narrativa.">
            <textarea value={form.terms} onChange={(event) => updateField("terms", event.target.value)} rows={5} className="input resize-none" />
          </Field>
          <div className="grid gap-8 sm:grid-cols-2">
            <Field label="Duração desejada" helper="Janela de duração do long-form.">
              <select value={form.duration} onChange={(event) => updateField("duration", event.target.value)} className="input">
                <option>8–10 minutos</option>
                <option>10–12 minutos</option>
              </select>
            </Field>
            <Field label="Plano visual" helper="Seções narrativas em ordem.">
              <select value={form.sections} onChange={(event) => updateField("sections", event.target.value)} className="input">
                <option>15 seções visuais</option>
                <option>12 seções visuais</option>
                <option>18 seções visuais</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <Field label="Voz da narração" helper="Voz em inglês fixa para manter a consistência do canal.">
              <select value={form.voice} onChange={(event) => updateField("voice", event.target.value)} className="input">
                <option value="en-US-ChristopherNeural">Christopher — documental, masculino</option>
                <option value="en-US-AndrewNeural">Andrew — grave, masculino</option>
                <option value="en-US-AriaNeural">Aria — clara, feminina</option>
                <option value="en-GB-RyanNeural">Ryan — britânica, masculina</option>
              </select>
            </Field>
            <Field label="Footage de stock" helper="Fontes de busca para o plano visual.">
              <select value={form.footage} onChange={(event) => updateField("footage", event.target.value)} className="input">
                <option>Pexels + Pixabay</option>
                <option>Somente Pexels</option>
                <option>Somente Pixabay</option>
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
            <span className="tag">16:9</span>
            <span className="tag">Sem legendas</span>
            <span className="tag">Clipes de 5 seg</span>
            <span className="tag">Ordem do roteiro</span>
          </div>
        </div>

        <aside className="border-t border-ember/50 pt-4 lg:border-t-0 lg:border-l lg:border-ember/50 lg:pl-6">
          <p className="eyebrow text-ember">Antes de gerar</p>
          <h2 className="mt-3 text-xl tracking-tight">Uma entrega limpa.</h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-paper/50">
            <li className="flex gap-3"><CheckCircle size={17} className="mt-1 shrink-0 text-emerald-300" />O rascunho continua editável.</li>
            <li className="flex gap-3"><CheckCircle size={17} className="mt-1 shrink-0 text-emerald-300" />O núcleo do MPT permanece intacto.</li>
            <li className="flex gap-3"><CheckCircle size={17} className="mt-1 shrink-0 text-emerald-300" />Os Shorts vêm depois da aprovação do long-form.</li>
          </ul>
          <div className="mt-8 space-y-3">
            <button type="button" onClick={() => onRender()} className="button-primary w-full justify-center">
              Enfileirar smoke test
              <PlayCircle size={16} weight="fill" />
            </button>
            <button type="button" onClick={() => onSave()} className="button-secondary w-full justify-center">
              Salvar rascunho local
              <ArrowUpRight size={16} />
            </button>
            {productionId && <p className="font-mono text-[10px] leading-5 text-paper/30">último rascunho: {productionId}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, helper, children }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-4 text-sm text-paper/80">
        {label}
        <SlidersHorizontal size={15} className="text-paper/25" />
      </span>
      <span className="mt-2 block text-xs text-paper/35">{helper}</span>
      <span className="mt-3 block">{children}</span>
    </label>
  );
}

function SettingsView() {
  return (
    <section className="max-w-4xl">
      <p className="eyebrow">Configurações do estúdio</p>
      <h1 className="mt-4 text-4xl tracking-[-0.04em] sm:text-5xl">As regras ficam visíveis.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-paper/50">
        O MINDTRACE mantém as decisões do canal na própria camada de configuração. Segredos e
        chaves de provedores ficam locais e nunca entram no bundle da interface.
      </p>
      <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
        <SettingRow label="Pasta do motor" value="engine/MoneyPrinterTurbo" />
        <SettingRow label="Perfil de render" value="1920×1080 / 2 threads / um vídeo" />
        <SettingRow label="Narração" value="Edge TTS / en-US-ChristopherNeural" />
        <SettingRow label="Política de footage" value="Pexels + Pixabay / ordem do roteiro" />
        <SettingRow label="Política de áudio" value="Música local licenciada / volume baixo" />
        <SettingRow label="Política de Shorts" value="Derivação separada após aprovação" />
      </div>
    </section>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[190px_1fr] sm:gap-8">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/35">{label}</span>
      <span className="text-sm text-paper/75">{value}</span>
    </div>
  );
}

function Notice({ message, onDismiss }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4 border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-100">
      <div className="flex items-start gap-3">
        <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
      <button type="button" onClick={onDismiss} className="text-xs text-emerald-100/60 hover:text-emerald-100">Fechar</button>
    </div>
  );
}

function JobStrip({ job }) {
  const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
  const state = String(job.state || "unknown").toLowerCase();
  const finished = ["success", "completed", "complete"].includes(state);
  const failed = ["failed", "error"].includes(state);
  return (
    <div className="mb-8 border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          {finished ? <CheckCircle size={18} weight="fill" className="text-emerald-300" /> : <PlayCircle size={18} className="animate-pulse text-ember" />}
          <span>{failed ? "Render falhou" : finished ? "Render concluído" : "Render em andamento"}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/35">{state} / {progress}%</span>
      </div>
      <div className="mt-3 h-1 bg-white/10">
        <div className={`h-1 transition-[width] duration-500 ${failed ? "bg-red-300" : "bg-ember"}`} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 font-mono text-[10px] text-paper/30">task: {job.taskId}</p>
    </div>
  );
}

export default App;
