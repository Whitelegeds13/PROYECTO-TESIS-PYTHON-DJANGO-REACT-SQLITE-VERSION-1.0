import ast
import re
from pathlib import Path


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _extract_django_models(models_py: str):
    tree = ast.parse(models_py)
    models = {}
    relations = []
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        class_name = node.name
        fields = []
        for stmt in node.body:
            if not isinstance(stmt, ast.Assign) or len(stmt.targets) != 1:
                continue
            target = stmt.targets[0]
            if not isinstance(target, ast.Name):
                continue
            field_name = target.id
            value = stmt.value
            if not isinstance(value, ast.Call):
                continue
            func = value.func
            func_name = None
            if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name) and func.value.id == "models":
                func_name = func.attr
            if not func_name:
                continue
            field_type = func_name

            if func_name == "ForeignKey" and value.args:
                fk_to = None
                arg0 = value.args[0]
                if isinstance(arg0, ast.Name):
                    fk_to = arg0.id
                elif isinstance(arg0, ast.Attribute):
                    fk_to = arg0.attr
                if fk_to:
                    relations.append((class_name, field_name, fk_to))
                    field_type = f"FK {fk_to}"

            fields.append((field_name, field_type))
        if fields:
            models[class_name] = fields
    return models, relations


def _extract_django_urls(py: str):
    paths = []
    for m in re.finditer(r"path\(\s*['\"]([^'\"]+)['\"]", py):
        paths.append(m.group(1))
    return paths


def _extract_react_routes(app_jsx: str):
    routes = []
    for m in re.finditer(r"<Route[^>]*\spath=['\"]([^'\"]+)['\"]", app_jsx):
        routes.append(m.group(1))
    return routes


def _extract_api_calls(client_js: str):
    calls = []
    for m in re.finditer(r"fetchJson\(\s*['\"]([^'\"]+)['\"]", client_js):
        calls.append(m.group(1))
    return sorted(set(calls))


def build_markdown(repo_root: Path) -> str:
    models_path = repo_root / "backend" / "store" / "models.py"
    store_urls_path = repo_root / "backend" / "store" / "urls.py"
    config_urls_path = repo_root / "backend" / "config" / "urls.py"
    app_path = repo_root / "frontend" / "src" / "App.jsx"
    client_path = repo_root / "frontend" / "src" / "api" / "client.js"

    models_text = _read_text(models_path) if models_path.exists() else ""
    store_urls_text = _read_text(store_urls_path) if store_urls_path.exists() else ""
    config_urls_text = _read_text(config_urls_path) if config_urls_path.exists() else ""
    app_text = _read_text(app_path) if app_path.exists() else ""
    client_text = _read_text(client_path) if client_path.exists() else ""

    models, relations = _extract_django_models(models_text)
    store_paths = _extract_django_urls(store_urls_text)
    config_paths = _extract_django_urls(config_urls_text)
    react_routes = _extract_react_routes(app_text)
    api_calls = _extract_api_calls(client_text)

    er_lines = ["```mermaid", "erDiagram"]
    for model_name, fields in models.items():
        er_lines.append(f"  {model_name} {{")
        for field_name, field_type in fields:
            simple_type = (
                field_type.replace("CharField", "string")
                .replace("TextField", "text")
                .replace("BooleanField", "bool")
                .replace("DecimalField", "decimal")
                .replace("PositiveIntegerField", "int")
                .replace("SlugField", "string")
                .replace("IntegerField", "int")
            )
            er_lines.append(f"    {simple_type} {field_name}")
        er_lines.append("  }")
    for src, field, dst in relations:
        er_lines.append(f"  {dst} ||--o{{ {src} : {field}")
    er_lines.append("```")

    api_lines = ["```mermaid", "flowchart LR"]
    api_lines.append("  FE[Frontend (Vite/React)] -->|/api/* proxy| BE[Backend (Django/DRF)]")
    api_lines.append("  BE --> DB[(MongoDB Atlas)]")
    api_lines.append("  subgraph API[API Endpoints]")
    all_api = sorted(set([p for p in config_paths if p.startswith("api/")] + store_paths))
    for p in all_api:
        if p.startswith("api/"):
            ep = "/" + p
        else:
            ep = "/api/" + p
        safe = re.sub(r"[^a-zA-Z0-9_]", "_", ep).strip("_") or "ep"
        api_lines.append(f"    {safe}[\"{ep}\"]")
    api_lines.append("  end")
    api_lines.append("```")

    routes_lines = ["```mermaid", "flowchart TB"]
    routes_lines.append("  R[Router] --> H[/ /]")
    for r in react_routes:
        if r == "/":
            continue
        safe = re.sub(r"[^a-zA-Z0-9_]", "_", r).strip("_") or "route"
        routes_lines.append(f"  R --> {safe}[\"{r}\"]")
    routes_lines.append("```")

    seq_lines = ["```mermaid", "sequenceDiagram"]
    seq_lines.append("  participant U as Usuario")
    seq_lines.append("  participant FE as Frontend")
    seq_lines.append("  participant BE as Backend (DRF)")
    seq_lines.append("  participant DB as MongoDB Atlas")
    seq_lines.append("  U->>FE: Crear cuenta")
    seq_lines.append("  FE->>BE: POST /api/auth/register/")
    seq_lines.append("  BE->>DB: Crear User")
    seq_lines.append("  DB-->>BE: OK")
    seq_lines.append("  BE-->>FE: 201 Created")
    seq_lines.append("  U->>FE: Iniciar sesión")
    seq_lines.append("  FE->>BE: POST /api/token/")
    seq_lines.append("  BE-->>FE: access + refresh")
    seq_lines.append("  FE->>BE: GET /api/auth/me/ (Bearer access)")
    seq_lines.append("  BE-->>FE: usuario")
    seq_lines.append("```")

    calls_lines = ["```mermaid", "flowchart LR"]
    calls_lines.append("  FE[Frontend] --> C[api/client.js]")
    for c in api_calls:
        safe = re.sub(r"[^a-zA-Z0-9_]", "_", c).strip("_") or "call"
        calls_lines.append(f"  C --> {safe}[\"{c}\"]")
    calls_lines.append("```")

    return "\n".join(
        [
            "# Diagramas (Mermaid) - Palacio Gamer",
            "",
            "Este archivo se genera automáticamente.",
            "",
            "## ERD (MongoDB / Django Models)",
            *er_lines,
            "",
            "## Arquitectura (Frontend → Backend → DB)",
            *api_lines,
            "",
            "## Rutas (React Router)",
            *routes_lines,
            "",
            "## Auth (Registro + JWT + Me)",
            *seq_lines,
            "",
            "## Consumo de API (frontend/src/api/client.js)",
            *calls_lines,
            "",
        ]
    )


def main():
    repo_root = Path(__file__).resolve().parents[1]
    out_dir = repo_root / "diagrams"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "palacio-gamer.mermaid.md"
    out_file.write_text(build_markdown(repo_root), encoding="utf-8")
    print(str(out_file))


if __name__ == "__main__":
    main()

