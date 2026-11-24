"""Granulometria (argila, silte, areia, %) por bioma x UF e por camada de 10 cm (0-100 cm).

Único dado do explorador que não está na planilha 'estatisticas - MBSOLO3'.
Média ponderada pela área: soma(fração x área) / soma(área), só onde há solo mapeado
(máscara de cada camada). Escala de 300 m (as frações são contínuas; o efeito na média é pequeno).
Saída: ../dados/granulometria_bioma_uf.json
"""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import ee

ee.Initialize(project="mapbiomas-brazil")
ROOT = "projects/mapbiomas-public/assets/brazil/soil/collection3/mapbiomas_brazil_collection3_soil_"
CAMADAS = ["000_010", "010_020", "020_030", "030_040", "040_050",
           "050_060", "060_070", "070_080", "080_090", "090_100"]
FRAC = ["clay", "silt", "sand"]
UFS = ee.FeatureCollection("projects/ee-ipam/assets/IBGE/IBGE_BR_UF_2025")
BIOMAS = ee.FeatureCollection("projects/ee-ipam/assets/IBGE/limite_biomas_IBGE_2026")
NOME_BIOMA = {1: "Amazônia", 2: "Caatinga", 3: "Cerrado", 4: "Mata Atlântica", 5: "Pampa", 6: "Pantanal"}

bioma_img = ee.Image().int().paint(BIOMAS.map(lambda f: f.set("c", ee.Number.parse(f.get("CD_BIOMA")))), "c").rename("bioma")
area = ee.Image.pixelArea().divide(1e4)

bandas = []
for cam in CAMADAS:
    ref = None
    for fr in FRAC:
        img = ee.Image(ROOT + fr + "_fraction_v1/" + fr + "_fraction_" + cam + "_v1").select([0])
        bandas.append(img.multiply(area).rename(fr + "_" + cam))
        ref = img if ref is None else ref
    bandas.append(area.updateMask(ref.mask()).rename("area_" + cam))
img = ee.Image.cat(bandas).unmask(0).addBands(bioma_img)
NB = len(bandas)

ufs = UFS.toList(27)


def uma_uf(i):
    f = ee.Feature(ufs.get(i))
    sigla = f.get("SIGLA_UF").getInfo()
    erro = None
    for _ in range(3):
        try:
            g = img.reduceRegion(ee.Reducer.sum().repeat(NB).group(groupField=NB, groupName="bioma"),
                                 f.geometry(), 300, maxPixels=1e13, tileScale=4).get("groups").getInfo()
            return sigla, g
        except ee.EEException as e:
            erro = e
    raise erro


nomes = [b.getInfo() if False else None for b in []]
nomes = img.bandNames().getInfo()[:NB]
saida = []
with ThreadPoolExecutor(9) as ex:
    for sigla, grupos in ex.map(uma_uf, range(27)):
        for g in grupos:
            s = dict(zip(nomes, g["sum"]))
            reg = {"bioma": NOME_BIOMA[g["bioma"]], "uf": sigla, "camadas": {}}
            for cam in CAMADAS:
                a = s["area_" + cam]
                reg["camadas"][cam] = {"area_ha": a, **{fr: (s[fr + "_" + cam] / a if a else None) for fr in FRAC},
                                       **{fr + "_soma": s[fr + "_" + cam] for fr in FRAC}}
            saida.append(reg)
        print("UF", sigla, flush=True)
out = Path(__file__).resolve().parent.parent / "dados" / "granulometria_bioma_uf.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(saida, ensure_ascii=False), encoding="utf-8")
print("ok", len(saida))
