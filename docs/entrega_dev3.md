# Dev 3 — regressão de produtividade

A entrega permite treinar um modelo real para estimar a produtividade em sacas por hectare. Estão disponíveis Random Forest, Árvore de Decisão e KNN, com validação dos hiperparâmetros definidos no contrato v1.0. A classificação de risco e as rotas HTTP continuam sob responsabilidade dos Devs 4 e 5.

## Como o treinamento funciona

O módulo recebe a base validada pelo Dev 2 e verifica se seu conteúdo corresponde ao `dataset_id` informado. São usadas seis variáveis numéricas e a cultura. Município, identificador, coordenadas, produtividade histórica e risco histórico não entram como preditores.

A base é separada em 80% para treino e 20% para teste, com seed 42. Imputação, padronização e codificação da cultura ficam dentro do pipeline e são ajustadas somente com o treino. Embora a ingestão atual rejeite valores ausentes, o pré-processador já contém imputação para uso compartilhado com a outra tarefa.

O estimador solicitado e o baseline que prevê a média do treino são avaliados no mesmo teste. Nenhum algoritmo é escolhido automaticamente pelas métricas do teste: essa seleção exigiria validação cruzada dentro do treino. O artefato salvo é o modelo da configuração solicitada.

MAE expressa o erro absoluto médio em sc/ha. RMSE também usa sc/ha e dá maior peso a erros grandes. Para ambas, valores menores indicam menos erro. R² compara o modelo com uma previsão constante: pode ser negativo e retorna `null` quando a produtividade do teste é constante. As métricas e a auditoria usam as mesmas previsões, sem arredondamento.

As bases são sintéticas. Mesmo com estimadores reais, bons resultados não comprovam desempenho em lavouras reais nem validade agronômica.

## Executar e testar

Na raiz do repositório, com Python 3.10 ou superior instalado:

```powershell
python -m venv backend/.venv
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
./backend/.venv/Scripts/python.exe -m pytest backend/tests -q
```

## Uso pelo Dev 5

Execute o exemplo abaixo na pasta `backend`, com o ambiente virtual ativo. O caminho relativo da base considera essa pasta como diretório de trabalho.

```python
from app.data import load_dataset, validate_dataset
from app.data.validator import create_dataset_envelope
from app.ml.regression import (
    train_regression, predict_regression, save_regression, load_regression,
)

df = validate_dataset(load_dataset("../data/examples/safra_mista_sul.csv"))
dataset = create_dataset_envelope(df, "safra_mista_sul.csv")
config = {
    "dataset_id": dataset["dataset_id"],
    "task": "regressao",
    "algorithm": "random_forest",
    "hyperparameters": {
        "n_estimators": 100, "max_depth": 10, "min_samples_split": 2,
    },
}
artifact = train_regression(df, config)
print(artifact.result)  # TrainingResult compatível com a interface
print(artifact.baseline_metrics)  # comparação com a média do treino
save_regression(artifact, "app/models/modelo_produtividade.joblib")

# Em outra execução, carregar e prever sem treinar novamente:
restored = load_regression("app/models/modelo_produtividade.joblib")
prediction = predict_regression(restored, {
    "municipio": "Sorriso", "cultura": "Soja", "area_hectares": 150,
    "precipitacao_mm": 1420, "temperatura_media": 25.3,
    "umidade_solo_pct": 64.2, "ph_solo": 6.1, "teor_argila_pct": 48,
}, dataset_id=dataset["dataset_id"])
print(prediction)
```

`artifact.result` é a resposta de treino; o objeto completo deve ficar no registro do servidor. Ele reúne o pipeline, configuração, identificação do modelo e da base, seed, versão do scikit-learn, métricas do baseline, culturas e intervalos observados no treino. A previsão retorna o envelope da tarefa de regressão, com risco e probabilidades `null`.

O Dev 5 deve usar `load_regression` para carregar esse formato, em vez de tratar o arquivo como um pipeline isolado. A função recusa versões diferentes do scikit-learn. Carregue somente arquivos joblib confiáveis produzidos pela equipe, pois a desserialização pode executar código.

O módulo rejeita cultura ausente no treino e valores fora dos limites do contrato. Valores válidos, mas fora dos intervalos observados no treino, geram avisos de extrapolação. O servidor ainda precisa verificar a tarefa e o `model_id` solicitado no registro e converter as exceções de domínio em erros HTTP. Um treino malsucedido não deve substituir o artefato ativo.

Os binários são gerados localmente pelo comando de persistência; não são necessários para executar os testes. Use o ambiente de dependências do treinamento ao apresentar os modelos salvos.

## Verificação desta entrega

Foram aprovados os 17 testes existentes de dados e os 22 testes de regressão. As verificações cobrem os três algoritmos, aplicação dos parâmetros, métricas e auditoria, baseline, separação do pré-processamento, cultura presente somente no teste, limites de entrada, reprodutibilidade e persistência sem novo treino.

Também foi gerado e recarregado localmente `backend/app/models/modelo_produtividade.joblib`, usando Random Forest com 100 árvores, profundidade máxima 10, divisão mínima 2 e seed 42 na base `safra_mista_sul.csv`. Foram 120 registros de treino e 30 de teste. O modelo obteve MAE de 1,3330 sc/ha, RMSE de 1,5214 sc/ha e R² de 0,7187; o baseline obteve MAE de 2,4386 sc/ha e RMSE de 2,8772 sc/ha. Esses números descrevem apenas essa divisão da base sintética. O binário fica fora do versionamento e pode ser recriado pelo exemplo acima.
