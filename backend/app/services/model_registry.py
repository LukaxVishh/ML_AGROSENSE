"""Registro em memória de bases e artefatos treinados do AgroSense."""

from __future__ import annotations

from contextlib import contextmanager
from copy import deepcopy
from dataclasses import dataclass
import logging
from pathlib import Path
from threading import RLock
from typing import Any, Iterator

import pandas as pd

from app.data import create_dataset_envelope, load_dataset, validate_dataset
from app.ml.classification import ClassificationArtifact, load_classification
from app.ml.regression import RegressionArtifact, load_regression

LOGGER = logging.getLogger(__name__)
DEFAULT_DATASET_FILENAME = "safra_mista_sul.csv"


class DatasetNotFoundError(LookupError):
    """A base solicitada não existe no processo atual."""


class ModelNotFoundError(LookupError):
    """O artefato solicitado não existe no processo atual."""


class ModelConflictError(ValueError):
    """O artefato existe, mas não corresponde à tarefa ou base solicitada."""


class TrainingInProgressError(RuntimeError):
    """Já existe um treinamento para a mesma base e tarefa."""


@dataclass
class DatasetEntry:
    dataframe: pd.DataFrame
    envelope: dict[str, Any]


@dataclass(frozen=True)
class ModelEntry:
    artifact: RegressionArtifact | ClassificationArtifact
    task: str
    dataset_id: str


class ModelRegistry:
    """Mantém o estado volátil compartilhado por uma instância da aplicação.

    O registro só publica uma base ou modelo depois que a operação correspondente
    termina com sucesso. As cópias retornadas impedem que rotas alterem a base
    registrada acidentalmente.
    """

    def __init__(
        self,
        *,
        examples_dir: str | Path | None = None,
        models_dir: str | Path | None = None,
        load_default_datasets: bool = True,
        load_pretrained_models: bool = True,
    ) -> None:
        repository_root = Path(__file__).resolve().parents[3]
        self.examples_dir = Path(examples_dir) if examples_dir else repository_root / "data" / "examples"
        self.models_dir = Path(models_dir) if models_dir else Path(__file__).resolve().parents[1] / "models"
        self._datasets: dict[str, DatasetEntry] = {}
        self._models: dict[str, ModelEntry] = {}
        self._default_dataset_id: str | None = None
        self._active_trainings: set[tuple[str, str]] = set()
        self._lock = RLock()

        if load_default_datasets:
            self._load_example_datasets()
        if load_pretrained_models:
            self._load_pretrained_models()

    @property
    def default_dataset_id(self) -> str | None:
        with self._lock:
            return self._default_dataset_id

    @property
    def dataset_count(self) -> int:
        with self._lock:
            return len(self._datasets)

    @property
    def model_count(self) -> int:
        with self._lock:
            return len(self._models)

    def register_dataset(
        self,
        dataframe: pd.DataFrame,
        filename: str,
        *,
        make_default: bool = True,
    ) -> dict[str, Any]:
        """Valida e publica uma base; falhas não modificam o registro."""
        # Validar antes de tocar no dicionário: se `validate_dataset` levantar,
        # o registro e a base padrão continuam exatamente como estavam.
        validated = validate_dataset(dataframe)
        envelope = create_dataset_envelope(validated, filename)
        dataset_id = envelope["dataset_id"]
        entry = DatasetEntry(validated.copy(deep=True), deepcopy(envelope))
        with self._lock:
            self._datasets[dataset_id] = entry
            if make_default or self._default_dataset_id is None:
                self._default_dataset_id = dataset_id
        return deepcopy(envelope)

    def get_dataset(self, dataset_id: str | None = None) -> dict[str, Any]:
        """Retorna o envelope de uma base ou da base padrão."""
        with self._lock:
            selected_id = dataset_id or self._default_dataset_id
            if selected_id is None or selected_id not in self._datasets:
                raise DatasetNotFoundError("A base solicitada não foi encontrada.")
            return deepcopy(self._datasets[selected_id].envelope)

    def get_dataframe(self, dataset_id: str) -> pd.DataFrame:
        """Retorna uma cópia profunda da base usada no treinamento.

        A cópia é deliberada: os pipelines dos Devs 3 e 4 recebem liberdade para
        transformar o DataFrame sem contaminar a base registrada.
        """
        with self._lock:
            if dataset_id not in self._datasets:
                raise DatasetNotFoundError("A base solicitada não foi encontrada.")
            return self._datasets[dataset_id].dataframe.copy(deep=True)

    def register_model(
        self,
        artifact: RegressionArtifact | ClassificationArtifact,
        task: str,
    ) -> str:
        """Publica um artefato completo depois de um treinamento bem-sucedido.

        Guarda o artefato inteiro — pipeline ajustado, métricas e configuração —
        para que a inferência reaproveite exatamente o pré-processamento do treino.
        """
        model_id = artifact.result["model_id"]
        dataset_id = artifact.result["dataset_id"]
        entry = ModelEntry(artifact=artifact, task=task, dataset_id=dataset_id)
        with self._lock:
            self._models[model_id] = entry
        return model_id

    def resolve_model(self, model_id: str, *, task: str, dataset_id: str) -> ModelEntry:
        """Confere existência, tarefa e vínculo com a base antes da inferência."""
        with self._lock:
            entry = self._models.get(model_id)
            if entry is None:
                raise ModelNotFoundError(f"O modelo '{model_id}' não foi encontrado.")
            if entry.task != task:
                raise ModelConflictError(
                    f"O modelo '{model_id}' pertence à tarefa '{entry.task}', não à tarefa '{task}'."
                )
            if entry.dataset_id != dataset_id:
                raise ModelConflictError(f"O modelo '{model_id}' pertence a outra base de dados.")
            return entry

    @contextmanager
    def training_slot(self, dataset_id: str, task: str) -> Iterator[None]:
        """Impede dois treinos simultâneos sobre a mesma base e tarefa."""
        key = (dataset_id, task)
        with self._lock:
            if key in self._active_trainings:
                raise TrainingInProgressError(
                    "Já existe um treinamento em andamento para esta base e tarefa."
                )
            self._active_trainings.add(key)
        # O lock é liberado antes do `yield`: o treino pode levar segundos e não
        # deve bloquear consultas de outros clientes à mesma instância.
        try:
            yield
        finally:
            with self._lock:
                self._active_trainings.discard(key)

    def _load_example_datasets(self) -> None:
        if not self.examples_dir.is_dir():
            LOGGER.warning("Diretório de bases demonstrativas não encontrado: %s", self.examples_dir)
            return

        supported = {".csv", ".json", ".xml"}
        files = sorted(path for path in self.examples_dir.iterdir() if path.suffix.lower() in supported)
        preferred_id: str | None = None
        for path in files:
            # Um exemplo quebrado é registrado no log e ignorado: a API precisa
            # subir mesmo que uma das bases demonstrativas esteja corrompida.
            try:
                dataframe = load_dataset(path, path.name)
                envelope = self.register_dataset(dataframe, path.name, make_default=False)
                if path.name == DEFAULT_DATASET_FILENAME:
                    preferred_id = envelope["dataset_id"]
            except Exception:
                LOGGER.exception("Não foi possível carregar a base demonstrativa %s.", path)

        # A base padrão é escolhida ao final, para não depender da ordem de leitura.
        with self._lock:
            if preferred_id is not None:
                self._default_dataset_id = preferred_id
            elif self._default_dataset_id is None and self._datasets:
                self._default_dataset_id = next(iter(self._datasets))

    def _load_pretrained_models(self) -> None:
        # `joblib.load` executa código ao desserializar, então apenas estes dois
        # nomes fixos, produzidos pela própria equipe, são aceitos. Os arquivos
        # ficam fora do versionamento (ver .gitignore).
        loaders = {
            "modelo_produtividade.joblib": ("regressao", load_regression),
            "modelo_risco.joblib": ("classificacao", load_classification),
        }
        for filename, (task, loader) in loaders.items():
            path = self.models_dir / filename
            if not path.is_file():
                continue
            try:
                artifact = loader(path)
                self.register_model(artifact, task)
            except Exception:
                LOGGER.exception("Não foi possível carregar o artefato confiável %s.", path)
