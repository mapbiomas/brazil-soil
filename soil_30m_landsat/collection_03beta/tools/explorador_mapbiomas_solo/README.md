# Explorador do MapBiomas Solo · Coleção 3

Página estática para explorar todos os produtos da Coleção 3 (beta) do MapBiomas Solo por bioma, estado e ano:
carbono orgânico do solo (COS 0–30 cm, 1985–2024), textura (grupo, subgrupo e classe em 0–30 cm e em seis camadas até 100 cm),
granulometria (argila, silte e areia) e pedregosidade (dominante >50% e extrema >90%), além de uma fábrica de GIFs com os mapas oficiais da Plataforma MapBiomas.

Fontes: API pública da Plataforma MapBiomas (áreas por classe), planilha oficial "estatisticas - MBSOLO3" (massa de COS e cruzamentos com cobertura, textura e municípios) e Google Earth Engine (teores médios de granulometria).

Página publicada: https://mapbiomas.github.io/brazil-soil/soil_30m_landsat/collection_03beta/tools/explorador_mapbiomas_solo/
(o workflow `.github/workflows/pages.yml` publica as pastas `tools/` a cada push na `main`).

## Pastas

- `app/index.html` – página completa, para GitHub Pages (gerada a partir de `pagina.html`).
- `app/pagina.html` – a mesma página no formato do artefato do Claude (sem `<html>`/`<head>`).
- `app/dados.json` – somas de área (ha) e COS (t) por bioma × UF; a página soma o recorte e só depois divide.
- `scripts/agregar_planilha.py` – lê os CSVs da planilha oficial "estatisticas - MBSOLO3" e gera `dados.json`.
- `scripts/baixar_api_mapbiomas.py` – estatísticas de área por classe de todos os produtos na API pública da Plataforma MapBiomas → `app/dados_api.json`.
- `scripts/granulometria_gee.py` – teores médios de argila, silte e areia por bioma × UF no Google Earth Engine (nem a API nem a planilha trazem médias).
- `app/fabrica/` – módulo da Fábrica de factsheets (`fabrica.js` expõe `window.FabricaSolo`; `fabrica.css` com prefixo `fs-`), com os gráficos e mapas do factsheet oficial do Solo Col. 3; dados em `app/dados_fabrica.json`.
- `scripts/montar_index.py` – embute o módulo da fábrica em `pagina.html` (o artefato do Claude só aceita scripts de CDNs) e gera `index.html`.

## Atualizar

```
python scripts/granulometria_gee.py   # só se a granulometria mudar
python scripts/baixar_api_mapbiomas.py   # estatísticas de área da API da Plataforma (demora: tarefas assíncronas)
python scripts/agregar_planilha.py <pasta com os CSVs das abas da planilha>
python scripts/montar_index.py
```

Para ver localmente: `python -m http.server --directory app` e abra http://localhost:8000 (o `fetch` de `dados.json` não funciona abrindo o arquivo direto do disco).

## Conferência

Brasil 2024: 37,51 Gt de COS em 850,9 Mha (44,1 t/ha), igual ao painel oficial. Cerrado 2024: 7,90 Gt, 198,45 Mha, 39,8 t/ha.
