/* Figuras do factsheet oficial do MapBiomas Solo col. 3 que o Explorador ainda não tem, como módulo encaixável.
   Cada aba de produto do Explorador "já é um factsheet": este módulo acrescenta, no fim de cada aba, só as figuras novas.

   Uso no Explorador:
     FabricaSolo.montarAba(el, { aba: "carbono" | "granulometria" | "textura" | "pedregosidade",
                                 recorte: () => ({ bioma: S.bioma, uf: S.uf }), dadosUrl: "dados_fabrica.json", logo: imgElement })  // Promise
     FabricaSolo.atualizar()   // depois de mudar o bioma ou o estado
     FabricaSolo.desmontar()   // ao sair da aba: destrói os gráficos e interrompe os mapas
   Página de teste: FabricaSolo.montar(el, opts) mostra as quatro abas em sequência.
   bioma = índice em dados.biomas como texto ("" = todos); uf = sigla ("" = todos).
   Requer Chart.js 4 e chartjs-plugin-datalabels (globais Chart e ChartDataLabels) e fabrica.css.
   Todo número é soma por região bioma × UF; as médias são Σ COS ÷ Σ área do recorte, nunca média de médias. */
window.FabricaSolo = (() => {
"use strict";
let D = null, EL = null, OPT = {}, carregando = null;
const S = { bioma: "", uf: "", aba: "todas", uso: "0", camGran: "0" };
const charts = {};
const CARTOES = {};
const PEND = [];
let FOLHA = 0; // folha do factsheet das figuras em construção
const root = document.documentElement;
const q = (id) => EL ? EL.querySelector("#" + id) : null;

// ---------- formatação pt-BR ----------
const nf = (d) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const f0 = nf(0), f1 = nf(1), f2 = nf(2);
const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function area(ha) { if (Math.abs(ha) >= 1e6) return [f1.format(ha / 1e6), "Mha"]; if (Math.abs(ha) >= 1e3) return [f1.format(ha / 1e3), "mil ha"]; return [f0.format(ha), "ha"]; }
const areaTxt = (ha) => area(ha).join(" ");
function massa(t) { if (Math.abs(t) >= 1e8) return [f2.format(t / 1e9), "Gt"]; if (Math.abs(t) >= 1e6) return [f1.format(t / 1e6), "Mt"]; return [f0.format(t / 1e3), "mil t"]; }
const massaTxt = (t) => massa(t).join(" ");
const pct = (x) => (isFinite(x) ? f1.format(x) : "—") + "%";
const soma = (a) => a.reduce((s, v) => s + (v || 0), 0);
const seguro = (v) => String(v || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60).toLowerCase();
function eixoArea(v) { const a = Math.abs(v); return a >= 1e6 ? f0.format(v / 1e6) + " Mha" : a >= 1e3 ? f0.format(v / 1e3) + " mil" : f0.format(v); }

// fontes: rótulo curto no cartão, texto completo no CSV e no rodapé do PNG
const FONTES = {
  "Planilha": "Planilha oficial 'estatisticas - MBSOLO3' (MapBiomas Solo col. 3, cobertura col. 10)",
  "GEE": "Cálculo no Google Earth Engine sobre os assets públicos do MapBiomas Solo col. 3 e da cobertura col. 10",
  "API MapBiomas": "API pública da Plataforma MapBiomas (plataforma.mapbiomas.org)",
};

// ---------- recorte ----------
function regioes(bioma, uf) {
  const out = new Set();
  D.regioes.forEach(([b, u], i) => { if (bioma !== "" && b !== +bioma) return; if (uf && u !== uf) return; out.add(i); });
  return out;
}
const clone = (v) => Array.isArray(v) ? v.map(clone) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v;
function add(a, b) {
  if (Array.isArray(a)) return a.map((x, i) => add(x, b ? b[i] : 0));
  if (a && typeof a === "object") { for (const k in b) a[k] = k in a ? add(a[k], b[k]) : clone(b[k]); return a; }
  return (a || 0) + (b || 0);
}
function somar(obj, rs) { let acc = null; for (const k in obj) { if (!rs.has(+k)) continue; acc = acc == null ? clone(obj[k]) : add(acc, obj[k]); } return acc; }
const filtrado = () => S.bioma !== "" || !!S.uf;
function nomeRecorte() {
  const b = S.bioma === "" ? "" : D.biomas[+S.bioma], u = S.uf ? D.ufs[S.uf] : "";
  return b && u ? `${b} · ${u}` : b || u || "Brasil";
}
const chaveAPI = () => S.bioma !== "" && S.uf ? `b${S.bioma}_${S.uf}` : S.bioma !== "" ? `b${S.bioma}` : S.uf ? `u${S.uf}` : "BR";

// ---------- cartões ----------
const tagFolha = () => `<span class="fs-folha-tag">Folha ${FOLHA} do factsheet</span>`;
const src = (t) => `<span class="fs-src" title="${esc(FONTES[t] || t)}">${t}</span>`;
const tile = (label, valor, nota, cor) => `<div class="fs-card fs-tile" style="${cor ? `--c:${cor}` : ""}"><div class="fs-label">${label}</div><div class="fs-value">${valor}</div><div class="fs-tnote">${nota || "&nbsp;"}</div></div>`;
const kpis = (html, fonte) => `<div class="fs-kpis-wrap">${tagFolha()}${fonte ? src(fonte) : ""}<div class="fs-kpis">${html}</div></div>`;
function botoesDL(id, tipo) {
  return tipo === "mapa"
    ? `<div class="fs-dl dl"><button type="button" data-acao="thumb" data-id="${id}" title="Baixar a thumbnail do mapa em PNG">PNG</button></div>`
    : `<div class="fs-dl dl"><button type="button" data-acao="png" data-id="${id}" title="Baixar o gráfico em PNG">PNG</button><button type="button" data-acao="csv" data-id="${id}" title="Baixar os dados do gráfico em CSV">CSV</button></div>`;
}
/* o: { titulo, sub, total, fonte ("Planilha" | "GEE" | "API MapBiomas"), unidade, metodo, csv() -> [cabeçalho, ...linhas], cfg, alt } */
function cGrafico(id, o) {
  CARTOES[id] = { tipo: "grafico", folha: FOLHA, titulo: o.titulo, total: o.total || "", csv: o.csv, fonte: o.fonte, unidade: o.unidade, metodo: o.metodo };
  PEND.push([id, o.cfg]);
  return `<div class="fs-card"><div class="fs-card-head"><div>${tagFolha()}<h3>${o.titulo}${o.fonte ? src(o.fonte) : ""}</h3>${o.sub ? `<p class="fs-sub">${o.sub}</p>` : ""}${o.total ? `<p class="fs-total">${o.total}</p>` : ""}</div>${botoesDL(id, "grafico")}</div>
    <div class="fs-chart ${o.alt || ""}"><canvas id="fs-cv-${id}" role="img" aria-label="${esc(o.titulo)}"></canvas></div></div>`;
}
function cMapa(id, spec) {
  CARTOES[id] = { tipo: "mapa", folha: FOLHA, titulo: spec.titulo, spec };
  return `<div class="fs-card"><div class="fs-card-head"><div>${tagFolha()}<h3>${spec.titulo}${src("API MapBiomas")}</h3>${spec.sub ? `<p class="fs-sub">${spec.sub}</p>` : ""}</div>${botoesDL(id, "mapa")}</div>
    <figure class="fs-mapa" id="fs-mp-${id}"><div class="fs-ph">Preparando o mapa…</div></figure></div>`;
}
const seg = (id, ops, atual) => `<div class="fs-seg" role="group" id="${id}">` + ops.map(([v, r]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(atual)}">${r}</button>`).join("") + `</div>`;

// ---------- gráficos: barras simples (agrupadas quando há duas séries), rótulo em cada barra ----------
const refLinha = {
  id: "refLinha",
  afterDatasetsDraw(ch, _a, op) {
    if (!op || op.v == null) return;
    const { ctx, chartArea: a, scales: { y } } = ch, yy = y.getPixelForValue(op.v);
    ctx.save(); ctx.strokeStyle = op.cor; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(a.left, yy); ctx.lineTo(a.right, yy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = op.cor; ctx.font = `600 11px ${css("--body")}`; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText(op.txt, a.right - 4, yy - 4); ctx.restore();
  },
};
function niceMax(v) { if (!(v > 0)) return 1; const e = 10 ** Math.floor(Math.log10(v)), m = v / e; return (m <= 1 ? 1 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 3 ? 3 : m <= 4 ? 4 : m <= 5 ? 5 : m <= 6 ? 6 : m <= 8 ? 8 : 10) * e; }
function desenhar(id, cfg) {
  if (charts[id]) charts[id].destroy();
  const el = q("fs-cv-" + id); if (!el) return;
  Chart.defaults.font.family = css("--body");
  Chart.defaults.color = css("--ink-2");
  const hz = !!cfg.hz, multi = cfg.series.length > 1;
  const max = Math.max(0, ...cfg.series.flatMap((s) => s.dados.filter((v) => v != null)), cfg.ref ? cfg.ref.v : 0);
  const eixo = (o) => Object.assign({ grid: { color: css("--grid") }, border: { color: css("--axis") }, ticks: { color: css("--muted") } }, o);
  const vals = { beginAtZero: true, max: niceMax(max * (cfg.folga || (hz ? 1.45 : 1.2))), ticks: { color: css("--muted"), callback: cfg.tick || ((v) => f0.format(v)) } };
  const cats = { grid: { display: false }, ticks: { color: css("--ink-2"), autoSkip: false, font: { size: 11 }, maxRotation: hz ? 0 : 40 } };
  charts[id] = new Chart(el, {
    type: "bar",
    plugins: [ChartDataLabels, refLinha],
    data: { labels: cfg.labels, datasets: cfg.series.map((s) => ({ label: s.nome, data: s.dados, backgroundColor: s.cores || s.cor, borderColor: css("--seam"), borderWidth: 1, borderRadius: 3, maxBarThickness: 48 })) },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, indexAxis: hz ? "y" : "x",
      layout: { padding: hz ? { right: 6 } : { top: 6 } },
      plugins: {
        legend: { display: multi, position: "top", align: "start", labels: { color: css("--ink-2"), boxWidth: 12, boxHeight: 12, font: { size: 11, weight: 600 } } },
        tooltip: { backgroundColor: css("--surface"), titleColor: css("--ink"), bodyColor: css("--ink-2"), borderColor: css("--axis"), borderWidth: 1, padding: 10,
          callbacks: { label: (c) => `${multi ? c.dataset.label + ": " : ""}${(cfg.tip || cfg.rot)(c.raw, c.dataIndex, c.datasetIndex)}` } },
        datalabels: {
          anchor: "end", align: "end", offset: 2, clamp: true, clip: false,
          rotation: !hz && (multi ? cfg.labels.length * 2 : cfg.labels.length) > 12 ? -90 : 0,
          color: css("--ink"), font: { size: 10.5, weight: 600 },
          formatter: (v, ctx) => v == null || v === 0 ? "" : cfg.rot(v, ctx.dataIndex, ctx.datasetIndex),
        },
        refLinha: cfg.ref ? { v: cfg.ref.v, txt: cfg.ref.txt, cor: css("--ink-2") } : null,
      },
      scales: hz ? { x: eixo(vals), y: eixo(cats) } : { x: eixo(cats), y: eixo(vals) },
    },
  });
}
function desenharGraficos() { PEND.forEach(([id, cfg]) => desenhar(id, cfg)); }

// ---------- paletas ----------
const TEX_ORD = ["Arenosa", "Argilosa", "Média", "Muito Argilosa", "Siltosa"];
const texIdx = (n) => D.texturas.findIndex((t) => t.nome === n);
const texCor = (n) => D.texturas[texIdx(n)].cor;
const USOS = [["Pastagem", "#edde8e"], ["Agricultura", "#c27ba0"], ["Silvicultura", "#7a5900"], ["Mosaico de Usos", "#ffefc3"]];
const FX10 = ["0–10 cm", "10–20 cm", "20–30 cm", "30–40 cm", "40–50 cm", "50–60 cm", "60–70 cm", "70–80 cm", "80–90 cm", "> 90 cm"];
const fx10 = (a) => [...a.slice(0, 9), (a[9] || 0) + (a[10] || 0)];
const FRAC = [["areia", 3, "Areia", "#d67258", "0,05–2 mm", "soil_sand_fraction"], ["silte", 2, "Silte", "#6a8e74", "0,002–0,05 mm", "soil_silt_fraction"], ["argila", 1, "Argila", "#8c3306", "< 0,002 mm", "soil_clay_fraction"]];
const D10 = ["000_010", "010_020", "020_030", "030_040", "040_050", "050_060", "060_070", "070_080", "080_090", "090_100"];
const NAO_VEG = ["Praia, Duna e Areal", "Área Urbanizada", "Mineração", "Usina Fotovoltaica (beta)", "Outras Áreas não Vegetadas"];
function grupoUso(c) {
  const n = c.nome;
  if (n === "Não observado") return null;
  if (["Pastagem", "Agricultura", "Silvicultura", "Mosaico de Usos"].includes(n)) return n;
  if (NAO_VEG.includes(n)) return "Área não Vegetada";
  if (c.grupo === "Água") return "Água";
  return "Vegetação Nativa";
}
const USO10 = [["Vegetação Nativa", "#1f8d49"], ["Pastagem", "#edde8e"], ["Agricultura", "#c27ba0"], ["Mosaico de Usos", "#ffefc3"], ["Silvicultura", "#7a5900"], ["Área não Vegetada", "#d4271e"], ["Água", "#2532e4"]];

// =====================================================================
// Figuras por folha do factsheet (só as que o Explorador ainda não tem)
// =====================================================================
// Folha 6 · pedregosidade: destaques e mapas (as áreas por faixa já estão no Explorador)
function f6(rs) {
  FOLHA = 6;
  let tiles = "", mapas = "";
  for (const [tipo, nome, vol, lim] of [["dominante", "pedregosidade dominante", "50", ">50% do volume"], ["extrema", "pedregosidade extrema", "90", ">90% do volume"]]) {
    const p = somar(D.ped[tipo], rs) || D.pedregosidade_faixas.map(() => [0, 0]);
    const a = fx10(p.map((x) => x[0])), tot = soma(a), ate90 = soma(a.slice(0, 9));
    tiles += tipo === "dominante"
      ? tile("Pedregosidade dominante de 0 a 90 cm", pct(100 * ate90 / tot), `${areaTxt(ate90)} do recorte`, "#c51b8a")
      : tile("Livre de pedregosidade extrema até 90 cm", pct(100 * a[9] / tot), `${areaTxt(a[9])} com pelo menos 90 cm de solo livre`, "#e08a1e");
    mapas += cMapa("m" + vol, { titulo: `Profundidade até a ${nome} (${lim})`, sub: "Estimativas censuradas em 100 cm", k: "soil_stoniness", prm: { volume: vol } });
  }
  return kpis(tiles, "Planilha") + `<div class="fs-grid fs-g2">${mapas}</div>`;
}

// Folha 7 · pedregosidade dominante × agropecuária, 1985–2024
function f7(rs) {
  FOLHA = 7;
  const P = somar(D.pa, rs);
  if (!P) return `<p class="fs-note">${tagFolha()} O cruzamento da pedregosidade com a cobertura (pastagem, agricultura, silvicultura e mosaico, de 1985 a 2024) ainda está sendo calculado no Google Earth Engine.</p>`;
  const u = +S.uso, anos = D.agro_anos;
  const valor = (ai, f, k) => {
    const cel = f < 9 ? P[ai][f] : P[ai][9].map((x, j) => x + P[ai][10][j]);
    return k === 4 ? soma(cel) : cel[k];
  };
  const nomeUso = u === 4 ? "Agropecuária (soma dos quatro usos)" : USOS[u][0], cor = u === 4 ? css("--accent") : USOS[u][1];
  let graf = "";
  FX10.forEach((fx, f) => {
    const dados = anos.map((_, ai) => valor(ai, f, u)), v85 = dados[0], v24 = dados[dados.length - 1];
    const dif = v85 ? 100 * (v24 - v85) / v85 : null;
    graf += cGrafico(`pa-${f}`, {
      titulo: `Agropecuária com pedregosidade dominante a ${fx}`, fonte: "GEE", unidade: "ha",
      metodo: `Área (Σ das regiões bioma × UF do recorte) de cada uso da cobertura col. 10 sobre pixels em que a pedregosidade dominante (> 50% do volume) começa na faixa ${fx}; escala de ${(D.agro_info || {}).escala_m || 30} m`,
      total: `${nomeUso} em 2024: <b>${areaTxt(v24)}</b>${dif == null ? "" : ` · ${dif >= 0 ? "+" : "−"}${f1.format(Math.abs(dif))}% desde 1985`}`,
      csv: () => [["ano", ...USOS.map((x) => x[0] + "_ha"), "agropecuaria_total_ha"], ...anos.map((a, ai) => [a, ...USOS.map((_, k) => valor(ai, f, k)), valor(ai, f, 4)])],
      alt: "s",
      cfg: { labels: anos.map(String), series: [{ nome: nomeUso, dados, cor }], rot: (v) => areaTxt(v), tick: eixoArea },
    });
  });
  return `<div class="fs-ctrl"><span class="fs-flabel">Uso mostrado nos gráficos</span>${seg("fs-s-uso", [...USOS.map((x, i) => [String(i), x[0]]), ["4", "Agropecuária (soma)"]], S.uso)}<span>O CSV de cada gráfico traz os quatro usos.</span></div>
    <div class="fs-grid fs-gm5">${graf}</div>`;
}

// Folha 8 · granulometria: teores de 0–30 cm e mapas (o teor médio por camada já está no Explorador)
function f8(rs) {
  FOLHA = 8;
  const G = somar(D.gran, rs);
  if (!G) return "";
  const teor = (fi, cams) => { const a = soma(cams.map((c) => G[c][0])); return a ? soma(cams.map((c) => G[c][fi])) / a : null; };
  const c = +S.camGran, camNome = D.camadas_gran[c];
  let tiles = "", mapas = "";
  for (const [k, fi, nome, cor, faixa, sub] of FRAC) {
    tiles += tile(`Teor médio de ${nome.toLowerCase()} · 0–30 cm`, `${f1.format(teor(fi, [0, 1, 2]))}<small>%</small>`, `${faixa} · média ponderada pela área`, cor);
    mapas += cMapa("g-" + k, { titulo: `Teor de ${nome.toLowerCase()} do solo`, sub: `Camada ${camNome} · ${faixa}`, k: sub, prm: { depth: D10[c] } });
  }
  return kpis(tiles, "GEE") +
    `<div class="fs-ctrl"><span class="fs-flabel">Camada dos mapas</span>${seg("fs-s-cam", D.camadas_gran.map((n, i) => [String(i), n.replace(" cm", "")]), S.camGran)}<span>O factsheet mostra 0–30 cm; a Plataforma só serve camadas de 10 cm.</span></div>
     <div class="fs-grid fs-g3">${mapas}</div>`;
}

// Folha 9 · textura 0–30 cm: destaques, mapa e proporção por bioma
function areasTex(rs) { const T = somar(D.tex24, rs) || D.texturas.map(() => [0, 0]); return { T, a: TEX_ORD.map((n) => T[texIdx(n)][0]) }; }
function f9(rs) {
  FOLHA = 9;
  const { T, a } = areasTex(rs), base = soma(a);
  const fora = T[texIdx("Fragmentos de Rocha")][0] + T[texIdx("Não Observado")][0];
  const iM = TEX_ORD.indexOf("Média");
  const raras = soma(["Arenosa", "Siltosa", "Muito Argilosa"].map((n) => a[TEX_ORD.indexOf(n)]));
  const tiles = tile("Mapeado com textura média", pct(100 * a[iM] / base), areaTxt(a[iM]), texCor("Média")) +
    tile("Arenosa, siltosa e muito argilosa", pct(100 * raras / base), `${areaTxt(raras)} somadas`, texCor("Muito Argilosa")) +
    tile("Área com textura mapeada", `${area(base)[0]}<small>${area(base)[1]}</small>`, `fora: ${areaTxt(fora)} (fragmentos de rocha e não observado)`);
  const grupos = filtrado() ? [[nomeRecorte(), rs]] : D.biomas.map((b, i) => [b, regioes(String(i), "")]);
  let mult = "";
  grupos.forEach(([nome, r], gi) => {
    const x = areasTex(r).a, bt = soma(x), p = x.map((v) => bt ? 100 * v / bt : 0);
    mult += cGrafico("tex-b" + gi, {
      titulo: `Proporção dos grupos texturais · ${esc(nome)}`, fonte: "Planilha", unidade: "% da área com textura mapeada (0–30 cm)",
      metodo: "Área do grupo ÷ área com textura mapeada (exclui fragmentos de rocha e não observado), 2024",
      total: `Textura mapeada: <b>${areaTxt(bt)}</b>`, alt: "s",
      csv: () => [["grupo textural", "area_ha", "percentual"], ...TEX_ORD.map((n, i) => [n, x[i], p[i]]), ["total", bt, 100]],
      cfg: { labels: TEX_ORD, series: [{ nome: "Proporção", dados: p, cores: TEX_ORD.map(texCor) }], rot: (v) => `${f1.format(v)}%`, tip: (v, i) => `${f1.format(v)}% · ${areaTxt(x[i])}`, tick: (v) => f0.format(v) + "%" },
    });
  });
  return kpis(tiles, "Planilha") +
    `<div class="fs-grid fs-g2">${cMapa("tex030", { titulo: "Grupo textural · 0–30 cm", k: "soil_textural_group", prm: { depth: "000_030" } })}<div class="fs-grid">${filtrado() ? mult : ""}</div></div>
     ${filtrado() ? "" : `<div class="fs-grid fs-gm">${mult}</div>`}`;
}

// Folha 10 · cobertura e uso por grupo textural, 1985 e 2024
function f10(rs) {
  FOLHA = 10;
  const TC = somar(D.texcob, rs) || {};
  const por = {};
  for (const k in TC) {
    const [t, c] = k.split("|").map(Number), g = grupoUso(D.cobertura[c]); if (!g) continue;
    const n = D.texturas[t].nome; if (!TEX_ORD.includes(n)) continue;
    const o = (por[n] ||= {}), w = (o[g] ||= [0, 0]); w[0] += TC[k][0]; w[1] += TC[k][1];
  }
  const cards = [];
  ["Muito Argilosa", "Argilosa", "Média", "Arenosa", "Siltosa"].forEach((n, ti) => {
    const o = por[n] || {}, t85 = soma(USO10.map(([g]) => (o[g] || [0, 0])[0])), t24 = soma(USO10.map(([g]) => (o[g] || [0, 0])[1]));
    if (!t24 && !t85) return;
    const usos = USO10.filter(([g]) => o[g] && (o[g][0] || o[g][1]));
    const p85 = usos.map(([g]) => t85 ? 100 * o[g][0] / t85 : 0), p24 = usos.map(([g]) => t24 ? 100 * o[g][1] / t24 : 0);
    cards.push(cGrafico("ct-" + ti, {
      titulo: `Cobertura e uso na textura ${n.toLowerCase()} · 1985 e 2024`, fonte: "Planilha", unidade: "% da área do grupo textural (0–30 cm)",
      metodo: "Área de cada classe de cobertura col. 10 ÷ área total do grupo textural no ano (exclui não observado); vegetação nativa = classes naturais, exceto praia, duna e areal",
      total: `Área da textura: <b>${areaTxt(t85)}</b> em 1985 · <b>${areaTxt(t24)}</b> em 2024`,
      csv: () => [["cobertura e uso", "area_1985_ha", "area_2024_ha", "pct_1985", "pct_2024"], ...usos.map(([g], i) => [g, o[g][0], o[g][1], p85[i], p24[i]]), ["total", t85, t24, 100, 100]],
      cfg: { labels: usos.map(([g]) => g), series: [{ nome: "1985", dados: p85, cor: css("--fs-y85") || "#b9a68a" }, { nome: "2024", dados: p24, cor: usos.map(([, c]) => c) }],
        rot: (v) => f0.format(v) + "%", tip: (v, i, s) => `${f1.format(v)}% · ${areaTxt(o[usos[i][0]][s])}`, tick: (v) => f0.format(v) + "%" },
    }));
  });
  return `<div class="fs-grid fs-g2">${cMapa("cob", { titulo: "Cobertura e uso da terra · 2024", sub: "A Plataforma serve hoje a Coleção 11; o factsheet usa a Coleção 10", k: "coverage_coverage-30m-droufo", legendId: "5837836a-c21c-4109-b3ef-5d8eb4ac1dc7", prm: { year: "2024" } })}
     ${cards[0] || ""}</div>
     <div class="fs-grid fs-gm">${cards.slice(1).join("")}</div>`;
}

// Folha 11 · mapas do grupo textural em três camadas (as áreas por camada já estão no Explorador)
function f11() {
  FOLHA = 11;
  const dep = [["000_030", "0–30 cm"], ["030_060", "30–60 cm"], ["060_100", "60–100 cm"]];
  return `<div class="fs-grid fs-g3">${dep.map(([d, n], ci) => cMapa("cam" + ci, { titulo: `Grupo textural · ${n}`, k: "soil_textural_group", prm: { depth: d } })).join("")}</div>`;
}

// Folha 12 · COS 2024: destaques e mapa (faixas de estoque e COS por cobertura já estão no Explorador)
function f12(rs) {
  FOLHA = 12;
  const CB = somar(D.cob24, rs) || D.cobertura.map(() => [0, 0]);
  const a = soma(CB.map((x) => x[0])), c = soma(CB.map((x) => x[1]));
  const porNome = (n) => CB[D.cobertura.findIndex((x) => x.nome === n)] || [0, 0];
  const ff = porNome("Formação Florestal")[1], ag = porNome("Agricultura")[1];
  let faixa = "";
  const fx = D.cosfx_fonte && D.cosfx_fonte.tipo === "gee" ? somar(D.cosfx, rs) : D.cosfx[chaveAPI()];
  if (fx) {
    const bins = [fx[0] + fx[1], ...fx.slice(2)], bt = soma(bins), im = bins.indexOf(Math.max(...bins));
    const BN = ["menos de 20", "20 e 30", "30 e 40", "40 e 50", "50 e 60", "60 e 70", "70 e 80", "mais de 80"];
    faixa = tile(`Estoca entre ${BN[im]} t/ha`, pct(100 * bins[im] / bt), `${areaTxt(bins[im])}, a faixa com mais área`, D.cos_faixas[im + 1].cor);
  }
  const tiles = tile("Massa de COS · 2024", `${massa(c)[0]}<small>${massa(c)[1]}</small>`, `estoque médio de ${f1.format(c / a)} t/ha`) +
    tile("Massa em formação florestal", `${massa(ff)[0]}<small>${massa(ff)[1]}</small>`, pct(100 * ff / c) + " do COS do recorte", "#1f8d49") +
    tile("Massa na agricultura", `${massa(ag)[0]}<small>${massa(ag)[1]}</small>`, pct(100 * ag / c) + " do COS do recorte", "#c27ba0") + faixa;
  return kpis(tiles, "Planilha") +
    `<div class="fs-grid fs-g2">${cMapa("cos12", { titulo: "Estoque de COS · 2024", sub: "t/ha, 0–30 cm", k: "soil_soil_organic_carbon_stock", prm: { year: "2024" } })}<div class="fs-grid">${f13(rs)}</div></div>`;
}

// Folha 13 · COS por bioma, com a linha do Brasil
function f13(rs) {
  FOLHA = 13;
  const CBr = somar(D.cob24, regioes("", "")), br = { a: soma(CBr.map((x) => x[0])), c: soma(CBr.map((x) => x[1])) }, refBR = br.c / br.a;
  const grupos = filtrado() ? [[nomeRecorte(), rs]] : D.biomas.map((b, i) => [b, regioes(String(i), "")]);
  const v = grupos.map(([n, r]) => { const CB = somar(D.cob24, r) || []; return { n, a: soma(CB.map((x) => x[0])), c: soma(CB.map((x) => x[1])) }; });
  const ct = soma(v.map((x) => x.c)), onde = filtrado() ? "no recorte" : "nos biomas";
  return cGrafico("bio-gt", {
    titulo: `Massa de COS ${onde} · 2024`, fonte: "Planilha", unidade: "Gt (bilhões de toneladas), 0–30 cm",
    metodo: "Σ COS das regiões bioma × UF de cada bioma, 2024",
    total: `Total: <b>${massaTxt(ct)}</b>`,
    csv: () => [["recorte", "cos_t", "area_ha", "pct_da_massa"], ...v.map((x) => [x.n, x.c, x.a, 100 * x.c / ct])],
    cfg: { labels: v.map((x) => x.n), hz: true, series: [{ nome: "Massa", dados: v.map((x) => x.c / 1e9), cor: css("--accent") }], rot: (x) => `${f2.format(x)} Gt · ${pct(100 * x * 1e9 / ct)}`, tick: (x) => f0.format(x) },
  }) + cGrafico("bio-tha", {
    titulo: `Estoque médio de COS ${onde} · 2024`, fonte: "Planilha", unidade: "t/ha, 0–30 cm",
    metodo: "Σ COS ÷ Σ área de cada bioma (média ponderada pela área); linha tracejada = Brasil",
    total: `Estoque do Brasil: <b>${f1.format(refBR)} t/ha</b> (linha tracejada)`,
    csv: () => [["recorte", "estoque_medio_t_ha", "cos_t", "area_ha"], ...v.map((x) => [x.n, x.c / x.a, x.c, x.a]), ["Brasil", refBR, br.c, br.a]],
    cfg: { labels: v.map((x) => x.n), series: [{ nome: "Estoque", dados: v.map((x) => x.c / x.a), cor: "#e8761f" }], rot: (x) => f1.format(x), tick: (x) => f0.format(x), ref: { v: refBR, txt: `Brasil: ${f1.format(refBR)} t/ha` }, folga: 1.18 },
  });
}

// Folha 14 · estoque de COS por grupo textural, no Brasil e em cada bioma
function f14(rs) {
  FOLHA = 14;
  const grupos = filtrado() ? [[nomeRecorte(), rs]] : [["Brasil", regioes("", "")], ...D.biomas.map((b, i) => [b, regioes(String(i), "")])];
  let graf = "";
  grupos.forEach(([n, r], gi) => {
    const T = somar(D.tex24, r) || D.texturas.map(() => [0, 0]);
    const lin = TEX_ORD.map((t) => ({ t, a: T[texIdx(t)][0], c: T[texIdx(t)][1] })).filter((x) => x.a > 0 && x.c > 0);
    const at = soma(lin.map((x) => x.a)), ctot = soma(lin.map((x) => x.c));
    graf += cGrafico("ct14-" + gi, {
      titulo: `Estoque de COS por textura · ${esc(n)}`, fonte: "Planilha", unidade: "t/ha, 0–30 cm",
      metodo: "Σ COS ÷ Σ área de cada grupo textural (0–30 cm), 2024",
      total: `Média do recorte: <b>${f1.format(ctot / at)} t/ha</b>`, alt: "s",
      csv: () => [["grupo textural", "estoque_medio_t_ha", "cos_t", "area_ha"], ...lin.map((x) => [x.t, x.c / x.a, x.c, x.a]), ["total", ctot / at, ctot, at]],
      cfg: { labels: lin.map((x) => x.t), series: [{ nome: "Estoque", dados: lin.map((x) => x.c / x.a), cores: lin.map((x) => texCor(x.t)) }], rot: (v) => f1.format(v), tip: (v, i) => `${f1.format(v)} t/ha · ${areaTxt(lin[i].a)}`, tick: (v) => f0.format(v) },
    });
  });
  return `<div class="fs-grid fs-gm">${graf}</div>`;
}

const ABAS = {
  carbono: ["Carbono orgânico", (rs) => f12(rs)],
  granulometria: ["Granulometria", (rs) => f8(rs)],
  textura: ["Textura", (rs) => f9(rs) + f10(rs) + f11() + f14(rs)],
  pedregosidade: ["Pedregosidade", (rs) => f6(rs) + f7(rs)],
};

// =====================================================================
// Render
// =====================================================================
let geracao = 0;
function limpar() {
  Object.keys(charts).forEach((k) => { charts[k].destroy(); delete charts[k]; });
  Object.keys(CARTOES).forEach((k) => delete CARTOES[k]);
  PEND.length = 0;
}
function render() {
  if (!D || !EL || !EL.isConnected) return;
  geracao++;
  limpar();
  const r = OPT.recorte ? OPT.recorte() : {};
  S.bioma = r.bioma == null ? "" : String(r.bioma); S.uf = r.uf || "";
  const rs = regioes(S.bioma, S.uf);
  const html = S.aba === "todas"
    ? Object.entries(ABAS).map(([k, [nome, fn]]) => `<section class="fs-aba" id="fs-aba-${k}"><h2 class="fs-aba-tit">${nome}</h2>${fn(rs)}</section>`).join("")
    : (ABAS[S.aba] ? ABAS[S.aba][1](rs) : `<p class="fs-note">Aba desconhecida: ${esc(S.aba)}</p>`);
  EL.innerHTML = `<div class="fs-root">${html}</div>`;
  EL.querySelector(".fs-root").addEventListener("click", aoClicar);
  desenharGraficos();
  ligarSeg("fs-s-uso", "uso"); ligarSeg("fs-s-cam", "camGran");
  carregarMapas(geracao);
}
function ligarSeg(id, chave) {
  const el = q(id); if (!el) return;
  el.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S[chave] = b.dataset.v; const y = window.scrollY; render(); window.scrollTo(0, y); });
}

// =====================================================================
// Mapas pela API da Plataforma MapBiomas
// =====================================================================
const API = "https://plataforma.mapbiomas.org/api/v1/brazil";
let apiFora = false;
const cache = new Map();
const cached = (k, f) => { if (!cache.has(k)) cache.set(k, f().catch((e) => { cache.delete(k); throw e; })); return cache.get(k); };
async function apiGet(path, qs = {}) {
  const u = new URL(API + path);
  Object.entries({ tenantId: "mapbiomas", ...qs }).forEach(([k, v]) => (Array.isArray(v) ? v : [v]).forEach((x) => u.searchParams.append(k, x)));
  let r;
  try { r = await fetch(u); } catch (e) { apiFora = true; throw e; }
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${path}`);
  return r.json();
}
const pt = (n) => typeof n === "string" ? n : n?.["pt-BR"] || n?.["en-US"] || "";
const norm = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
async function territorio() {
  const cat = (id) => cached("cat" + id, () => apiGet("/territories", { page: 1, pageSize: 100, categoryId: id }).then((r) => r.territories || []));
  if (!filtrado()) return { ids: [(await cat(213))[0].id], metodo: "union" };
  const ids = [];
  if (S.uf) { const t = (await cat(214)).find((x) => norm(pt(x.name)) === norm(D.ufs[S.uf])); if (!t) throw new Error("estado não encontrado na API"); ids.push(t.id); }
  if (S.bioma !== "") { const t = (await cat(4)).find((x) => norm(pt(x.name)) === norm(D.biomas[+S.bioma])); if (!t) throw new Error("bioma não encontrado na API"); ids.push(t.id); }
  return { ids, metodo: ids.length > 1 ? "intersection" : "union" };
}
function folhasLeg(items) { return items.flatMap((i) => i.children && i.children.length ? folhasLeg(i.children) : [i]); }
async function legenda(spec) {
  let lg;
  if (spec.legendId) lg = (await cached("leg:" + spec.legendId, () => apiGet("/legends/" + spec.legendId))).legend;
  else {
    const l = await cached("legs:" + spec.k, () => apiGet("/legends", { page: 1, pageSize: 100, subthemeKey: spec.k }));
    lg = (await cached("leg:" + l.legends[0].id, () => apiGet("/legends/" + l.legends[0].id))).legend;
  }
  const fl = folhasLeg(lg.items);
  const itens = spec.legendId ? USO10.map(([nome, cor]) => ({ nome, cor })) : fl.map((i) => ({ nome: pt(i.name), cor: i.color }));
  return { key: lg.key, valores: fl.map((i) => i.pixelValue), itens };
}
const lonX = (lon) => (lon + 180) / 360;
const latY = (lat) => { const r = Math.max(-85, Math.min(85, lat)) * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2; };
function aneis(g) {
  if (!g) return [];
  if (g.type === "Feature") return aneis(g.geometry);
  if (g.type === "FeatureCollection") return g.features.flatMap((f) => aneis(f.geometry));
  if (g.type === "GeometryCollection") return g.geometries.flatMap(aneis);
  if (g.type === "Polygon") return g.coordinates;
  if (g.type === "MultiPolygon") return g.coordinates.flat();
  return [];
}
async function imagem(url) { try { const r = await fetch(url, { mode: "cors" }); if (!r.ok) return null; return await createImageBitmap(await r.blob()); } catch { return null; } }
async function mapLimit(itens, lim, fn) {
  const out = new Array(itens.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(lim, itens.length) }, async () => { while (i < itens.length) { const k = i++; out[k] = await fn(itens[k], k); } }));
  return out;
}
const nomeLeg = (t) => t.replace(/^O limiar de volume \(50% ou 90%\) de fragmentos grossos é atingido /, "").replace(/^O limiar.*não é atingido.*$/, "não atingido até 100 cm").replace(/^entre (\d+) e (\d+)/, "$1–$2");
async function desenharMapa(spec, rec) {
  const T = await territorio();
  const [leg, geo] = await Promise.all([legenda(spec), cached("geo:" + rec, () => apiGet("/territories/geometry", { territoryId: T.ids, spatialMethod: T.metodo, simplify: "true" }))]);
  const an = aneis(geo.geometry || geo);
  if (!an.length) throw new Error("sem contorno");
  const r = await apiGet("/maps/map", { region: "brazil", subthemeKey: spec.k, legendKey: leg.key, pixelValue: leg.valores, territoryId: T.ids, spatialMethod: T.metodo, ...spec.prm });
  const W = 900, pad = 24, header = 74;
  const med = document.createElement("canvas").getContext("2d");
  med.font = `500 13px "Source Sans 3", sans-serif`;
  const sw = 13, altL = 22;
  let lx = pad, linha = 0;
  const pos = leg.itens.map((it) => { const w = sw + 6 + med.measureText(nomeLeg(it.nome)).width; if (lx + w > W - pad && lx > pad) { lx = pad; linha++; } const o = { it, x: lx, linha }; lx += w + 16; return o; });
  const footer = 16 + (linha + 1) * altL + 28;
  let x1 = 1, x2 = 0, y1 = 1, y2 = 0;
  for (const a of an) for (const [lon, lat] of a) { const x = lonX(lon), y = latY(lat); x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); }
  const dx = (x2 - x1) * 1.08 || 1e-4, dy = (y2 - y1) * 1.08 || 1e-4, MW = W - 2 * pad;
  const MH = Math.round(Math.min(MW * 1.2, Math.max(MW * 0.6, MW * dy / dx))), H = header + MH + footer;
  const z = Math.max(1, Math.min(13, Math.floor(Math.log2(Math.min(MW / (dx * 256), MH / (dy * 256)))) + 1));
  const k = Math.min(MW / (dx * 256 * 2 ** z), MH / (dy * 256 * 2 ** z)), mundo = 256 * 2 ** z;
  const cx = (x1 + x2) / 2 * mundo, cy = (y1 + y2) / 2 * mundo, tl = 256 * k;
  const tiles = [];
  for (let tx = Math.floor((cx - MW / (2 * k)) / 256); tx <= Math.floor((cx + MW / (2 * k)) / 256); tx++)
    for (let ty = Math.max(0, Math.floor((cy - MH / (2 * k)) / 256)); ty <= Math.min(2 ** z - 1, Math.floor((cy + MH / (2 * k)) / 256)); ty++) tiles.push({ tx, ty });
  const tela = (tx, ty) => [MW / 2 + (tx * 256 - cx) * k, MH / 2 + (ty * 256 - cy) * k];
  const caminho = (ctx) => { ctx.beginPath(); for (const a of an) a.forEach(([lon, lat], i) => { const px = MW / 2 + (lonX(lon) * mundo - cx) * k, py = MH / 2 + (latY(lat) * mundo - cy) * k; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); };
  const cv = Object.assign(document.createElement("canvas"), { width: W, height: H }), ctx = cv.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  const mp = Object.assign(document.createElement("canvas"), { width: MW, height: MH }), m = mp.getContext("2d");
  caminho(m); m.fillStyle = "#eeeeee"; m.fill("evenodd");
  const imgs = await mapLimit(tiles, 8, ({ tx, ty }) => { const n = 2 ** z; return imagem(r.url.replace("{z}", z).replace("{x}", ((tx % n) + n) % n).replace("{y}", ty)); });
  imgs.forEach((img, i) => { if (img) { const [px, py] = tela(tiles[i].tx, tiles[i].ty); m.drawImage(img, px, py, tl + 0.5, tl + 0.5); } });
  caminho(m); m.strokeStyle = "#2b2b2b"; m.lineWidth = 1.2; m.lineJoin = "round"; m.stroke();
  ctx.drawImage(mp, pad, header);
  ctx.fillStyle = "#2a2119"; ctx.textBaseline = "alphabetic";
  ctx.font = `700 20px "Source Sans 3", sans-serif`; ctx.fillText(spec.titulo, pad, 36, W - 2 * pad - 210);
  ctx.fillStyle = "#5b4a3b"; ctx.font = `500 15px "Source Sans 3", sans-serif`; ctx.fillText([nomeRecorte(), spec.sub].filter(Boolean).join(" · "), pad, 60, W - 2 * pad - 210);
  const logo = OPT.logo;
  if (logo && logo.complete && logo.naturalWidth) {
    const lh = 40, lw = logo.naturalWidth / logo.naturalHeight * lh;
    ctx.font = `300 19px "Josefin Sans", sans-serif`; const wMap = ctx.measureText("MAP").width;
    ctx.font = `600 19px "Josefin Sans", sans-serif`; const wTxt = wMap + ctx.measureText("BIOMAS").width;
    const x0 = W - pad - wTxt, y0 = 16;
    ctx.drawImage(logo, x0 - lw - 8, y0, lw, lh);
    ctx.font = `300 19px "Josefin Sans", sans-serif`; ctx.fillStyle = "#8a8a8a"; ctx.fillText("MAP", x0, y0 + 20);
    ctx.font = `600 19px "Josefin Sans", sans-serif`; ctx.fillStyle = "#a34f2e"; ctx.fillText("BIOMAS", x0 + wMap, y0 + 20);
    ctx.font = `300 12px "Josefin Sans", sans-serif`; ctx.fillText("[SOLO]", x0, y0 + 37);
  }
  ctx.font = `500 13px "Source Sans 3", sans-serif`; ctx.textBaseline = "middle";
  const yL = header + MH + 16 + altL / 2;
  for (const { it, x, linha: l } of pos) {
    const yy = yL + l * altL;
    ctx.fillStyle = it.cor; ctx.fillRect(x, yy - sw / 2, sw, sw);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.strokeRect(x + 0.5, yy - sw / 2 + 0.5, sw - 1, sw - 1);
    ctx.fillStyle = "#333333"; ctx.fillText(nomeLeg(it.nome), x + sw + 6, yy);
  }
  ctx.fillStyle = "#666666"; ctx.font = `500 12px "Source Sans 3", sans-serif`; ctx.textBaseline = "alphabetic";
  ctx.fillText("Fonte: MapBiomas Solo · Coleção 3 (beta) · mapa da API pública da Plataforma MapBiomas", pad, H - 14, W - 2 * pad);
  ctx.getImageData(0, 0, 1, 1); // falha aqui se o navegador bloquear a leitura dos tiles
  return cv;
}
const MAPAS = new Map();
const chaveMapa = (spec) => JSON.stringify([spec.k, spec.prm, chaveAPI(), spec.titulo]);
function phMapa(id, html) { const f = q("fs-mp-" + id); if (f) f.innerHTML = `<div class="fs-ph">${html}</div>`; }
const MSG_FORA = `<b>Mapa indisponível neste visualizador</b>O mapa vem da API da Plataforma MapBiomas, que o visualizador de artefatos do Claude bloqueia. Abra a versão do GitHub Pages para ver e baixar as thumbnails.`;
async function carregarMapas(g) {
  const ids = Object.keys(CARTOES).filter((id) => CARTOES[id].tipo === "mapa");
  if (apiFora) { ids.forEach((id) => phMapa(id, MSG_FORA)); return; }
  await mapLimit(ids, 2, async (id) => {
    if (g !== geracao || !CARTOES[id]) return;
    const spec = CARTOES[id].spec, kk = chaveMapa(spec);
    try {
      let cv = MAPAS.get(kk);
      if (!cv) { cv = await desenharMapa(spec, chaveAPI()); MAPAS.set(kk, cv); }
      if (g !== geracao) return;
      CARTOES[id].canvas = cv;
      const f = q("fs-mp-" + id); if (!f) return;
      const img = new Image(); img.alt = spec.titulo + " · " + nomeRecorte(); img.src = cv.toDataURL("image/png");
      f.innerHTML = ""; f.appendChild(img); f.classList.add("ok");
    } catch (e) {
      if (g !== geracao) return;
      phMapa(id, apiFora ? MSG_FORA : `<b>Não foi possível montar o mapa</b>${esc(e.message || e)}`);
    }
  });
}

// =====================================================================
// Downloads (padrão comum com o Explorador)
//   CSV: linhas "# título", "# recorte", "# unidade", "# método", "# fonte"; ";" e vírgula decimal; BOM UTF-8
//   PNG: título e recorte no topo, legenda do gráfico, linha de fonte no rodapé; fundo sólido
// =====================================================================
let DL = null; // capability "downloads" do visualizador de artefatos; fora dele, link <a download>
(async () => { try { DL = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch { DL = null; } })();
function aviso(msg) { const t = document.createElement("div"); t.className = "fs-toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
async function salvarArquivo(nome, data, tipo) {
  if (DL) {
    try { await DL.save({ filename: nome, data }); aviso(`Arquivo salvo: ${nome}`); return; }
    catch (e) {
      if (e && e.code === "declined") return;
      if (e && e.code === "rate_limited") { aviso("Já há um download aguardando confirmação."); return; }
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: tipo || "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
const textoLimpo = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " ").trim(); };
const nomeArq = (id, ext) => `mapbiomas_solo_folha${CARTOES[id].folha}_${seguro(textoLimpo(CARTOES[id].titulo).replace(" · " + nomeRecorte(), ""))}_${seguro(nomeRecorte())}.${ext}`;
const numCsv = (v) => typeof v === "number" && isFinite(v) ? String(+v.toFixed(6)).replace(".", ",") : (v == null ? "" : String(v));
function csvDe(linhas) {
  const cel = (x) => { const t = numCsv(x); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return "﻿" + linhas.map((l) => l.map(cel).join(";")).join("\r\n") + "\r\n";
}
function csvCartao(id) {
  const c = CARTOES[id];
  return csvDe([
    ["# título: " + textoLimpo(c.titulo) + ` (folha ${c.folha} do factsheet do MapBiomas Solo col. 3)`],
    ["# recorte: " + nomeRecorte()],
    ["# unidade: " + (c.unidade || "")],
    ["# método: " + (c.metodo || "")],
    ["# fonte: " + (FONTES[c.fonte] || c.fonte || "")],
    ...c.csv(),
  ]);
}
async function pngGrafico(id) {
  const canvas = q("fs-cv-" + id), c0 = CARTOES[id];
  const r = canvas.width / canvas.clientWidth || 1, top = Math.round((c0.total ? 62 : 44) * r), pad = Math.round(14 * r), rod = Math.round(26 * r);
  const c = Object.assign(document.createElement("canvas"), { width: canvas.width + 2 * pad, height: canvas.height + top + rod + 2 * pad });
  const ctx = c.getContext("2d");
  ctx.fillStyle = css("--surface"); ctx.fillRect(0, 0, c.width, c.height);
  ctx.textBaseline = "top";
  ctx.fillStyle = css("--ink"); ctx.font = `600 ${Math.round(15 * r)}px "Source Sans 3", sans-serif`;
  ctx.fillText(textoLimpo(c0.titulo), pad, pad, c.width - 2 * pad);
  ctx.fillStyle = css("--ink-2"); ctx.font = `500 ${Math.round(12 * r)}px "Source Sans 3", sans-serif`;
  ctx.fillText(`${nomeRecorte()}${c0.unidade ? " · " + c0.unidade : ""}`, pad, pad + Math.round(20 * r), c.width - 2 * pad);
  if (c0.total) { ctx.font = `600 ${Math.round(12 * r)}px "Source Sans 3", sans-serif`; ctx.fillText(textoLimpo(c0.total), pad, pad + Math.round(37 * r), c.width - 2 * pad); }
  ctx.drawImage(canvas, pad, pad + top);
  ctx.fillStyle = css("--muted"); ctx.font = `500 ${Math.round(10.5 * r)}px "Source Sans 3", sans-serif`;
  ctx.fillText(`Fonte: ${FONTES[c0.fonte] || c0.fonte || "MapBiomas"} · MapBiomas Solo col. 3 (beta)`, pad, c.height - pad - Math.round(12 * r), c.width - 2 * pad);
  return new Promise((res) => c.toBlob(res, "image/png"));
}
async function aoClicar(e) {
  const b = e.target.closest(".fs-dl button"); if (!b) return;
  const id = b.dataset.id, c = CARTOES[id]; if (!c) return;
  if (b.dataset.acao === "csv") {
    salvarArquivo(nomeArq(id, "csv"), csvCartao(id), "text/csv");
  } else if (b.dataset.acao === "png") {
    salvarArquivo(nomeArq(id, "png"), await pngGrafico(id), "image/png");
  } else if (b.dataset.acao === "thumb") {
    if (!c.canvas) { aviso(apiFora ? "Os mapas só funcionam na versão do GitHub Pages." : "O mapa ainda está carregando."); return; }
    salvarArquivo(nomeArq(id, "png"), await new Promise((res) => c.canvas.toBlob(res, "image/png")), "image/png");
  }
}

// redesenha os gráficos quando o tema da página muda
new MutationObserver(() => { if (D && EL && EL.isConnected) desenharGraficos(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

// =====================================================================
// API pública do módulo
// =====================================================================
function dados(url) {
  if (D) return Promise.resolve(D);
  if (!carregando) carregando = fetch(url || OPT.dadosUrl || "dados_fabrica.json").then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then((d) => (D = d)).catch((e) => { carregando = null; throw e; });
  return carregando;
}
function iniciar(el, opt, aba) {
  geracao++;
  limpar();
  EL = el; OPT = Object.assign({}, OPT, opt); S.aba = aba;
  el.innerHTML = `<div class="fs-root"><p class="fs-loading">Carregando as figuras do factsheet…</p></div>`;
  return dados().then(() => render()).catch((e) => {
    if (EL === el) el.innerHTML = `<div class="fs-root"><p class="fs-note">Não foi possível carregar <code>${esc(OPT.dadosUrl || "dados_fabrica.json")}</code> (${esc(e.message)}). Abra a página por um servidor (GitHub Pages ou <code>python -m http.server</code>).</p></div>`;
  });
}
const montarAba = (el, opt = {}) => iniciar(el, opt, opt.aba || "carbono");
const montar = (el, opt = {}) => iniciar(el, opt, "todas");
function desmontar() {
  geracao++;
  limpar();
  if (EL && EL.isConnected && EL.querySelector(".fs-root")) EL.innerHTML = "";
  EL = null;
}
return { montarAba, montar, atualizar: render, desmontar, dados, abas: Object.keys(ABAS), nomeRecorte: () => (D ? nomeRecorte() : "Brasil") };
})();
