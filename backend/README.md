# Back-end AgroSense

API Flask que integra a ingestão dos dados, os pipelines reais de regressão e classificação e o registro em memória de bases e modelos. As respostas seguem o [contrato HTTP v1.0](../docs/contrato_api.md) e usam `mode: "real"`.

## Estado das entregas

| Dev | Frente | Estado |
| :---: | --- | :---: |
| 2 | Ingestão CSV/JSON/XML, validação e resumos | Concluído |
| 3 | Regressão de produtividade, avaliação e persistência | Concluído |
| 4 | Classificação de risco, avaliação e persistência | Concluído |
| 5 | API Flask, registro, CORS, erros e integração HTTP | Concluído |

Os dados e rótulos fornecidos são sintéticos. Modelos e métricas são reais, mas não comprovam validade agronômica nem desempenho em lavouras reais.

## Estrutura

```text
backend/
├── app/
│   ├── main.py                  # factory Flask, CORS e tratamento de erros
│   ├── errors.py                # envelope JSON padronizado
│   ├── data/                    # ingestão e validação do Dev 2
│   ├── ml/                      # pipelines dos Devs 3 e 4
│   ├── models/                  # artefatos locais opcionais, fora do Git
│   ├── routes/                  # health, dados, treino e previsão
│   └── services/model_registry.py
├── tests/                       # testes de dados, ML e API
└── requirements.txt
```

## Instalação e execução

Requisitos: Python 3.10 ou superior. A partir da raiz do repositório:

```powershell
python -m venv backend/.venv
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd backend
./.venv/Scripts/python.exe -m app.main
```

Em Linux/macOS, depois de criar o ambiente:

```bash
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd backend
./.venv/bin/python -m app.main
```

A API escuta em `http://127.0.0.1:8000/api`. A rota de prontidão é:

```text
GET http://127.0.0.1:8000/api/health
```

O servidor de desenvolvimento do Flask é suficiente para a apresentação local. Ele não é uma configuração de produção.

## Rotas

| Método e rota | Comportamento |
| --- | --- |
| `GET /api/health` | Informa prontidão e contrato `1.0` |
| `GET /api/data` | Retorna a base padrão |
| `GET /api/data?dataset_id=...` | Consulta uma base registrada |
| `POST /api/upload` | Lê, valida e registra CSV, JSON ou XML de até 2 MB |
| `POST /api/model/train` | Treina regressão ou classificação e registra o artefato completo |
| `POST /api/predict` | Executa uma ou as duas tarefas solicitadas sem novo treino |

Na inicialização, as bases válidas de `data/examples/` são registradas e `safra_mista_sul.csv` é escolhida como padrão. O upload bem-sucedido passa a ser a base padrão; uma falha mantém a base anterior.

Treinos usam diretamente `train_regression` ou `train_classification`. O modelo só é publicado no registro após o pipeline terminar com sucesso. Dois treinos simultâneos da mesma tarefa sobre a mesma base são recusados com HTTP 409. Previsões conferem existência, tarefa e `dataset_id` antes da inferência e rejeitam culturas ausentes no treino.

Erros seguem o formato:

```json
{"erro":{"codigo":"schema_invalido","mensagem":"Descrição em português."}}
```

São usados os status 400, 404, 409, 413, 415, 422 e 500 conforme o contrato. Detalhes de falhas inesperadas ficam apenas no log do servidor.

## Estado, persistência e múltiplos clientes

- Bases enviadas e modelos treinados ficam em memória, compartilhados por todos os clientes da mesma instância do servidor.
- Não há autenticação nem isolamento por usuário no MVP acadêmico. Quem conhece um ID pode consultar a base ou solicitar o modelo correspondente.
- Bases e modelos dinâmicos são descartados ao reiniciar o processo. Não há remoção automática durante a execução.
- O mesmo conteúdo normalizado produz o mesmo `dataset_id`; um novo treino sempre produz outro `model_id`.
- Artefatos confiáveis chamados `modelo_produtividade.joblib` e `modelo_risco.joblib`, quando presentes em `backend/app/models/`, são carregados com as funções dos respectivos módulos. Arquivos `.joblib` não são versionados.
- Um artefato pré-carregado continua vinculado ao `dataset_id` original. Ele só pode prever quando a base correspondente também estiver registrada.

Essa política é adequada ao uso local por uma equipe. Persistência durável, autenticação, quotas e isolamento seriam necessários para disponibilizar o serviço a usuários não confiáveis.

## Testes

Na raiz do repositório:

```powershell
./backend/.venv/Scripts/python.exe -m pytest backend/tests -q
```

Em Linux/macOS:

```bash
backend/.venv/bin/python -m pytest backend/tests -q
```

`test_api.py` cobre a base padrão, CORS, upload, limite de tamanho, preservação de estado, treino das duas tarefas, previsão combinada, vínculos de base/tarefa, cultura desconhecida, exclusão mútua de treino e pré-carregamento seguro. Os demais arquivos verificam os módulos dos Devs 2–4 isoladamente.

## Conectar o front-end

Crie `frontend/.env.local`:

```ini
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
```

Inicie a API antes do Vite e reinicie o front depois de alterar o arquivo. O CORS permite apenas `http://127.0.0.1:5173` e `http://localhost:5173` no ambiente local. Uma falha da API é exibida na interface e nunca ativa o mock silenciosamente.

Guias específicos: [regressão](../docs/entrega_dev3.md), [classificação](../docs/entrega_dev4.md) e [contrato HTTP](../docs/contrato_api.md).
