#!/usr/bin/env python3
"""
Coleta estatísticas de linguagens do projeto Pasta de Músicas.

Gera scripts/relatorio/dados.json com:
  - stats: linhas/arquivos por linguagem
  - areas:  linhas/arquivos por diretório ou arquivo avulso
  - top:    arquivos com maior número de linhas

Uso:  python3 scripts/relatorio/coleta-linguagens.py
"""

import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "scripts", "relatorio", "dados.json")

# dependências, artefatos gerados e estado local (tudo fora do versionamento)
EXCLUDE_DIRS = {"node_modules", ".next", ".git", ".turbo", ".vercel", ".firebase", ".data"}
EXCLUDE_FILES = {"package-lock.json", "tsconfig.tsbuildinfo"}
# worker do pdf.js copiado pelo postinstall (artefato de terceiros)
EXCLUDE_PATHS = (os.path.join("scripts", "relatorio"), os.path.join("public", "pdf"))

EXT_MAP = {
    ".tsx": "TypeScript / JSX",
    ".ts": "TypeScript",
    ".mjs": "JavaScript (ESM)",
    ".cjs": "JavaScript (CommonJS)",
    ".js": "JavaScript",
    ".css": "CSS",
    ".sql": "SQL",
    ".sh": "Shell",
    ".svg": "SVG / XML",
    ".md": "Markdown",
    ".json": "JSON",
    ".rules": "Firestore Rules",
    ".webmanifest": "Web App Manifest",
    ".yml": "YAML",
    ".yaml": "YAML",
}


def count_lines(path):
    with open(path, "rb") as fh:
        data = fh.read()
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def area_of(rel_path):
    parts = rel_path.split(os.sep)
    if parts[0] == "src" and len(parts) >= 3:
        if parts[1] == "components":
            return "/".join(parts[:3])
        if parts[1] == "app":
            return "/".join(parts[:3])
    return "/".join(parts[:2]) if len(parts) >= 2 else parts[0]


def collect_backend():
    """Inventário do backend: camadas de runtime e scripts de operação."""
    camadas = {}

    def add(nome, caminho, extensoes=(".ts", ".tsx", ".mjs", ".js")):
        files = 0
        lines = 0
        if os.path.isfile(caminho):
            files, lines = 1, count_lines(caminho)
        else:
            for dirpath, dirnames, filenames in os.walk(caminho):
                dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
                for name in filenames:
                    if os.path.splitext(name)[1] not in extensoes:
                        continue
                    full = os.path.join(dirpath, name)
                    rel = os.path.relpath(full, ROOT)
                    if any(rel.startswith(p + os.sep) for p in EXCLUDE_PATHS):
                        continue
                    files += 1
                    lines += count_lines(full)
        if files:
            camadas[nome] = {"caminho": caminho, "arquivos": files, "linhas": lines}

    add("Route handlers (API)", os.path.join(ROOT, "src", "app", "api"))
    add("Camada de repositório", os.path.join(ROOT, "src", "lib", "repositorio"))
    add("Firebase (admin, contas, diagnóstico)", os.path.join(ROOT, "src", "lib", "firebase"))
    add("Sessão e papéis", os.path.join(ROOT, "src", "lib", "sessao.ts"))
    add("Scripts de operação", os.path.join(ROOT, "scripts"))
    return camadas


def main():
    stats = {}
    areas = {}
    top = []

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            if name in EXCLUDE_FILES:
                continue
            ext = os.path.splitext(name)[1]
            if ext not in EXT_MAP:
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ROOT)
            if any(rel.startswith(p + os.sep) for p in EXCLUDE_PATHS):
                continue
            try:
                lines = count_lines(full)
                size = os.path.getsize(full)
            except OSError:
                continue

            lang = EXT_MAP[ext]
            entry = stats.setdefault(lang, {"files": 0, "lines": 0, "bytes": 0})
            entry["files"] += 1
            entry["lines"] += lines
            entry["bytes"] += size

            area = area_of(rel)
            aentry = areas.setdefault(area, {"files": 0, "lines": 0})
            aentry["files"] += 1
            aentry["lines"] += lines

            top.append([rel, lang, lines, size])

    top.sort(key=lambda f: -f[2])
    backend = collect_backend()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"stats": stats, "areas": areas, "top": top[:40], "backend": backend},
                  fh, indent=1, ensure_ascii=False)

    total_lines = sum(v["lines"] for v in stats.values())
    total_files = sum(v["files"] for v in stats.values())
    print(f"dados.json gerado em {OUT}")
    print(f"{total_files} arquivos · {total_lines} linhas")
    for lang, v in sorted(stats.items(), key=lambda kv: -kv[1]["lines"]):
        print(f"  {lang:26} {v['files']:3} arquivos  {v['lines']:6} linhas")
    print("backend:")
    for nome, v in backend.items():
        print(f"  {nome:38} {v['arquivos']:3} arquivos  {v['linhas']:6} linhas")


if __name__ == "__main__":
    sys.exit(main())
