"""Monta a página do explorador.

1. Embute o módulo da fábrica de factsheets (app/fabrica/fabrica.css e fabrica.js) em app/pagina.html,
   entre os marcadores FABRICA_CSS_INICIO/FIM e FABRICA_JS_INICIO/FIM. O artefato do Claude só aceita
   scripts de CDNs, então o módulo precisa estar inline.
2. Gera app/index.html (documento completo, para o GitHub Pages) a partir de app/pagina.html.
"""
import re
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"


def embutir(texto, marca, conteudo):
    padrao = re.compile(r"(/\* " + marca + r"_INICIO \*/\n).*?(/\* " + marca + r"_FIM \*/)", re.S)
    assert padrao.search(texto), f"marcador {marca} não encontrado"
    return padrao.sub(lambda m: m.group(1) + conteudo.rstrip() + "\n" + m.group(2), texto)


pagina = APP / "pagina.html"
corpo = pagina.read_text(encoding="utf-8")
fab = APP / "fabrica"
if (fab / "fabrica.js").exists():
    js = (fab / "fabrica.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
    corpo = embutir(corpo, "FABRICA_CSS", (fab / "fabrica.css").read_text(encoding="utf-8"))
    corpo = embutir(corpo, "FABRICA_JS", js)
    pagina.write_text(corpo, encoding="utf-8")
    print("módulo da fábrica embutido")

html = ('<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + corpo.replace("<style>", "<style>\n:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }\n[hidden] { display: none !important; }", 1)
        .replace('<header class="topbar">', '</head>\n<body>\n<header class="topbar">', 1)
        + "\n</body>\n</html>\n")
(APP / "index.html").write_text(html, encoding="utf-8")
print("index.html gerado")
