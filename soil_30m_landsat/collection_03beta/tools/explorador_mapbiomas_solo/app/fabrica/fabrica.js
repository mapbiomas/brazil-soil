/* Fábrica de factsheets do MapBiomas Solo col. 3, como módulo encaixável.
   Uso:  FabricaSolo.montar(elemento, { recorte: () => ({ bioma: "2", uf: "GO" }), dadosUrl: "dados_fabrica.json", logo: imgElement })
         FabricaSolo.atualizar()          // depois de mudar o bioma ou o estado na página hospedeira
         FabricaSolo.dados()              // Promise com dados_fabrica.json (biomas, ufs, regioes…)
   bioma = índice em dados.biomas como texto ("" = todos); uf = sigla ("" = todos).
   Requer Chart.js 4 e chartjs-plugin-datalabels (globais Chart e ChartDataLabels) e fabrica.css.
   Todo número é soma por região bioma × UF; as médias são soma(COS) ÷ soma(área) do recorte. */
window.FabricaSolo = (() => {
"use strict";
let D = null, EL = null, OPT = {}, carregando = null;
const S = { bioma: "", uf: "", uso: "0", camGran: "0" };
const charts = {};
const CARTOES = {};
const PEND = [];
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
const src = (t) => `<span class="fs-src">${t}</span>`;
const seguro = (v) => String(v || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60).toLowerCase();
function eixoArea(v) { const a = Math.abs(v); return a >= 1e6 ? f0.format(v / 1e6) + " Mha" : a >= 1e3 ? f0.format(v / 1e3) + " mil" : f0.format(v); }

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
const tile = (label, valor, nota, cor) => `<div class="fs-card fs-tile" style="${cor ? `--c:${cor}` : ""}"><div class="fs-label">${label}</div><div class="fs-value">${valor}</div><div class="fs-tnote">${nota || "&nbsp;"}</div></div>`;
function botoesDL(id, tipo) {
  return tipo === "mapa"
    ? `<div class="fs-dl dl"><button type="button" data-acao="thumb" data-id="${id}" title="Baixar a thumbnail do mapa em PNG">PNG</button></div>`
    : `<div class="fs-dl dl"><button type="button" data-acao="csv" data-id="${id}" title="Baixar os dados do gráfico em CSV">CSV</button><button type="button" data-acao="png" data-id="${id}" title="Baixar o gráfico em PNG">PNG</button></div>`;
}
function cGrafico(id, o) {
  CARTOES[id] = { tipo: "grafico", titulo: o.titulo, total: o.total || "", csv: o.csv };
  PEND.push([id, o.cfg]);
  return `<div class="fs-card"><div class="fs-card-head"><div><h3>${o.titulo}${o.fonte ? src(o.fonte) : ""}</h3>${o.sub ? `<p class="fs-sub">${o.sub}</p>` : ""}${o.total ? `<p class="fs-total">${o.total}</p>` : ""}</div>${botoesDL(id, "grafico")}</div>
    <div class="fs-chart ${o.alt || ""}"><canvas id="fs-cv-${id}" role="img" aria-label="${esc(o.titulo)}"></canvas></div></div>`;
}
function cMapa(id, spec) {
  CARTOES[id] = { tipo: "mapa", titulo: spec.titulo, spec };
  return `<div class="fs-card"><div class="fs-card-head"><div><h3>${spec.titulo}${src("API MapBiomas")}</h3>${spec.sub ? `<p class="fs-sub">${spec.sub}</p>` : ""}</div>${botoesDL(id, "mapa")}</div>
    <figure class="fs-mapa" id="fs-mp-${id}"><div class="fs-ph">Preparando o mapa…</div></figure></div>`;
}
function folha(n, titulo, sub, corpo) {
  return `<section class="fs-folha" id="fs-f${n}"><header class="fs-folha-head"><span class="fs-pg" aria-label="Página ${n} do factsheet">${n}</span><div class="fs-ttl"><h2>${titulo}</h2><p>${sub}</p></div></header>${corpo}</section>`;
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
const COB12 = [["Formação Florestal", "#1f8d49"], ["Formação Savânica", "#7dc975"], ["Formação Campestre", "#d6bc74"], ["Campo Alagado e Área Pantanosa", "#519799"],
  ["Pastagem", "#edde8e"], ["Agricultura", "#c27ba0"], ["Mosaico de Usos", "#ffefc3"], ["Silvicultura", "#7a5900"], ["Outros", "#b9a68a"]];

// =====================================================================
// Folhas (número = página do factsheet oficial)
// =====================================================================
function fPedregosidade(rs) {
  let html = "", tiles = "";
  for (const [tipo, nome, vol, lim] of [["dominante", "Pedregosidade dominante", "50", ">50% do volume"], ["extrema", "Pedregosidade extrema", "90", ">90% do volume"]]) {
    const p = somar(D.ped[tipo], rs) || D.pedregosidade_faixas.map(() => [0, 0]);
    const a = fx10(p.map((x) => x[0])), tot = soma(a), ate90 = soma(a.slice(0, 9));
    if (tipo === "dominante") tiles += tile("Pedregosidade dominante de 0 a 90 cm", pct(100 * ate90 / tot), `${areaTxt(ate90)} do recorte`, "#c51b8a");
    else tiles += tile("Livre de pedregosidade extrema até 90 cm", pct(100 * a[9] / tot), `${areaTxt(a[9])} com pelo menos 90 cm de solo livre`, "#e08a1e");
    html += `<div class="fs-grid fs-g2">` + cMapa("m" + vol, { titulo: `Profundidade até a ${nome.toLowerCase()} (${lim})`, sub: "Estimativas censuradas em 100 cm.", k: "soil_stoniness", prm: { volume: vol } }) +
      cGrafico("ped-" + tipo, {
        titulo: `Área por profundidade até a ${nome.toLowerCase()}`, fonte: "Planilha",
        sub: "Faixas de 0 a 90 cm. A faixa > 90 cm (inclui o limiar não atingido até 100 cm) fica no total.",
        total: `Até 90 cm: <b>${areaTxt(ate90)}</b> (${pct(100 * ate90 / tot)}) · > 90 cm: <b>${areaTxt(a[9])}</b> (${pct(100 * a[9] / tot)}) · área total: ${areaTxt(tot)}`,
        csv: () => [["faixa de profundidade", "area_ha", "percentual_do_recorte"], ...a.map((v, i) => [FX10[i], v, 100 * v / tot]), ["total", tot, 100]],
        alt: "t",
        cfg: { labels: FX10.slice(0, 9), hz: true, series: [{ nome: "Área", dados: a.slice(0, 9), cor: tipo === "dominante" ? "#e7298a" : "#f0a030" }],
          rot: (v) => `${areaTxt(v)} · ${pct(100 * v / tot)}`, tick: eixoArea },
      }) + `</div>`;
  }
  return folha(6, "Pedregosidade do solo", "Profundidade até a camada em que os fragmentos grossos (> 2 mm) passam de 50% e de 90% do volume do solo · 2024", `<div class="fs-kpis">${tiles}</div>` + html);
}

function fPedAgro(rs) {
  const P = somar(D.pa, rs);
  if (!P) return folha(7, "Pedregosidade e agropecuária (1985–2024)", "Profundidade até a pedregosidade dominante (> 50% do volume)",
    `<p class="fs-note">O cruzamento da pedregosidade com a cobertura ainda não foi calculado para este recorte. Rode <code>scripts/pedregosidade_agro_gee.py</code> e <code>scripts/montar_dados.py</code>.</p>`);
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
      titulo: fx, fonte: "GEE",
      total: `2024: <b>${areaTxt(v24)}</b>${dif == null ? "" : ` · ${dif >= 0 ? "+" : "−"}${f1.format(Math.abs(dif))}% desde 1985`}`,
      csv: () => [["ano", ...USOS.map((x) => x[0] + "_ha"), "agropecuaria_total_ha"], ...anos.map((a, ai) => [a, ...USOS.map((_, k) => valor(ai, f, k)), valor(ai, f, 4)])],
      alt: "s",
      cfg: { labels: anos.map(String), series: [{ nome: nomeUso, dados, cor }], rot: (v) => areaTxt(v), tick: eixoArea },
    });
  });
  const inf = D.agro_info || {};
  return folha(7, "Pedregosidade e agropecuária (1985–2024)", "Área de cada uso por profundidade até a pedregosidade dominante (> 50% do volume) · cobertura da Coleção 10",
    `<div class="fs-ctrl"><span class="fs-flabel">Uso mostrado</span>${seg("fs-s-uso", [...USOS.map((x, i) => [String(i), x[0]]), ["4", "Agropecuária (soma)"]], S.uso)}<span>O CSV de cada gráfico traz os quatro usos.</span></div>
     <div class="fs-grid fs-gm5">${graf}</div>
     <p class="fs-note">Cálculo próprio no Google Earth Engine (escala de ${inf.escala_m || 30} m), cruzando a pedregosidade dominante da Coleção 3 com a cobertura da Coleção 10. A agropecuária inclui pastagem, agricultura, silvicultura e mosaico de usos, como no factsheet.${inf.falhas && inf.falhas.length ? ` Falharam: ${esc(JSON.stringify(inf.falhas))}.` : ""}</p>`);
}

function fGranulometria(rs) {
  const G = somar(D.gran, rs);
  if (!G) return folha(8, "Granulometria do solo", "", `<p class="fs-note">Sem granulometria para este recorte.</p>`);
  const teor = (fi, cams) => { const a = soma(cams.map((c) => G[c][0])); return a ? soma(cams.map((c) => G[c][fi])) / a : null; };
  const c = +S.camGran, camNome = D.camadas_gran[c];
  let tiles = "", mapas = "", graf = "";
  for (const [k, fi, nome, cor, faixa, sub] of FRAC) {
    tiles += tile(`Teor médio de ${nome.toLowerCase()} · 0–30 cm`, `${f1.format(teor(fi, [0, 1, 2]))}<small>%</small>`, `${faixa} · ${camNome}: ${f1.format(teor(fi, [c]))}%`, cor);
    mapas += cMapa("g-" + k, { titulo: `Teor de ${nome.toLowerCase()} do solo`, sub: `Camada ${camNome} · ${faixa}`, k: sub, prm: { depth: D10[c] } });
    const dados = D.camadas_gran.map((_, i) => teor(fi, [i]));
    graf += cGrafico("gr-" + k, {
      titulo: `Teor médio de ${nome.toLowerCase()} por camada`, fonte: "GEE",
      total: `0–30 cm: <b>${f1.format(teor(fi, [0, 1, 2]))}%</b> · 0–100 cm: <b>${f1.format(teor(fi, D.camadas_gran.map((_, i) => i)))}%</b>`,
      csv: () => [["camada", `teor_medio_${k}_pct`, "area_mapeada_ha"], ...D.camadas_gran.map((n, i) => [n, dados[i], G[i][0]])],
      cfg: { labels: D.camadas_gran.map((n) => n.replace(" cm", "")), series: [{ nome, dados, cor }], rot: (v) => f1.format(v) + "%", tick: (v) => f0.format(v) + "%" },
    });
  }
  return folha(8, "Granulometria do solo", "Teores de areia, silte e argila · média ponderada pela área mapeada",
    `<div class="fs-kpis">${tiles}</div>
     <div class="fs-ctrl"><span class="fs-flabel">Camada dos mapas</span>${seg("fs-s-cam", D.camadas_gran.map((n, i) => [String(i), n.replace(" cm", "")]), S.camGran)}<span>O factsheet mostra 0–30 cm; a Plataforma só serve camadas de 10 cm.</span></div>
     <div class="fs-grid fs-g3">${mapas}</div><div class="fs-grid fs-g3">${graf}</div>`);
}

function areasTex(rs) { const T = somar(D.tex24, rs) || D.texturas.map(() => [0, 0]); return { T, a: TEX_ORD.map((n) => T[texIdx(n)][0]) }; }
function fTextura(rs) {
  const { T, a } = areasTex(rs), base = soma(a);
  const fora = T[texIdx("Fragmentos de Rocha")][0] + T[texIdx("Não Observado")][0];
  const iM = TEX_ORD.indexOf("Média");
  const raras = soma(["Arenosa", "Siltosa", "Muito Argilosa"].map((n) => a[TEX_ORD.indexOf(n)]));
  const tiles = tile("Mapeado com textura média", pct(100 * a[iM] / base), areaTxt(a[iM]), texCor("Média")) +
    tile("Arenosa, siltosa e muito argilosa", pct(100 * raras / base), `${areaTxt(raras)} somadas`, texCor("Muito Argilosa")) +
    tile("Área com textura mapeada", `${area(base)[0]}<small>${area(base)[1]}</small>`, `fora: ${areaTxt(fora)} (fragmentos de rocha e não observado)`);
  const grafArea = cGrafico("tex-area", {
    titulo: "Área por grupo textural · 0–30 cm", fonte: "Planilha",
    total: `Total com textura mapeada: <b>${areaTxt(base)}</b>`,
    csv: () => [["grupo textural", "area_ha", "percentual"], ...TEX_ORD.map((n, i) => [n, a[i], 100 * a[i] / base]), ["total", base, 100]],
    cfg: { labels: TEX_ORD, hz: true, series: [{ nome: "Área", dados: a, cores: TEX_ORD.map(texCor) }], rot: (v) => `${areaTxt(v)} · ${pct(100 * v / base)}`, tick: eixoArea },
  });
  const grupos = filtrado() ? [[nomeRecorte(), rs]] : D.biomas.map((b, i) => [b, regioes(String(i), "")]);
  let mult = "";
  grupos.forEach(([nome, r], gi) => {
    const x = areasTex(r).a, bt = soma(x), p = x.map((v) => bt ? 100 * v / bt : 0);
    mult += cGrafico("tex-b" + gi, {
      titulo: esc(nome), fonte: "Planilha", total: `Textura mapeada: <b>${areaTxt(bt)}</b>`, alt: "s",
      csv: () => [["grupo textural", "area_ha", "percentual"], ...TEX_ORD.map((n, i) => [n, x[i], p[i]])],
      cfg: { labels: TEX_ORD, series: [{ nome: "Proporção", dados: p, cores: TEX_ORD.map(texCor) }], rot: (v) => `${f1.format(v)}%`, tip: (v, i) => `${f1.format(v)}% · ${areaTxt(x[i])}`, tick: (v) => f0.format(v) + "%" },
    });
  });
  return folha(9, "Textura do solo", "Grupo textural · profundidade 0–30 cm",
    `<div class="fs-kpis">${tiles}</div>
     <div class="fs-grid fs-g2">${cMapa("tex030", { titulo: "Grupo textural · 0–30 cm", k: "soil_textural_group", prm: { depth: "000_030" } })}${grafArea}</div>
     <h3 style="margin:6px 0 10px;font-size:1.02rem">Proporção dos grupos texturais ${filtrado() ? "no recorte" : "por bioma"}</h3>
     <div class="fs-grid fs-gm">${mult}</div>`);
}

function fCobTextura(rs) {
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
      titulo: `Textura ${n.toLowerCase()}`, fonte: "Planilha",
      total: `Área da textura: <b>${areaTxt(t85)}</b> em 1985 · <b>${areaTxt(t24)}</b> em 2024`,
      csv: () => [["cobertura e uso", "area_1985_ha", "area_2024_ha", "pct_1985", "pct_2024"], ...usos.map(([g], i) => [g, o[g][0], o[g][1], p85[i], p24[i]]), ["total", t85, t24, 100, 100]],
      cfg: { labels: usos.map(([g]) => g), series: [{ nome: "1985", dados: p85, cor: css("--fs-y85") || "#b9a68a" }, { nome: "2024", dados: p24, cor: usos.map(([, c]) => c) }],
        rot: (v) => f0.format(v) + "%", tip: (v, i, s) => `${f1.format(v)}% · ${areaTxt(o[usos[i][0]][s])}`, tick: (v) => f0.format(v) + "%" },
    }));
  });
  return folha(10, "Cobertura e uso da terra por textura do solo", "% da área de cada grupo textural (0–30 cm) por cobertura e uso · 1985 e 2024 · Coleção 10",
    `<div class="fs-grid fs-g2">${cMapa("cob", { titulo: "Cobertura e uso da terra · 2024", sub: "A Plataforma serve hoje a Coleção 11; o factsheet usa a Coleção 10.", k: "coverage_coverage-30m-droufo", legendId: "5837836a-c21c-4109-b3ef-5d8eb4ac1dc7", prm: { year: "2024" } })}
     ${cards[0] || ""}</div>
     <div class="fs-grid fs-gm">${cards.slice(1).join("")}</div>`);
}

function fCamadas(rs) {
  const C = somar(D.cam24, rs) || D.camadas_tex.map(() => D.texturas.map(() => 0));
  let mapas = "", graf = "";
  const dep = ["000_030", "030_060", "060_100"];
  D.camadas_tex.forEach((cam, ci) => {
    const a = TEX_ORD.map((n) => C[ci][texIdx(n)]), t = soma(a);
    mapas += cMapa("cam" + ci, { titulo: `Grupo textural · ${cam}`, k: "soil_textural_group", prm: { depth: dep[ci] } });
    graf += cGrafico("cam-" + ci, {
      titulo: cam, fonte: "Planilha", total: `Textura mapeada: <b>${areaTxt(t)}</b>`,
      csv: () => [["grupo textural", "area_ha", "percentual"], ...TEX_ORD.map((n, i) => [n, a[i], t ? 100 * a[i] / t : 0]), ["total", t, 100]],
      cfg: { labels: TEX_ORD, hz: true, series: [{ nome: "Área", dados: a, cores: TEX_ORD.map(texCor) }], rot: (v) => `${areaTxt(v)} · ${pct(100 * v / t)}`, tick: eixoArea },
    });
  });
  return folha(11, "Mudanças na textura do solo em diferentes profundidades", "Grupo textural nas camadas 0–30, 30–60 e 60–100 cm",
    `<div class="fs-grid fs-g3">${mapas}</div><div class="fs-grid fs-g3">${graf}</div>`);
}

function cosFaixas(rs) {
  if (D.cosfx_fonte && D.cosfx_fonte.tipo === "gee") return somar(D.cosfx, rs);
  return D.cosfx[chaveAPI()] || null;
}
function fCOS(rs) {
  const CB = somar(D.cob24, rs) || D.cobertura.map(() => [0, 0]);
  const a = soma(CB.map((x) => x[0])), c = soma(CB.map((x) => x[1]));
  const porNome = (n) => CB[D.cobertura.findIndex((x) => x.nome === n)] || [0, 0];
  const cats = COB12.map(([n]) => n === "Outros" ? null : porNome(n));
  const outros = [a - soma(cats.filter(Boolean).map((x) => x[0])), c - soma(cats.filter(Boolean).map((x) => x[1]))];
  const vals = COB12.map((_, i) => cats[i] || outros);
  const fx = cosFaixas(rs);
  const bins = fx ? [fx[0] + fx[1], ...fx.slice(2)] : null, bt = bins ? soma(bins) : 0;
  const BN = ["< 20", "20–30", "30–40", "40–50", "50–60", "60–70", "70–80", "> 80"];
  const corB = D.cos_faixas.slice(1).map((x) => x.cor);
  const im = bins ? bins.indexOf(Math.max(...bins)) : -1;
  const ff = porNome("Formação Florestal")[1], ag = porNome("Agricultura")[1];
  const tiles = tile("Massa de COS · 2024", `${massa(c)[0]}<small>${massa(c)[1]}</small>`, `estoque médio de ${f1.format(c / a)} t/ha`) +
    tile("Massa em formação florestal", `${massa(ff)[0]}<small>${massa(ff)[1]}</small>`, pct(100 * ff / c) + " do COS do recorte", "#1f8d49") +
    tile("Massa na agricultura", `${massa(ag)[0]}<small>${massa(ag)[1]}</small>`, pct(100 * ag / c) + " do COS do recorte", "#c27ba0") +
    (bins ? tile(`Estoca entre ${BN[im].replace("–", " e ")} t/ha`, pct(100 * bins[im] / bt), `${areaTxt(bins[im])}, a faixa com mais área`, corB[im]) : "");
  const fonteFx = D.cosfx_fonte && D.cosfx_fonte.tipo === "gee" ? "GEE" : "API MapBiomas";
  const gFx = bins ? cGrafico("cos-fx", {
    titulo: "Área por faixa de estoque de COS (t/ha)", fonte: fonteFx, total: `Área com COS mapeado: <b>${areaTxt(bt)}</b>`, alt: "t",
    csv: () => [["faixa de estoque (t/ha)", "area_ha", "percentual"], ...BN.map((n, i) => [n, bins[i], 100 * bins[i] / bt]), ["total", bt, 100]],
    cfg: { labels: BN.map((n) => n + " t/ha"), hz: true, series: [{ nome: "Área", dados: bins, cores: corB }], rot: (v) => `${areaTxt(v)} · ${pct(100 * v / bt)}`, tick: eixoArea },
  }) : `<div class="fs-card"><p class="fs-note" style="margin:0">Sem área por faixa de estoque para este recorte.</p></div>`;
  const gCob = cGrafico("cos-cob", {
    titulo: "Massa de COS por cobertura e uso · 2024 (Coleção 10)", fonte: "Planilha", total: `Total: <b>${massaTxt(c)}</b> em ${areaTxt(a)}`, alt: "t",
    csv: () => [["cobertura e uso", "cos_t", "area_ha", "estoque_medio_t_ha", "pct_da_massa"], ...COB12.map(([n], i) => [n, vals[i][1], vals[i][0], vals[i][0] ? vals[i][1] / vals[i][0] : null, 100 * vals[i][1] / c]), ["total", c, a, c / a, 100]],
    cfg: { labels: COB12.map(([n]) => n), hz: true, series: [{ nome: "Massa", dados: vals.map((v) => v[1]), cores: COB12.map(([, k]) => k) }],
      rot: (v) => `${massaTxt(v)} · ${pct(100 * v / c)}`, tip: (v, i) => `${massaTxt(v)} · ${f1.format(vals[i][0] ? vals[i][1] / vals[i][0] : 0)} t/ha`, tick: (v) => f1.format(v / 1e9) + " Gt" },
  });
  return folha(12, `Carbono orgânico do solo (COS) · ${esc(nomeRecorte())} · 2024`, "Estoque de COS na camada 0–30 cm",
    `<div class="fs-kpis">${tiles}</div>
     <div class="fs-grid fs-g2">${cMapa("cos12", { titulo: "Estoque de COS · 2024", sub: "t/ha, 0–30 cm", k: "soil_soil_organic_carbon_stock", prm: { year: "2024" } })}${gFx}</div>
     <div class="fs-grid">${gCob}</div>`);
}

function fCOSBiomas(rs) {
  const CBr = somar(D.cob24, regioes("", "")), br = { a: soma(CBr.map((x) => x[0])), c: soma(CBr.map((x) => x[1])) }, refBR = br.c / br.a;
  const grupos = filtrado() ? [[nomeRecorte(), rs]] : D.biomas.map((b, i) => [b, regioes(String(i), "")]);
  const v = grupos.map(([n, r]) => { const CB = somar(D.cob24, r) || []; return { n, a: soma(CB.map((x) => x[0])), c: soma(CB.map((x) => x[1])) }; });
  const ct = soma(v.map((x) => x.c));
  const gGt = cGrafico("bio-gt", {
    titulo: `Massa de COS ${filtrado() ? "no recorte" : "nos biomas"} · 2024 (Gt)`, fonte: "Planilha", total: `Total: <b>${massaTxt(ct)}</b>`,
    csv: () => [["recorte", "cos_t", "area_ha", "pct_da_massa"], ...v.map((x) => [x.n, x.c, x.a, 100 * x.c / ct])],
    cfg: { labels: v.map((x) => x.n), hz: true, series: [{ nome: "Massa", dados: v.map((x) => x.c / 1e9), cor: css("--accent") }], rot: (x) => `${f2.format(x)} Gt · ${pct(100 * x * 1e9 / ct)}`, tick: (x) => f0.format(x) },
  });
  const gTha = cGrafico("bio-tha", {
    titulo: `Estoque de COS ${filtrado() ? "no recorte" : "nos biomas"} (t/ha)`, fonte: "Planilha", total: `Estoque do Brasil: <b>${f1.format(refBR)} t/ha</b> (linha tracejada)`,
    csv: () => [["recorte", "estoque_medio_t_ha", "cos_t", "area_ha"], ...v.map((x) => [x.n, x.c / x.a, x.c, x.a]), ["Brasil", refBR, br.c, br.a]],
    cfg: { labels: v.map((x) => x.n), series: [{ nome: "Estoque", dados: v.map((x) => x.c / x.a), cor: "#e8761f" }], rot: (x) => f1.format(x), tick: (x) => f0.format(x), ref: { v: refBR, txt: `Brasil: ${f1.format(refBR)} t/ha` }, folga: 1.18 },
  });
  return folha(13, filtrado() ? "Carbono orgânico do solo no recorte · 2024" : "Carbono orgânico do solo nos biomas · 2024", "Profundidade 0–30 cm · 1 Gt = 1 bilhão de toneladas",
    `<div class="fs-grid fs-g2">${cMapa("cos13", { titulo: "Estoque de COS · 2024", sub: "t/ha, 0–30 cm", k: "soil_soil_organic_carbon_stock", prm: { year: "2024" } })}<div class="fs-grid">${gGt}${gTha}</div></div>`);
}

function fCOSTextura(rs) {
  const grupos = filtrado() ? [[nomeRecorte(), rs]] : [["Brasil", regioes("", "")], ...D.biomas.map((b, i) => [b, regioes(String(i), "")])];
  let graf = "";
  grupos.forEach(([n, r], gi) => {
    const T = somar(D.tex24, r) || D.texturas.map(() => [0, 0]);
    const lin = TEX_ORD.map((t) => ({ t, a: T[texIdx(t)][0], c: T[texIdx(t)][1] })).filter((x) => x.a > 0 && x.c > 0);
    const at = soma(lin.map((x) => x.a)), ctot = soma(lin.map((x) => x.c));
    graf += cGrafico("ct14-" + gi, {
      titulo: esc(n), fonte: "Planilha", total: `Média do recorte: <b>${f1.format(ctot / at)} t/ha</b>`, alt: "s",
      csv: () => [["grupo textural", "estoque_medio_t_ha", "cos_t", "area_ha"], ...lin.map((x) => [x.t, x.c / x.a, x.c, x.a])],
      cfg: { labels: lin.map((x) => x.t), series: [{ nome: "Estoque", dados: lin.map((x) => x.c / x.a), cores: lin.map((x) => texCor(x.t)) }], rot: (v) => f1.format(v), tip: (v, i) => `${f1.format(v)} t/ha · ${areaTxt(lin[i].a)}`, tick: (v) => f0.format(v) },
    });
  });
  return folha(14, "Estoque de COS por textura" + (filtrado() ? "" : " no Brasil e nos biomas") + " · 2024", "Estoque médio de COS (t/ha) por grupo textural · profundidade 0–30 cm",
    `<div class="fs-grid fs-gm">${graf}</div>`);
}

function fFontes() {
  const fxF = D.cosfx_fonte && D.cosfx_fonte.tipo === "gee" ? "cálculo no GEE sobre a imagem pública de COS da coleção 3 (faixas de 10 t/ha)" : "API da Plataforma";
  return `<section class="fs-folha" id="fs-fontes"><div class="fs-card fs-method"><h3 style="margin-top:0">De onde vem cada número</h3><dl>
    <dt>Planilha oficial</dt><dd>${esc(D.fontes.planilha)}. Pedregosidade (pág. 6), textura e cobertura (págs. 9 a 11), COS por cobertura, bioma e textura (págs. 12 a 14). Médias ponderadas: soma do COS ÷ soma da área do recorte.</dd>
    <dt>Google Earth Engine</dt><dd>Teores de areia, silte e argila (pág. 8); pedregosidade dominante × cobertura da Coleção 10 em 1985, 1995, 2005, 2015 e 2024 (pág. 7); área por faixa de estoque de COS (pág. 12): ${fxF}.</dd>
    <dt>Mapas</dt><dd>Pedidos ao vivo à API pública da Plataforma MapBiomas (<code>/maps/map</code> e <code>/territories/geometry</code>), recortados no bioma, no estado ou na interseção dos dois. Funcionam na versão do GitHub Pages; o visualizador de artefatos do Claude bloqueia sites externos.</dd>
    <dt>Downloads</dt><dd>O CSV usa ponto e vírgula e vírgula decimal (Excel em português). Os PNG dos gráficos levam título, recorte e total; as thumbnails dos mapas saem com legenda, fonte e fundo branco, prontas para o Canva.</dd>
    <dt>Fora desta versão</dt><dd>Página 4 do factsheet (amostras do SoilData): não há dado por estado.</dd>
  </dl></div></section>`;
}

const FOLHAS = [[6, "Pedregosidade"], [7, "Pedregosidade × agro"], [8, "Granulometria"], [9, "Textura"], [10, "Cobertura × textura"], [11, "Textura por camada"], [12, "COS 2024"], [13, "COS por bioma"], [14, "COS × textura"]];

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
  if (!D || !EL || !q("fs-folhas")) return;
  geracao++;
  limpar();
  const r = OPT.recorte ? OPT.recorte() : {};
  S.bioma = r.bioma == null ? "" : String(r.bioma); S.uf = r.uf || "";
  const rs = regioes(S.bioma, S.uf);
  q("fs-folhas").innerHTML = fPedregosidade(rs) + fPedAgro(rs) + fGranulometria(rs) + fTextura(rs) + fCobTextura(rs) + fCamadas(rs) + fCOS(rs) + fCOSBiomas(rs) + fCOSTextura(rs) + fFontes();
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
  ctx.fillText("Fonte: MapBiomas Solo · Coleção 3 (beta) · plataforma.mapbiomas.org", pad, H - 14, W - 2 * pad);
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
// Downloads (CSV, PNG do gráfico, thumbnail do mapa)
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
const nomeArq = (id, ext) => `mapbiomas_solo_fs_${seguro(textoLimpo(CARTOES[id].titulo))}_${seguro(nomeRecorte())}.${ext}`;
const numCsv = (v) => typeof v === "number" && isFinite(v) ? String(+v.toFixed(6)).replace(".", ",") : (v == null ? "" : String(v));
function csvDe(linhas) {
  const cel = (x) => { const t = numCsv(x); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return "﻿" + linhas.map((l) => l.map(cel).join(";")).join("\r\n") + "\r\n";
}
async function pngGrafico(id) {
  const canvas = q("fs-cv-" + id), c0 = CARTOES[id];
  const r = canvas.width / canvas.clientWidth || 1, top = Math.round((c0.total ? 62 : 44) * r), pad = Math.round(14 * r);
  const c = Object.assign(document.createElement("canvas"), { width: canvas.width + 2 * pad, height: canvas.height + top + 2 * pad });
  const ctx = c.getContext("2d");
  ctx.fillStyle = css("--surface"); ctx.fillRect(0, 0, c.width, c.height);
  ctx.textBaseline = "top";
  ctx.fillStyle = css("--ink"); ctx.font = `600 ${Math.round(15 * r)}px "Source Sans 3", sans-serif`;
  ctx.fillText(`${textoLimpo(c0.titulo)} · ${nomeRecorte()}`, pad, pad, c.width - 2 * pad);
  ctx.fillStyle = css("--muted"); ctx.font = `500 ${Math.round(11 * r)}px "Source Sans 3", sans-serif`;
  ctx.fillText("MapBiomas Solo · Coleção 3 (beta)", pad, pad + Math.round(20 * r), c.width - 2 * pad);
  if (c0.total) { ctx.fillStyle = css("--ink-2"); ctx.font = `600 ${Math.round(12 * r)}px "Source Sans 3", sans-serif`; ctx.fillText(textoLimpo(c0.total), pad, pad + Math.round(37 * r), c.width - 2 * pad); }
  ctx.drawImage(canvas, pad, pad + top);
  return new Promise((res) => c.toBlob(res, "image/png"));
}
async function aoClicar(e) {
  const b = e.target.closest(".fs-dl button"); if (!b) return;
  const id = b.dataset.id, c = CARTOES[id]; if (!c) return;
  if (b.dataset.acao === "csv") {
    salvarArquivo(nomeArq(id, "csv"), csvDe([["# " + textoLimpo(c.titulo) + " · " + nomeRecorte() + " · MapBiomas Solo col. 3"], ...c.csv()]), "text/csv");
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
function montar(el, opt = {}) {
  limpar();
  EL = el; OPT = Object.assign({}, OPT, opt);
  el.innerHTML = `<div class="fs-root">
    <div class="fs-bar"><p class="fs-intro">Gráficos e mapas do <a href="https://brasil.mapbiomas.org/wp-content/uploads/sites/3/2026/09/Factsheet_MapBiomas_Solo_Colecao_3.pdf" target="_blank" rel="noopener">factsheet oficial</a> para o bioma e o estado escolhidos. Os números das folhas são as páginas do PDF. Cada gráfico tem CSV e PNG, e cada mapa tem a thumbnail em PNG, no canto do cartão.</p></div>
    <nav class="fs-toc" aria-label="Folhas do factsheet">${FOLHAS.map(([n, t]) => `<a href="#fs-f${n}"><span>${n}</span>${t}</a>`).join("")}<a href="#fs-fontes"><span>i</span>Fontes</a></nav>
    <div id="fs-folhas"><p class="fs-loading">Carregando os dados da fábrica…</p></div></div>`;
  el.querySelector(".fs-root").addEventListener("click", aoClicar);
  el.querySelector(".fs-toc").addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); const t = q(a.getAttribute("href").slice(1)); if (t) t.scrollIntoView({ behavior: "smooth" }); });
  return dados().then(() => render()).catch((e) => {
    const f = q("fs-folhas"); if (f) f.innerHTML = `<p class="fs-note">Não foi possível carregar <code>${esc(OPT.dadosUrl || "dados_fabrica.json")}</code> (${esc(e.message)}). Abra a página por um servidor (GitHub Pages ou <code>python -m http.server</code>).</p>`;
  });
}
return { montar, atualizar: render, dados, nomeRecorte: () => (D ? nomeRecorte() : "Brasil") };
})();
