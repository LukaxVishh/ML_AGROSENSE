# Back-end AgroSense — implementação da equipe

A entrega atual do Dev 1 implementa o front-end e o contrato mockado. Esta pasta reserva o espaço do back-end Python, ainda sem API, modelos ou dependências instaladas.

| Dev | Entrega | Área sugerida |
| --- | --- | --- |
| 2 | CSV/JSON/XML, validação do esquema e relatório de dados | `app/data/`, `tests/` |
| 3 | Pipeline de regressão, baseline, MAE/RMSE/R² e inferência | `app/ml/regression.py`, `tests/` |
| 4 | Pipeline de classificação, métricas, matriz e inferência | `app/ml/classification.py`, `tests/` |
| 5 | API Python, registro de bases e modelos, treinamento e integração | `app/routes/`, `app/services/`, inicialização |

Implementar o [contrato v1.0](../docs/contrato_api.md). Base prevista: `http://localhost:8000/api`. Flask é a proposta de framework; a equipe pode alterar o framework preservando o contrato HTTP.

O front encontra seus dados via `AgroService` em `frontend/src/types/index.ts`. Para integrar, configurar `VITE_USE_MOCK=false`, definir a URL da API e reiniciar o Vite. Habilitar CORS para as duas origens locais indicadas no contrato.

Critérios de integração:

- [ ] Rotas `/health`, `/data`, `/upload`, `/model/train` e `/predict` implementadas.
- [ ] Respostas iguais aos envelopes tipados, com `mode: "real"`.
- [ ] Modelos identificados por tarefa, versão e dataset.
- [ ] Pré-processamento ajustado somente no treino e reutilizado na inferência.
- [ ] Os dois alvos excluídos das features, inclusive quando apenas um é previsto.
- [ ] Métricas conciliadas com as amostras de teste e a matriz de confusão.
- [ ] Erros do contrato testados, sem sobrescrever estado válido em caso de falha.
- [ ] Dependências, geração de dados e execução documentadas.

Os exemplos em `../data/examples/` são sintéticos e reproduzíveis pelo comando `pnpm examples` no front. Fórmulas e rótulos são didáticos, sem comprovação de validade agronômica.
