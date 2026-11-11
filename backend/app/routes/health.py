"""Rota de prontidão e versão do contrato."""

from flask import Blueprint, jsonify

health_blueprint = Blueprint("health", __name__)


@health_blueprint.get("/health")
def health():
    return jsonify({"status": "ok", "contract_version": "1.0"})
