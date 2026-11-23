"""Estatísticas de área do MapBiomas Solo Col. 3 pela API pública da Plataforma MapBiomas.

A API devolve ÁREA (ha) por classe da legenda oficial de cada produto:
  - COS: área por faixa de estoque (0-10 ... >80 t/ha), 1985-2024
  - argila, silte, areia: área por faixa de teor (0-10% ... 90-100%), 10 camadas de 10 cm
  - grupo, subgrupo e classe textural: área por classe, 6 camadas
  - pedregosidade: área pela profundidade em que o limiar (50% ou 90%) é atingido
Massa de COS (t) não existe na API: vem da planilha (agregar_planilha.py).

Territórios: Brasil, 6 biomas, 27 UFs e as interseções bioma x UF (spatialMethod=intersection).
Cada pedido vira uma tarefa assíncrona no servidor; o script dispara tudo, depois repete o
pedido até o resultado vir do cache. Retomável: o que já está em ../dados/api_cache.json é pulado.

Uso: python baixar_api_mapbiomas.py [--sem-intersecoes]
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

B = "https://plataforma.mapbiomas.org/api/v1/brazil"
AQUI = Path(__file__).resolve().parent
CACHE = AQUI.parent / "dados" / "api_cache.json"
OUT = AQUI.parent / "app" / "dados_api.json"
BIOMAS = ["Amazônia", "Caatinga", "Cerrado", "Mata Atlântica", "Pampa", "Pantanal"]
SIGLA = {"Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA", "Ceará": "CE",
         "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT",
         "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
         "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
         "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP",
         "Sergipe": "SE", "Tocantins": "TO"}
D10 = ["000_010", "010_020", "020_030", "030_040", "040_050", "050_060", "060_070", "070_080", "080_090", "090_100"]
D6 = ["000_010", "000_020", "000_030", "020_040", "030_060", "060_100"]
PRODUTOS = {  # chave: (subtema, propriedade, valores da propriedade)
    "cos": ("soil_soil_organic_carbon_stock", None, None),
    "argila": ("soil_clay_fraction", "depth", D10),
    "silte": ("soil_silt_fraction", "depth", D10),
    "areia": ("soil_sand_fraction", "depth", D10),
    "grupo": ("soil_textural_group", "depth", D6),
    "subgrupo": ("soil_textural_subgroup", "depth", D6),
    "classe": ("soil_textural_class", "depth", D6),
    "pedregosidade": ("soil_stoniness", "volume", ["50", "90"]),
}


def get(path, **q):
    q.setdefault("tenantId", "mapbiomas")
    url = f"{B}{path}?{urllib.parse.urlencode(q, doseq=True)}"
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - erros passageiros do servidor
            erro = e
            time.sleep(5 * (tentativa + 1))
    raise erro


def legenda(sub):
    lid = get("/legends", page=1, pageSize=100, subthemeKey=sub)["legends"][0]["id"]
    d = get(f"/legends/{lid}")["legend"]
    return {"key": d["key"], "items": [{"v": i["pixelValue"], "nome": i["name"]["pt-BR"], "cor": i["color"]} for i in d["items"]]}


def territorios(intersecoes):
    br = get("/territories", page=1, pageSize=10, categoryId=213)["territories"][0]["id"]
    bi = {t["name"]["pt-BR"] if isinstance(t["name"], dict) else t["name"]: t["id"]
          for t in get("/territories", page=1, pageSize=100, categoryId=4)["territories"]}
    uf = {SIGLA[t["name"]["pt-BR"] if isinstance(t["name"], dict) else t["name"]]: t["id"]
          for t in get("/territories", page=1, pageSize=100, categoryId=214)["territories"]}
    ts = {"BR": ([br], "union")}
    ts.update({f"b{BIOMAS.index(n)}": ([i], "union") for n, i in bi.items()})
    ts.update({f"u{s}": ([i], "union") for s, i in uf.items()})
    if intersecoes:
        regioes = json.loads((AQUI.parent / "app" / "dados.json").read_text(encoding="utf-8"))["regioes"]
        for b, s in regioes:
            ts[f"b{b}_{s}"] = ([uf[s], bi[BIOMAS[b]]], "intersection")
    return ts


def main():
    intersecoes = "--sem-intersecoes" not in sys.argv
    leg = {k: legenda(sub) for k, (sub, _, _) in PRODUTOS.items()}
    ts = territorios(intersecoes)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    pedidos = []
    for tk, (ids, metodo) in ts.items():
        for pk, (sub, prop, vals) in PRODUTOS.items():
            for v in (vals or [None]):
                chave = f"{tk}|{pk}|{v or ''}"
                if chave in cache:
                    continue
                q = dict(region="brazil", spatialMethod=metodo, territoryId=ids, subthemeKey=sub,
                         legendKey=leg[pk]["key"], pixelValue=[i["v"] for i in leg[pk]["items"]])
                if prop:
                    q[prop] = v
                else:
                    q["year"] = list(range(1985, 2025))
                pedidos.append((chave, q))
    print(f"{len(ts)} territórios, {len(pedidos)} pedidos pendentes", flush=True)

    def tentar(p):
        chave, q = p
        try:
            r = get("/statistics/area", **q)
        except Exception as e:  # noqa: BLE001
            return chave, None, str(e)[:120]
        return chave, r if isinstance(r.get("statistic"), list) else None, None

    rodada = 0
    while pedidos:
        rodada += 1
        with ThreadPoolExecutor(12) as ex:
            res = list(ex.map(tentar, pedidos))
        faltam = []
        for (chave, q), (_, r, err) in zip(pedidos, res):
            if r is None:
                faltam.append((chave, q))
            else:
                cache[chave] = {"area": r.get("territoryAreaHa"),
                                "stat": [{"ano": (s.get("year") or [None])[0], "total": s.get("total"),
                                          "itens": {str(i["pixelValue"]): i["value"] for i in s["items"]}}
                                         for s in r["statistic"]]}
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        print(f"rodada {rodada}: {len(pedidos) - len(faltam)} prontos, {len(faltam)} calculando", flush=True)
        pedidos = faltam
        if pedidos:
            time.sleep(30)

    # saída compacta para a página: área (ha) inteira por classe
    out = {"fonte": "API pública da Plataforma MapBiomas (plataforma.mapbiomas.org/api/v1/brazil/statistics/area)",
           "baixado_em": time.strftime("%Y-%m-%d"), "legendas": leg, "territorios": sorted(ts), "dados": {}}
    for chave, v in cache.items():
        tk, pk, val = chave.split("|")
        if tk not in ts:
            continue
        o = out["dados"].setdefault(tk, {}).setdefault(pk, {})
        ordem = [str(i["v"]) for i in leg[pk]["items"]]
        if pk == "cos":
            o["anos"] = {str(s["ano"]): [round(s["itens"].get(k, 0)) for k in ordem] for s in v["stat"]}
        else:
            o[val] = [round(v["stat"][0]["itens"].get(k, 0)) for k in ordem]
        out["dados"][tk]["area_territorio"] = round(v["area"] or 0)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("ok", OUT, round(OUT.stat().st_size / 1e6, 2), "MB", flush=True)


if __name__ == "__main__":
    main()
