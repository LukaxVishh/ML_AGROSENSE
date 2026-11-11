"""Rotas de consulta e upload de bases agrícolas."""

from pathlib import PurePath

from flask import Blueprint, jsonify, request

from app.data import DataLoadError, DataSchemaError, DataValidationError, load_dataset
from app.errors import ApiError
from app.routes.common import get_registry
from app.services import DatasetNotFoundError

data_blueprint = Blueprint("data", __name__)
MAX_UPLOAD_BYTES = 2 * 1024 * 1024
SUPPORTED_EXTENSIONS = {"csv", "json", "xml"}


@data_blueprint.get("/data")
def get_data():
    """Devolve a base indicada ou, sem parâmetro, a base padrão da carga inicial."""
    dataset_id = request.args.get("dataset_id")
    if dataset_id is not None and not dataset_id.strip():
        raise ApiError(400, "dataset_id_invalido", "O dataset_id não pode ser vazio.")
    try:
        return jsonify(get_registry().get_dataset(dataset_id))
    except DatasetNotFoundError as exc:
        raise ApiError(404, "dataset_nao_encontrado", str(exc)) from exc


@data_blueprint.post("/upload")
def upload_data():
    """Lê, valida e publica uma base; qualquer falha preserva a base ativa anterior."""
    uploaded = request.files.get("file")
    if uploaded is None:
        raise ApiError(400, "arquivo_ausente", "Envie o arquivo no campo 'file'.")

    # O nome vem do cliente: reduzir ao nome-base descarta caminhos (inclusive do
    # Windows) e impede que um "../" chegue ao envelope registrado.
    raw_filename = (uploaded.filename or "").strip()
    filename = PurePath(raw_filename.replace("\\", "/")).name
    if not filename:
        raise ApiError(400, "nome_de_arquivo_invalido", "O arquivo deve possuir um nome válido.")

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in SUPPORTED_EXTENSIONS:
        raise ApiError(
            415,
            "formato_nao_suportado",
            "Formato de arquivo não suportado. Utilize CSV, JSON ou XML.",
        )

    # Ler um byte além do limite basta para detectar excesso sem carregar o arquivo
    # inteiro na memória quando ele já é grande demais.
    content = uploaded.stream.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise ApiError(413, "arquivo_muito_grande", "O arquivo excede o limite de 2 MB.")

    # Leitura (Dev 2): erro de tipo declarado é 422; arquivo ilegível é 400.
    try:
        dataframe = load_dataset(content, extension)
    except DataSchemaError as exc:
        raise ApiError(422, "schema_invalido", str(exc)) from exc
    except DataLoadError as exc:
        raise ApiError(400, "arquivo_malformado", str(exc)) from exc

    # Validação de esquema e limites físicos acontece dentro do registro, de modo que
    # a base só se torna a padrão depois de aprovada.
    try:
        envelope = get_registry().register_dataset(dataframe, filename, make_default=True)
    except DataValidationError as exc:
        raise ApiError(422, "schema_invalido", str(exc)) from exc
    return jsonify(envelope), 201
