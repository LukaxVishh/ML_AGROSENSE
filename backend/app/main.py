"""Factory e ponto de entrada do servidor Flask AgroSense."""

from __future__ import annotations

from typing import Any

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

from app.errors import ApiError
from app.routes import register_routes
from app.services import ModelRegistry

LOCAL_FRONTEND_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]


def create_app(
    config: dict[str, Any] | None = None,
    *,
    registry: ModelRegistry | None = None,
) -> Flask:
    """Cria uma instância isolável da API, adequada ao servidor e aos testes."""
    app = Flask(__name__)
    app.config.from_mapping(
        # Folga de 64 kB sobre o limite de 2 MB do contrato: cabe o overhead do
        # multipart e a rota consegue emitir o próprio 413 com mensagem em português,
        # em vez de o Werkzeug cortar a requisição antes de chegar ao blueprint.
        MAX_CONTENT_LENGTH=(2 * 1024 * 1024) + (64 * 1024),
        LOAD_DEFAULT_DATASETS=True,
        LOAD_PRETRAINED_MODELS=True,
    )
    if config:
        app.config.update(config)
    # O contrato define a ordem dos campos nos envelopes; preservá-la facilita a leitura.
    app.json.sort_keys = False

    CORS(app, resources={r"/api/*": {"origins": LOCAL_FRONTEND_ORIGINS}})
    # Os testes injetam um registro próprio para isolar o estado entre casos.
    if registry is None:
        registry = ModelRegistry(
            examples_dir=app.config.get("EXAMPLES_DIR"),
            models_dir=app.config.get("MODELS_DIR"),
            load_default_datasets=app.config["LOAD_DEFAULT_DATASETS"],
            load_pretrained_models=app.config["LOAD_PRETRAINED_MODELS"],
        )
    app.extensions["agrosense_registry"] = registry

    register_routes(app)
    register_error_handlers(app)
    return app


def register_error_handlers(app: Flask) -> None:
    """Converte toda falha no envelope `{"erro": {...}}` esperado pelo front-end.

    O Flask escolhe sempre o tratador mais específico, então a ordem de declaração
    abaixo é apenas organizacional: `RequestEntityTooLarge` vence `HTTPException`,
    que por sua vez vence `Exception`.
    """

    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return jsonify(error.as_dict()), error.status

    # Arquivos acima de MAX_CONTENT_LENGTH são cortados pelo servidor antes da rota.
    @app.errorhandler(RequestEntityTooLarge)
    def handle_oversized_request(_error: RequestEntityTooLarge):
        error = ApiError(413, "arquivo_muito_grande", "O arquivo excede o limite de 2 MB.")
        return jsonify(error.as_dict()), error.status

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        api_error = ApiError(
            error.code or 500,
            "rota_nao_encontrada" if error.code == 404 else "requisicao_invalida",
            "Rota não encontrada." if error.code == 404 else "A requisição HTTP é inválida.",
        )
        return jsonify(api_error.as_dict()), api_error.status

    # Rede de segurança: o cliente recebe uma mensagem genérica e o traceback
    # fica apenas no log do servidor, conforme a seção 5 do contrato.
    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        app.logger.exception("Falha inesperada na API AgroSense.", exc_info=error)
        api_error = ApiError(
            500,
            "erro_interno",
            "O servidor não conseguiu concluir a operação.",
        )
        return jsonify(api_error.as_dict()), api_error.status


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=8000)
