# Dev 4 — classificação de risco

O módulo treina modelos reais para classificar `risco_quebra` como `Baixo`, `Moderado` ou `Alto`. Estão disponíveis Random Forest, Árvore de Decisão e KNN. Os dados atuais e seus rótulos são sintéticos; os resultados não comprovam previsão de risco agrícola real.

## Treinamento e avaliação

O treino recebe um DataFrame validado pelo Dev 2 e a configuração da tarefa `classificacao`, incluindo o `dataset_id` correspondente ao conteúdo. São usados os seis preditores numéricos e a cultura definidos em `app.ml.preprocessing`. Identificadores, município e ambos os alvos históricos ficam fora das features. O pipeline de imputação, escala e codificação é criado e ajustado separadamente para esta tarefa, apenas nos 80% de treino.

A divisão usa seed 42 e estratificação para preservar as classes observadas no treino e no teste quando o tamanho permite. A base precisa ter pelo menos 15 registros; cada classe presente precisa aparecer pelo menos duas vezes. Classes não presentes são reportadas em um aviso e mantidas na matriz fixa 3×3, permitindo usar as bases demonstrativas atuais, que podem conter apenas uma classe. Critérios de árvore aceitos são `gini` e `entropy`, específicos de classificação.

O resultado inclui acurácia, F1, precisão e recall ponderados, além da matriz de confusão e da auditoria completa sobre os mesmos registros de teste. A ordem fixa é `Baixo`, `Moderado`, `Alto`; linhas da matriz são classes reais e colunas são previsões. A matriz soma o tamanho do teste e sua diagonal determina a acurácia.

## Uso e persistência

Execute os exemplos a partir de `backend/`, com as dependências instaladas:

```python
from app.data import load_dataset, validate_dataset
from app.data.validator import create_dataset_envelope
from app.ml.classification import (
    train_classification, predict_classification,
    save_classification, load_classification,
)

df = validate_dataset(load_dataset("../data/examples/safra_mista_sul.csv"))
dataset_id = create_dataset_envelope(df, "safra_mista_sul.csv")["dataset_id"]
config = {
    "dataset_id": dataset_id,
    "task": "classificacao",
    "algorithm": "random_forest",
    "hyperparameters": {"n_estimators": 100, "max_depth": 10, "min_samples_split": 2},
}
artifact = train_classification(df, config)
print(artifact.result)  # TrainingResult compatível com a classificação
save_classification(artifact, "app/models/modelo_risco.joblib")

restored = load_classification("app/models/modelo_risco.joblib")
prediction = predict_classification(restored, {
    "municipio": "Sorriso", "cultura": "Soja", "area_hectares": 150,
    "precipitacao_mm": 1420, "temperatura_media": 25.3,
    "umidade_solo_pct": 64.2, "ph_solo": 6.1, "teor_argila_pct": 48,
}, dataset_id=dataset_id)
print(prediction)  # inclui risco_predito e probabilidades por classe
```

`predict_classification` informa probabilidades na ordem contratual usando `predict_proba` do classificador. Um estimador sem esse método retorna `probabilidades: null`. O módulo retorna avisos quando a entrada extrapola intervalos numéricos observados no treino e rejeita culturas que não apareceram no treino.

O Dev 5 deve manter o artefato completo associado ao `model_id` e ao `dataset_id`, usando `load_classification` para recarregá-lo. Só carregue arquivos joblib confiáveis produzidos pela equipe, pois desserializar pode executar código. Treinos malsucedidos não devem substituir o modelo ativo.

## Verificação

Os testes do módulo ficam em `backend/tests/test_classification.py` e cobrem os três algoritmos, parâmetros, estratificação, métricas e matriz, classes ausentes/insuficientes, entrada inválida, probabilidades, persistência e inferência sem novo treino.
