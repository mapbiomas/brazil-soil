"""Gera app/index.html (documento completo, para o GitHub Pages) a partir de app/pagina.html (versão do artefato)."""
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"
corpo = (APP / "pagina.html").read_text(encoding="utf-8")
html = ('<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + corpo.replace("<style>", "<style>\n:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }\n[hidden] { display: none !important; }", 1)
        .replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1)
        + "\n</body>\n</html>\n")
(APP / "index.html").write_text(html, encoding="utf-8")
print("index.html gerado")
