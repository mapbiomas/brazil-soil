"""Agrega as 8 abas da planilha 'estatisticas - MBSOLO3' (MapBiomas Solo col. 3) no JSON do explorador.

Lê os CSVs já baixados em analises/carbono_solo_cerrado/dados/ (sem alterar nada lá).
Guarda SOMAS (área em ha, COS em t) no nível mais fino bioma x UF; a página soma o recorte
escolhido e só então divide (média ponderada = soma(COS) / soma(área), nunca média de médias).
Saída: ../app/dados.json  (+ granulometria do GEE, se ../dados/granulometria_bioma_uf.json existir)
"""
import json
import sys
from pathlib import Path
import pandas as pd

AQUI = Path(__file__).resolve().parent
# CSVs das abas da planilha: 1º argumento ou, por padrão, a pasta usada no projeto de origem
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI.parents[1] / "carbono_solo_cerrado" / "dados"
OUT = AQUI.parent / "app" / "dados.json"

UF_SIGLA = {"RONDÔNIA": "RO", "ACRE": "AC", "AMAZONAS": "AM", "RORAIMA": "RR", "PARÁ": "PA", "AMAPÁ": "AP",
            "TOCANTINS": "TO", "MARANHÃO": "MA", "PIAUÍ": "PI", "CEARÁ": "CE", "RIO GRANDE DO NORTE": "RN",
            "PARAÍBA": "PB", "PERNAMBUCO": "PE", "ALAGOAS": "AL", "SERGIPE": "SE", "BAHIA": "BA",
            "MINAS GERAIS": "MG", "ESPÍRITO SANTO": "ES", "RIO DE JANEIRO": "RJ", "SÃO PAULO": "SP",
            "PARANÁ": "PR", "SANTA CATARINA": "SC", "RIO GRANDE DO SUL": "RS", "MATO GROSSO DO SUL": "MS",
            "MATO GROSSO": "MT", "GOIÁS": "GO", "DISTRITO FEDERAL": "DF"}
UF_NOME = {"RO": "Rondônia", "AC": "Acre", "AM": "Amazonas", "RR": "Roraima", "PA": "Pará", "AP": "Amapá",
           "TO": "Tocantins", "MA": "Maranhão", "PI": "Piauí", "CE": "Ceará", "RN": "Rio Grande do Norte",
           "PB": "Paraíba", "PE": "Pernambuco", "AL": "Alagoas", "SE": "Sergipe", "BA": "Bahia",
           "MG": "Minas Gerais", "ES": "Espírito Santo", "RJ": "Rio de Janeiro", "SP": "São Paulo",
           "PR": "Paraná", "SC": "Santa Catarina", "RS": "Rio Grande do Sul", "MS": "Mato Grosso do Sul",
           "MT": "Mato Grosso", "GO": "Goiás", "DF": "Distrito Federal"}
BIOMAS = ["Amazônia", "Caatinga", "Cerrado", "Mata Atlântica", "Pampa", "Pantanal"]
ANOS = list(range(1985, 2025))
CAMADAS = ["000_010cm", "000_020cm", "000_030cm", "020_040cm", "030_060cm", "060_100cm"]

# Cobertura (Coleção 10), nível 2, com as cores da legenda MapBiomas
COB = [("Formação Florestal", "Natural", "#1f8d49"), ("Formação Savânica", "Natural", "#7dc975"),
       ("Floresta Alagável", "Natural", "#026975"), ("Mangue", "Natural", "#04381d"),
       ("Restinga Arbórea", "Natural", "#02d659"), ("Campo Alagado e Área Pantanosa", "Natural", "#519799"),
       ("Formação Campestre", "Natural", "#d6bc74"), ("Apicum", "Natural", "#fc8114"),
       ("Afloramento Rochoso", "Natural", "#ffaa5f"), ("Restinga Herbácea", "Natural", "#ad5100"),
       ("Pastagem", "Antrópico", "#edde8e"), ("Agricultura", "Antrópico", "#c27ba0"),
       ("Silvicultura", "Antrópico", "#7a5900"), ("Mosaico de Usos", "Antrópico", "#ffefc3"),
       ("Área Urbanizada", "Antrópico", "#d4271e"), ("Mineração", "Antrópico", "#9c0027"),
       ("Aquicultura", "Antrópico", "#091077"), ("Usina Fotovoltaica (beta)", "Antrópico", "#9932cc"),
       ("Praia, Duna e Areal", "Natural", "#ffa07a"), ("Outras Áreas não Vegetadas", "Antrópico", "#db4d4f"),
       ("Rio, Lago e Oceano", "Água", "#2532e4"), ("Não observado", "Não observado", "#c8c8c8")]
COB_IDX = {n.lower(): i for i, (n, _, _) in enumerate(COB)}

# Texturas: nomes da planilha -> cor oficial da legenda na API da Plataforma MapBiomas
# (/legends do subtema soil_textural_*; mesma ordem de pixelValue)
TEX = {
    "grupo": [("Muito Argilosa", "#a83800"), ("Argilosa", "#aa8686"), ("Média", "#d7c5a5"),
              ("Siltosa", "#b5d6ae"), ("Arenosa", "#fffe73"), ("Fragmentos de Rocha", "#707070"),
              ("Não Observado", "#e3e3e3")],
    "subgrupo": [("Muito Argilosa", "#a83800"), ("Argilosa", "#aa8686"), ("Média-argilosa", "#f4a582"),
                 ("Siltosa", "#298289"), ("Média-siltosa", "#d7c5a5"), ("Média-arenosa", "#f8d488"),
                 ("Arenosa-média", "#e4b074"), ("Muito Arenosa", "#fffe73"), ("Fragmentos de Rocha", "#707070"),
                 ("Não Observado", "#e3e3e3")],
    "classe": [("Muito Argilosa", "#a83800"), ("Argilosa", "#aa8686"), ("Argila Siltosa", "#3481a7"),
               ("Franco Argilosa", "#e9a9a9"), ("Franco Argilo Siltosa", "#80b1d3"), ("Argilo Arenosa", "#c994c7"),
               ("Franco Areno Argilosa", "#f4a582"), ("Franca", "#d7c5a5"), ("Silte", "#298289"),
               ("Areia Franca", "#e4b074"), ("Areia", "#fffe73"), ("Fragmentos de Rocha", "#707070"),
               ("Não Observado", "#e3e3e3")],
}
ARQ030 = {"grupo": "grupo_textural_0_30-area_cos_cobertura_allYears.csv",
          "subgrupo": "subgrupo_textural_0_30-area_cos_cobertura_allYears.csv",
          "classe": "classe_textural_0_30-area_cos_cobertura_allYears.csv"}
ARQCAM = {"grupo": "grupo_textural_allDepths-area_cos_85_24.csv",
          "subgrupo": "subgrupo_textural_allDephts-area_cos_85_24.csv",
          "classe": "classe_textural_allDepths-area_cos_85_24.csv"}
PED = ["0–10 cm", "10–20 cm", "20–30 cm", "30–40 cm", "40–50 cm", "50–60 cm", "60–70 cm",
       "70–80 cm", "80–90 cm", "90–100 cm", "100cm"]

regioes = []  # [bioma_idx, "UF"]


def reg(bioma, uf):
    k = [BIOMAS.index(bioma), uf]
    if k not in regioes:
        regioes.append(k)
    return regioes.index(k)


def ano(s):
    return s.astype(str).str.replace(",", "").str.replace(".", "").astype(int)


def r(x):
    return int(round(x))


def ler030(arq):
    d = pd.read_csv(SRC / arq)
    d.columns = ["area", "cos", "tex", "bioma", "uf", "n0", "n1", "n2", "n3", "ano"]
    d["ano"] = ano(d["ano"])
    d["uf"] = d["uf"].map(UF_SIGLA)
    assert d["uf"].notna().all()
    return d


# ---- COS por cobertura x ano (aba do grupo textural, a mesma do painel oficial) ----
d = ler030(ARQ030["grupo"])
d["cob"] = d["n2"].str.lower().map(COB_IDX)
assert d["cob"].notna().all(), d.loc[d["cob"].isna(), "n2"].unique()
cob = {}
for (b, u, c, a), g in d.groupby(["bioma", "uf", "cob", "ano"])[["area", "cos"]].sum().iterrows():
    k = f"{reg(b, u)}|{int(c)}"
    v = cob.setdefault(k, [0] * 80)
    v[a - 1985] = r(g.area)
    v[40 + a - 1985] = r(g.cos)

# ---- COS por cobertura nos níveis 0 a 3 da legenda (colunas "cobertura n0".."n3" da planilha) ----
# Cores: legendas oficiais da Plataforma MapBiomas ("Natural x Antrópico" e "Coverage").
COB_NIVEIS = {
    "0": [("Natural", "#66bb6a"), ("Antrópico", "#ffe082"), ("Corpo D'água", "#2532e4"), ("Não observado", "#c8c8c8")],
    "1": [("Floresta", "#1f8d49"), ("Vegetação Herbácea e Arbustiva", "#d6bc74"), ("Agropecuária", "#ffefc3"),
          ("Área não Vegetada", "#d4271e"), ("Corpo D'água", "#2532e4"), ("Não observado", "#c8c8c8")],
    "2": [(n, c) for n, _, c in COB],
    "3": [(n, c) for n, _, c in COB if n != "Agricultura"][:11]
         + [("Lavoura Temporária", "#c27ba0"), ("Lavoura Perene", "#d082de")]
         + [(n, c) for n, _, c in COB if n != "Agricultura"][11:],
}
cobn = {}
for nivel, classes in COB_NIVEIS.items():
    idx_n = {n.lower(): i for i, (n, _) in enumerate(classes)}
    col = d["n" + nivel].str.lower().map(idx_n)
    assert col.notna().all(), (nivel, d.loc[col.isna(), "n" + nivel].unique())
    t = {}
    for (b, u, c, a), g in d.assign(cn=col).groupby(["bioma", "uf", "cn", "ano"])[["area", "cos"]].sum().iterrows():
        v = t.setdefault(f"{reg(b, u)}|{int(c)}", [0] * 80)
        v[a - 1985] = r(g.area)
        v[40 + a - 1985] = r(g.cos)
    cobn[nivel] = {"classes": [{"nome": n, "cor": c} for n, c in classes], "dados": t}

# ---- COS por textura 0-30 cm x ano ----
tex = {}
for nivel, arq in ARQ030.items():
    d = ler030(arq)
    nomes = [n for n, _ in TEX[nivel]]
    d["tex"] = d["tex"].str.strip().str.lower().map({n.lower(): n for n in nomes})
    assert d.tex.notna().all()
    t = {}
    for (b, u, x, a), g in d.groupby(["bioma", "uf", "tex", "ano"])[["area", "cos"]].sum().iterrows():
        k = f"{reg(b, u)}|{nomes.index(x)}"
        v = t.setdefault(k, [0] * 80)
        v[a - 1985] = r(g.area)
        v[40 + a - 1985] = r(g.cos)
    tex[nivel] = t

# ---- Textura por camada (1985 e 2024); COS é sempre o de 0-30 cm do pixel ----
cam = {}
for nivel, arq in ARQCAM.items():
    d = pd.read_csv(SRC / arq)
    d["Ano"] = ano(d["Ano"])
    d["UF"] = d["UF"].map(UF_SIGLA)
    nomes = [n for n, _ in TEX[nivel]]
    t = {}
    for ci, c in enumerate(CAMADAS):
        low = {n.lower(): n for n in nomes}
        # a aba por camadas usa outra grafia para duas classes
        low.update({"franco argilo arenosa": "Franco Areno Argilosa", "argilo siltosa": "Argila Siltosa"})
        d["x"] = d[c].str.split(" | ", regex=False).str[0].str.strip().str.lower().map(low)
        bad = set(d.loc[d.x.isna(), c].unique())
        assert not bad, (nivel, c, bad)
        for (b, u, a, x), g in d.groupby(["Bioma", "UF", "Ano", "x"])[["Área ha", "Toneladas de COS"]].sum().iterrows():
            k = f"{reg(b, u)}|{ci}|{nomes.index(x)}"
            v = t.setdefault(k, [0, 0, 0, 0])
            j = 0 if a == 1985 else 1
            v[j] = r(g["Área ha"])
            v[2 + j] = r(g["Toneladas de COS"])
    cam[nivel] = t

# ---- Pedregosidade (2024): profundidade em que fragmentos grossos passam de 50% / 90% ----
ped = {}
municipios = {}
for chave, arq, col in [("dominante", "pedregosidade_dominante-cos_24.csv", "pedregosidade dominante"),
                        ("extrema", "pedregosidade_extrema-cos_24.csv", "pedregosidade extrema")]:
    d = pd.read_csv(SRC / arq)
    bad = set(d[col].unique()) - set(PED)
    assert not bad, bad
    t = {}
    for (b, u, x), g in d.groupby(["Bioma", "UF", col])[["Área ha", "Toneladas de COS"]].sum().iterrows():
        t[f"{reg(b, u)}|{PED.index(x)}"] = [r(g["Área ha"]), r(g["Toneladas de COS"])]
    ped[chave] = t
    # municípios: só a área em que o limiar é atingido antes de 100 cm
    m = d[d[col] != "100cm"].groupby(["Bioma", "UF", "Município"])[["Área ha", "Toneladas de COS"]].sum()
    for (b, u, mun), g in m.iterrows():
        e = municipios.setdefault(f"{reg(b, u)}|{mun}", [0, 0, 0, 0])
        j = 0 if chave == "dominante" else 2
        e[j] = r(g["Área ha"])
        e[j + 1] = r(g["Toneladas de COS"])

# ---- Granulometria (GEE) ----
gran = {}
gp = AQUI.parent / "dados" / "granulometria_bioma_uf.json"
if gp.exists():
    for g in json.loads(gp.read_text(encoding="utf-8")):
        if g["bioma"] not in BIOMAS:
            continue
        k = reg(g["bioma"], g["uf"])
        gran[str(k)] = [[r(c["area_ha"]), r(c["clay_soma"]), r(c["silt_soma"]), r(c["sand_soma"])]
                        for _, c in sorted(g["camadas"].items())]

dados = {
    "fonte": "Planilha 'estatisticas - MBSOLO3' (MapBiomas Solo, Coleção 3 beta; cobertura Coleção 10)",
    "biomas": BIOMAS, "ufs": UF_NOME, "anos": ANOS, "regioes": regioes,
    "cobertura": [{"nome": n, "grupo": g, "cor": c} for n, g, c in COB],
    "texturas": {k: [{"nome": n, "cor": c} for n, c in v] for k, v in TEX.items()},
    "camadas": ["0–10 cm", "0–20 cm", "0–30 cm", "20–40 cm", "30–60 cm", "60–100 cm"],
    "pedregosidade_faixas": PED,
    # o nível 2 de cobn substitui o antigo "cob"
    "cobn": cobn, "tex": tex, "cam": cam, "ped": ped, "mun": municipios, "gran": gran,
}
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("regiões", len(regioes), "| tamanho", round(OUT.stat().st_size / 1e6, 2), "MB | granulometria", len(gran))
