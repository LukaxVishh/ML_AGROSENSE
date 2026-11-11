"""Erros HTTP padronizados da API AgroSense."""

from __future__ import annotations

from typing import Any


class ApiError(Exception):
    """Erro esperado que pode ser apresentado ao cliente sem expor detalhes internos.

    As rotas levantam esta exceção em vez de montar respostas de erro; o tratador
    registrado em `app.main` cuida da serialização e do status HTTP.
    """

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        fields: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.fields = fields

    def as_dict(self) -> dict[str, Any]:
        error: dict[str, Any] = {
            "codigo": self.code,
            "mensagem": self.message,
        }
        # `campos` é opcional no contrato: só aparece quando há detalhe por campo.
        if self.fields:
            error["campos"] = self.fields
        return {"erro": error}
