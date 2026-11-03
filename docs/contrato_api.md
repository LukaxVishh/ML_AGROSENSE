# AgroSense — contrato de integração v1.0

Este contrato acompanha os tipos de `frontend/src/types/index.ts` e os serviços de `frontend/src/services/`. A interface mock já o utiliza; a API Python permanece a implementar pelos Devs 2–5.

## Convenções

- Base: `http://localhost:8000/api`, configurável por `VITE_API_URL`.
- JSON em UTF-8, campos em `snake_case`, números finitos sem formatação regional.
- POST JSON usa `Content-Type: application/json`; upload usa `FormData` com campo `file`.
- CORS local: permitir `http://127.0.0.1:5173` e `http://localhost:5173`.
- `mode` é `mock` na demonstração e `real` na API futura.
- `dataset_id` identifica o conteúdo normalizado de uma base; `model_id` identifica um treinamento e sua configuração.
- Rotas de dados retornam todos os registros no MVP. Busca, ordenação, paginação da tabela e filtros analíticos acontecem no navegador.
- Mocks e modelos ficam em memória e são perdidos ao recarregar a página. A persistência do back-end deve ser definida pelo Dev 5, sem alterar a correspondência dataset/modelo.

## 1. GET /health

```json
{"status":"ok","contract_version":"1.0"}
```

O front consulta esta rota antes da carga inicial no modo real. Em seguida, consulta `/data`. A API deve disponibilizar uma base padrão ou retornar erro amigável se ainda não houver base carregada.

## 2. POST /upload e GET /data

Upload: arquivo CSV, JSON ou XML até 2 MB e 10.000 registros. Formato do JSON: array de objetos. XML: raiz `<talhoes>`, filhos `<talhao>`, uma tag por campo. CSV: cabeçalho com os 13 campos, delimitador detectável, números com ponto decimal. Os arquivos em `data/examples/` são referências válidas.

GET aceita `?dataset_id=...`; sem esse parâmetro retorna a base padrão. As duas rotas retornam **o mesmo envelope**, definido pelo tipo `Dataset`:

```json
{
  "dataset_id":"ds-exemplo",
  "filename":"exemplo.csv",
  "records":[{
    "talhao_id":"TAL-0001","municipio":"Sorriso","latitude":-12.5425,"longitude":-55.7211,
    "cultura":"Soja","area_hectares":150,"precipitacao_mm":1420,"temperatura_media":25.3,
    "umidade_solo_pct":64.2,"ph_solo":6.1,"teor_argila_pct":48,
    "produtividade_sc_ha":78,"risco_quebra":"Baixo"
  }],
  "summary":{
    "total_talhoes":1,"area_total_ha":150,"produtividade_media":78,"precipitacao_media":1420,
    "culturas_contagem":{"Soja":1,"Milho":0,"Algodão":0},
    "risco_contagem":{"Baixo":1,"Moderado":0,"Alto":0}
  },
  "validation":{"columns_detected":13,"warnings":[]},
  "mode":"real"
}
```

Regras do esquema:

| Campo | Regra |
| --- | --- |
| `talhao_id` | Texto obrigatório, único na base |
| `municipio` | Texto obrigatório |
| `latitude` | Número entre −33,75 e 5,27 |
| `longitude` | Número entre −73,98 e −34,79 |
| `cultura` | `Soja`, `Milho` ou `Algodão` |
| `area_hectares` | Número de 1 a 5.000 |
| `precipitacao_mm` | Número de 0 a 3.000, acumulado no ciclo |
| `temperatura_media` | Número de 10 a 45 °C |
| `umidade_solo_pct` | Número de 0 a 100 |
| `ph_solo` | Número de 3,5 a 9 |
| `teor_argila_pct` | Número de 0 a 100 |
| `produtividade_sc_ha` | Número de 0 a 120, alvo de regressão |
| `risco_quebra` | `Baixo`, `Moderado` ou `Alto`, alvo de classificação |

Todos os campos são obrigatórios na primeira versão. Uploads não aceitam propriedades extras, IDs duplicados, valores ausentes ou linhas inválidas. CSV/XML convertem campos numéricos textuais; JSON exige números JSON. Os limites são regras didáticas do projeto, sem validação agronômica comprovada.

Uma base vazia pode existir como estado demonstrativo: `records: []`, total e soma zero, médias `null`, contagens zero. Arquivos importados vazios são rejeitados. O front substitui a base inteira após upload bem-sucedido e invalida os modelos anteriores.

## 3. POST /model/train

Entrada `TrainConfig`:

```json
{"dataset_id":"ds-exemplo","task":"regressao","algorithm":"random_forest","hyperparameters":{"n_estimators":100,"max_depth":10,"min_samples_split":2}}
```

Tarefas: `regressao` e `classificacao`. Algoritmos: `random_forest`, `decision_tree`, `knn`.

| Algoritmo | Hiperparâmetros aceitos |
| --- | --- |
| Random Forest | `n_estimators`: inteiro 10–300; `max_depth`: inteiro 2–25; `min_samples_split`: inteiro 2–10 |
| Árvore | `max_depth`: inteiro 1–20; `criterion`: `squared_error`/`absolute_error` para regressão ou `gini`/`entropy` para classificação |
| KNN | `n_neighbors`: inteiro 1–25, limitado ao tamanho do treino; `weights`: `uniform`/`distance`; `metric`: `euclidean`/`manhattan` |

Rejeitar parâmetros não suportados. Mínimo do MVP: 15 registros. Na implementação científica, validar ainda quantidade de classes e suporte de cada classe para split e avaliação; retornar erro quando inviável.

Resposta `TrainingResult`, exemplo ilustrativo de estrutura (não são resultados de ML real):

```json
{
  "model_id":"reg-exemplo","dataset_id":"ds-exemplo",
  "config":{"dataset_id":"ds-exemplo","task":"regressao","algorithm":"random_forest","hyperparameters":{"n_estimators":100,"max_depth":10,"min_samples_split":2}},
  "mode":"real","train_size":240,"test_size":60,
  "metrics":{"r2":0.8,"mae":3.5,"rmse":4.2},
  "test_samples":[{"talhao_id":"TAL-0001","real":78,"previsto":76}],
  "warnings":[]
}
```

O exemplo abrevia `test_samples`; a resposta efetiva deve incluir todas as amostras de teste. Regressão usa sacas/ha para MAE/RMSE; R² é coeficiente e pode ser negativo ou `null` quando indefinido. Classificação retorna em `metrics`:

```json
{"accuracy":0.8,"f1_weighted":0.8,"precision":0.8,"recall":0.8,"classes":["Baixo","Moderado","Alto"],"confusion_matrix":[[8,2,0],[0,8,2],[2,0,8]]}
```

`precision`, `recall` e F1 são ponderados pelo suporte. Matriz: linhas reais, colunas previstas, contagens absolutas, na ordem de `classes`. Soma da matriz = `test_size`; acurácia = diagonal / soma. Os exemplos das duas tarefas são independentes.

Na API real: dividir treino/teste antes de ajustar imputação, escala ou encoding; usar pipelines. Excluir ambos os alvos e identificadores dos preditores. Guardar o pipeline completo por `model_id`. Comparar com baseline, documentar seed e versão dos dados e avaliar generalização. Não usar o teste repetidamente para escolher hiperparâmetros.

No mock: há separação determinística de amostras para calcular diagnósticos da regra demonstrativa, sem treinar estimadores. Seleção de algoritmo e parâmetros testa o fluxo e o contrato, não comprova melhoria preditiva. Não comparar esses resultados como evidência de qualidade dos algoritmos reais.

O contrato inicial é síncrono, com timeout de 30 segundos no cliente. Se o treinamento real exceder esse limite, o Dev 5 deve combinar uma evolução para jobs e consulta de status antes da integração. Não iniciar um segundo treino concorrente sobre o mesmo estado sem controle.

## 4. POST /predict

```json
{
  "dataset_id":"ds-exemplo",
  "model_ids":{"regressao":"reg-exemplo","classificacao":"clf-exemplo"},
  "input":{"municipio":"Sorriso","cultura":"Soja","area_hectares":150,"precipitacao_mm":1420,"temperatura_media":25.3,"umidade_solo_pct":64.2,"ph_solo":6.1,"teor_argila_pct":48}
}
```

Pelo menos um ID de modelo é obrigatório. Verificar tarefa, existência e base de cada modelo. Município é contexto da interface; o modelo real deve usar a lista explícita de features definida pela equipe, inicialmente seis numéricas mais cultura. Não enviar coordenadas ou alvos como preditores por padrão.

```json
{
  "dataset_id":"ds-exemplo","model_ids":{"regressao":"reg-exemplo","classificacao":"clf-exemplo"},
  "produtividade_estimada_sc_ha":76,"risco_predito":"Baixo",
  "probabilidades":{"Baixo":0.8,"Moderado":0.15,"Alto":0.05},
  "mode":"real","warnings":[]
}
```

Se a tarefa não foi solicitada, seu resultado usa `null`. Se não houver probabilidade calculada pelo classificador, `probabilidades` usa `null`; nunca fabricar valores. O mock sempre retorna probabilidades `null`. Respostas de exemplo não representam resultados agronômicos verificados.

A cultura solicitada deve estar presente nos dados usados para treinar os modelos. Retornar 422 para cultura ausente; o front limita o seletor à base ativa. A API real também deverá informar extrapolação das variáveis numéricas em relação aos intervalos observados no treino.

## 5. Erros

```json
{"erro":{"codigo":"schema_invalido","mensagem":"Registro 2: ph_solo fora do intervalo permitido.","campos":{"ph_solo":"Valor inválido."}}}
```

O cliente atual exibe `mensagem`; a validação local do simulador também mostra erros por campo.

| HTTP | Uso |
| --- | --- |
| 400 | JSON ou arquivo malformado |
| 404 | Dataset ou modelo inexistente |
| 409 | Modelo pertence a outra base ou tarefa |
| 413 | Arquivo maior que 2 MB |
| 415 | Formato não aceito |
| 422 | Esquema, valores, parâmetros ou tamanho de treino inválidos |
| 503 | Serviço indisponível |
| 500 | Falha inesperada, com detalhes apenas no log do servidor |

Falhas de upload preservam a base ativa; falhas de treino preservam o modelo anterior e exibem erro. Falhas da API nunca ativam mocks silenciosamente. Reiniciar o Vite após alterar as variáveis de ambiente.

## 6. Validação no cliente

`frontend/src/services/contracts.ts` valida as respostas reais antes de atualizar a interface. Uma resposta HTTP 200 pode ser rejeitada se não cumprir o contrato: modo incorreto, versão incompatível, campos ausentes, números não finitos, contagens divergentes, IDs/configuração diferentes do pedido, auditoria incompleta ou matriz/acurácia inconsistentes.

Retornar resumos sem arredondamento de apresentação (o cliente tolera diferença de até 0,01 nas somas e médias), taxas entre 0 e 1 e amostras de teste completas. Acurácia deve conciliar com a matriz, com tolerância de 0,0001. Arredondar apenas a exibição na interface.

XML aceita somente a estrutura simples documentada, sem atributos na raiz, nos registros ou nos campos e sem elementos aninhados nos campos. Essa regra deve ser reproduzida pelo serviço de ingestão.
