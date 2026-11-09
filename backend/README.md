# Back-end AgroSense — Guia Completo de Implementação e Integração (Devs 2 a 5)

Este documento é o guia definitivo de execução técnica para o desenvolvimento do back-end em Python do projeto **AgroSense**, da disciplina **Tópicos Especiais em Software** (Prof. **Rhafael Freitas Da Costa**).

---

## 1. Status Geral de Entregas da Equipe

| Dev | Frente Principal | Entregáveis para o Projeto | Status |
| :---: | :--- | :--- | :---: |
| **Dev 1** | **Interface React & Mocks** | Front-end SPA completo, mapa Leaflet, gráficos Recharts, contratos TypeScript e simulador | **Concluído [x]** |
| **Dev 2** | **Dados, Ingestão & Qualidade** | Ingestão de CSV/JSON/XML, validação estrita das 13 colunas, 4 bases acadêmicas e 17 testes | **Concluído [x]** |
| **Dev 3** | **Regressão de Produtividade** | Pipelines `scikit-learn`, baseline, métricas (MAE/RMSE/$R^2$) e persistência `.joblib` | **Implementado [x]** |
| **Dev 4** | **Classificação de Risco** | Pipelines `scikit-learn`, matriz de confusão $3 \times 3$, probabilidades e persistência `.joblib` | **Pendente [ ]** |
| **Dev 5** | **API Flask & Integração** | Servidor REST, rotas `/health`, `/data`, `/upload`, `/model/train`, `/predict` e CORS | **Pendente [ ]** |

---

## 2. Estrutura Modular de Arquivos em `backend/`

```text
backend/
├── app/
│   ├── __init__.py                  # Pacote app
│   ├── main.py                      # [Dev 5] Servidor Flask, CORS e inicialização na porta 8000
│   ├── data/                        # [Dev 2 - CONCLUÍDO] Ingestão e validação
│   │   ├── __init__.py              # Exporta load_dataset, validate_dataset, create_dataset_envelope
│   │   ├── loader.py                # Leitura e normalização de CSV, JSON e XML seguro
│   │   ├── validator.py             # Validação das 13 colunas, limites físicos e resumo
│   │   └── generate_diverse_datasets.py # Gerador dos 4 cenários de teste acadêmico
│   ├── ml/                          # Dev 3 implementado; Dev 4 pendente
│   │   ├── __init__.py
│   │   ├── preprocessing.py         # Pipeline de pré-processamento (OneHotEncoder + StandardScaler)
│   │   ├── regression.py            # [Dev 3] Treinamento e predição de produtividade (sc/ha)
│   │   └── classification.py        # [Dev 4] Treinamento e predição de risco de quebra
│   ├── models/                      # [Devs 3 e 4] Artefatos binários persistidos (.joblib)
│   │   ├── modelo_produtividade.joblib
│   │   └── modelo_risco.joblib
│   ├── services/                    # [Dev 5 - PENDENTE] Gerenciamento de estado
│   │   ├── __init__.py
│   │   └── model_registry.py        # Mapeamento e cache de dataset_id e model_id em memória
│   └── routes/                      # [Dev 5 - PENDENTE] Endpoints REST da API
│       ├── __init__.py
│       ├── health.py                # GET /api/health
│       ├── data.py                  # GET /api/data e POST /api/upload
│       ├── train.py                 # POST /api/model/train
│       └── predict.py               # POST /api/predict
├── tests/
│   ├── conftest.py                  # [Dev 2 - CONCLUÍDO] Injeta backend no sys.path do pytest
│   ├── test_data.py                 # [Dev 2 - CONCLUÍDO] 17 testes automatizados de dados
│   ├── test_regression.py           # [Dev 3 - IMPLEMENTADO] Testes unitários de regressão
│   ├── test_classification.py       # [Dev 4 - PENDENTE] Testes unitários de classificação
│   └── test_api.py                  # [Dev 5 - PENDENTE] Testes de integração HTTP
├── requirements.txt                 # [Dev 2 - CONCLUÍDO] Dependências oficiais
└── README.md                        # Este guia
```

---

## 3. O que foi feito pelo Dev 2 (Mapeamento e Instruções de Verificação)

O **Dev 2** entregou a fundação de dados confiável para todo o projeto.

### Arquivos e Módulos Criados:
1. **[`app/data/loader.py`](app/data/loader.py):**
   * Funções `load_csv()`, `load_json()`, `load_xml()` e `load_dataset()`.
   * Suporte a arquivos em disco, strings decodificadas e fluxos binários de upload (`BytesIO`).
   * **Segurança contra XXE:** Bloqueio preventivo de `<!DOCTYPE` e `<!ENTITY` com `defusedxml`.
2. **[`app/data/validator.py`](app/data/validator.py):**
   * Função `validate_dataset(df)`: Valida presença estrita das 13 colunas, unicidade de `talhao_id`, ausência de valores nulos e limites físicos de cada variável.
   * Função `calculate_summary(df)`: Gera os totais de talhões, área somada, médias e contagens por cultura e risco.
   * Função `create_dataset_envelope(df, filename)`: Gera o hash determinístico SHA-256 (`ds-<hash>`) e monta o JSON compatível com o tipo `Dataset` do front-end com `mode: "real"`.
3. **Bases Diversas em [`../data/examples/`](../data/examples/):**
   * `safra_soja_favoravel.csv`: Safra ideal de alta produtividade (75–90 sc/ha) e risco Baixo.
   * `safra_milho_seca_severa.json`: Anomalia climática crítica (El Niño, chuva < 340 mm, risco Alto).
   * `safra_algodao_cerrado.xml`: Solos arenosos do Cerrado (argila 16–26%, pH ácido).
   * `safra_mista_sul.csv`: Clima ameno da Região Sul (17,5–22,5 °C) com Soja e Milho.

### Como Executar os Testes do Dev 2:
```powershell
# Na raiz do repositório ou na pasta backend
python -m pytest backend/tests/test_data.py -v
```
*Resultado obtido:* **17 testes aprovados em menos de 1 segundo (100% green)**.

---

## 4. Instruções Passo a Passo para os Desenvolvedores Restantes

---

### DEV 3 — Regressão de Produtividade (implementado)

O módulo está em `app/ml/regression.py`, com pré-processamento compartilhado em `app/ml/preprocessing.py` e testes em `tests/test_regression.py`.

Consulte o [guia da entrega do Dev 3](../docs/entrega_dev3.md) para treinar, avaliar, salvar e carregar os modelos. O guia explica as métricas, as limitações dos dados sintéticos e a integração com o registro do Dev 5.

`train_regression` retorna um artefato com o pipeline ajustado e os metadados. Sua propriedade `result` segue o contrato `TrainingResult`; `baseline_metrics` guarda a comparação com a média do treino. Use `save_regression` e `load_regression` para persistência, preservando o vínculo entre base, modelo e configuração. O modelo corresponde à configuração solicitada, sem escolher hiperparâmetros pelo teste.

A previsão usa `predict_regression`, sem novo ajuste, e verifica cultura, limites numéricos e identidade da base. O servidor HTTP ainda depende do Dev 5.

---
### DEV 4 — Classificação de Risco de Quebra (`scikit-learn`)

* **Objetivo:** Prever a classe de risco de quebra da safra (`risco_quebra`: `"Baixo"`, `"Moderado"` ou `"Alto"`).
* **Arquivos a criar:**
  1. `backend/app/ml/classification.py`
  2. `backend/tests/test_classification.py`

#### 1. Divisão Estratificada:
```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y_risco, test_size=0.2, stratify=y_risco, random_state=42
)
```

#### 2. Estimadores Selecionáveis:
* `RandomForestClassifier(n_estimators, max_depth, min_samples_split, random_state=42)`
* `DecisionTreeClassifier(max_depth, criterion="gini"|"entropy", random_state=42)`
* `KNeighborsClassifier(n_neighbors, weights, metric)`

#### 3. Matriz de Confusão e Probabilidades:
* Classes na ordem estrita do contrato: `classes = ["Baixo", "Moderado", "Alto"]`.
* Gerar matriz de confusão:
  ```python
  from sklearn.metrics import confusion_matrix
  cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()
  ```
  *Atenção:* A soma total de `cm` deve ser igual a `len(y_test)` e a acurácia calculada deve ser rigorosamente igual a $\frac{\text{diagonal}}{\text{total}}$.
* Probabilidades com `predict_proba`: mapa `{"Baixo": p0, "Moderado": p1, "Alto": p2}` onde a soma é exatamente $1{,}0$.

#### 4. Persistência do Melhor Modelo:
```python
import joblib
joblib.dump(melhor_pipeline_classificacao, "backend/app/models/modelo_risco.joblib")
```

---

### DEV 5 — API Python Flask, Registro de Modelos e Integração

* **Objetivo:** Orquestrar os módulos dos Devs 2, 3 e 4 em um servidor HTTP REST executável na porta `8000`.
* **Arquivos a criar:**
  1. `backend/app/main.py`
  2. `backend/app/services/model_registry.py`
  3. `backend/app/routes/health.py`
  4. `backend/app/routes/data.py`
  5. `backend/app/routes/train.py`
  6. `backend/app/routes/predict.py`
  7. `backend/tests/test_api.py`

#### 1. Configuração do Servidor e CORS (`main.py`):
```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
# Habilitar CORS para o front-end Vite
CORS(app, origins=["http://127.0.0.1:5173", "http://localhost:5173"])
```

#### 2. Registro em Memória Pré-carregado (`model_registry.py`):
Para atender à orientação do professor, carregar os modelos salvos em disco **imediatamente na inicialização**:
```python
import joblib
from app.ml.regression import load_regression
from pathlib import Path

class ModelRegistry:
    def __init__(self):
        self.datasets = {}
        self.models = {}
        # Carrega os modelos pré-treinados em disco
        models_dir = Path(__file__).resolve().parent.parent / "models"
        if (models_dir / "modelo_produtividade.joblib").exists():
            artifact = load_regression(models_dir / "modelo_produtividade.joblib")
            self.models[artifact.result["model_id"]] = {
                "artifact": artifact,
                "task": "regressao",
                "dataset_id": artifact.result["dataset_id"]
            }
        if (models_dir / "modelo_risco.joblib").exists():
            self.models["clf-default"] = {
                "pipeline": joblib.load(models_dir / "modelo_risco.joblib"),
                "task": "classificacao",
                "dataset_id": "default"
            }
```

#### 3. Rotas a Implementar Conforme o Contrato:
* **`GET /api/health`:** Retorna `{"status": "ok", "contract_version": "1.0"}`.
* **`GET /api/data?dataset_id=...`:** Retorna o envelope `Dataset` gerado pelo Dev 2.
* **`POST /api/upload`:** Recebe arquivo no campo `file`, valida com `validate_dataset(load_dataset(file, filename))` e retorna o novo `Dataset`.
* **`POST /api/model/train`:** Executa treino dinâmico sob demanda caso o usuário clique na interface, gerando novo `model_id`.
* **`POST /api/predict`:** Recebe os dados de um talhão, executa inferência usando os pipelines do registro e retorna `produtividade_estimada_sc_ha`, `risco_predito` e `probabilidades`.

---

## 5. Como o Dev 1 Conectará o Front-End à API Real

Assim que o Dev 5 finalizar os endpoints:

1. No front-end, crie ou altere o arquivo `frontend/.env.local`:
   ```ini
   VITE_USE_MOCK=false
   VITE_API_URL=http://localhost:8000/api
   ```
2. Inicie a API Python na porta 8000:
   ```powershell
   cd backend
   python app/main.py
   ```
3. Reinicie o front-end:
   ```powershell
   cd frontend
   npm run dev
   ```
4. Abra **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. A interface indicará **"Modo API Real"** e operará diretamente sobre o back-end Python.


Entrega do Dev 3: consulte o [guia de regressão](../docs/entrega_dev3.md). O módulo Python está implementado; a integração HTTP depende do Dev 5. O artefato joblib contém pipeline e metadados e deve ser carregado com `load_regression`.
