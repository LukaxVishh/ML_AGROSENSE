"""Utilitários compartilhados pelas rotas da API."""

from __future__ import annotations

from typing import Any

from flask import current_app, request
from werkzeug.exceptions import BadRequest

from app.errors import ApiError
from app.services import ModelRegistry


def get_registry() -> ModelRegistry:
    """Recupera o registro da aplicação ativa, sem estado global de módulo."""
    return current_app.extensions["agrosense_registry"]


def require_json_object() -> dict[str, Any]:
    """Garante corpo JSON de objeto antes de qualquer leitura de campo."""
    if not request.is_json:
        raise ApiError(
            415,
            "tipo_de_conteudo_invalido",
            "A requisição deve usar Content-Type application/json.",
        )
    try:
        value = request.get_json()
    except BadRequest as exc:
        raise ApiError(400, "json_malformado", "O corpo contém JSON malformado.") from exc
    if not isinstance(value, dict):
        raise ApiError(400, "json_invalido", "O corpo JSON deve ser um objeto.")
    return value


def require_exact_keys(value: dict[str, Any], expected: set[str], description: str) -> None:
    """Rejeita campos ausentes e também extras.

    A igualdade estrita evita que um cliente desatualizado envie chaves que a API
    ignoraria em silêncio, divergindo do contrato sem nenhum sinal de erro.
    """
    if set(value) != expected:
        raise ApiError(
            422,
            "schema_invalido",
            f"{description} deve conter exatamente: {', '.join(sorted(expected))}.",
        )
