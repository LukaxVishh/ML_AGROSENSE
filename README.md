# AgroSense

Aplicação acadêmica para explorar dados agrícolas, visualizar talhões no mapa e simular cenários de produtividade e risco de safra.

| Informação | Definição |
| --- | --- |
| Disciplina | **Tópicos Especiais em Software** |
| Professor | **Rhafael Freitas Da Costa** |
| Equipe | Até cinco desenvolvedores |
| Dev 1 | **Fernando de Araujo Pereira** — base, front-end e mocks |
| Interface | React + TypeScript + Vite |
| Back-end | API REST Flask + pipelines scikit-learn |

## 1. Objetivo e estado atual

O AgroSense reúne quatro áreas da mesma aplicação:

| Área | O que o usuário pode fazer | Estado atual |
| --- | --- | --- |
| Dados | Importar CSV/JSON/XML, validar as 13 colunas, buscar, ordenar e paginar os registros | Front local e API real implementados |
| Dashboard e mapa | Filtrar cultura/município, consultar marcadores e explorar gráficos de barras, rosca, dispersão e correlação | Implementado |
| Machine Learning | Escolher tarefa, algoritmo e hiperparâmetros; consultar métricas e auditoria | Mock e treinamento real implementados |
| Simulador | Informar condições do talhão e consultar produtividade e/ou classe de risco | Mock e inferência real implementados |

O front continua funcionando de forma independente, com 300 talhões demonstrativos e importação local. No modo real, a API Python integra a ingestão, os modelos scikit-learn e a inferência entregues pelos Devs 2–5. Nenhum estimador é treinado no navegador.

A troca entre mock e API é explícita por configuração e preserva o [contrato da API v1.0](docs/contrato_api.md), sem fallback silencioso.

## 2. Divisão do trabalho

Fernando assume o Dev 1. Os nomes dos responsáveis pelos Devs 2–5 ainda não foram registrados neste documento. A divisão abaixo descreve as entregas implementadas.

| Dev | Frente principal | Entrega para o grupo | Status | Depende de |
| :---: | :--- | :--- | :---: | --- |
| **1 — Fernando** | Base, componentes React, mocks e integração da interface | Front executável sem Python, tipos e contrato para o back-end | Concluído (Front) | Contrato alinhado com Dev 5 |
| **2** | Dados, importação e validação | Ingestão CSV/JSON/XML, validação 13 colunas, 4 bases e 18 testes | **Concluído [x]** | Esquema de 13 colunas |
| **3** | Regressão de produtividade | Pipeline de regressão, métricas, persistência joblib e inferência | **Concluído [x]** | Dados do Dev 2 |
| **4** | Classificação de risco | Pipeline de classificação, matriz 3x3, probabilidades e joblib | **Concluído [x]** | Dados do Dev 2; pré-processamento alinhado com Dev 3 |
| **5** | API Python e integração do back-end | Servidor Flask REST, rotas HTTP e registro de bases/modelos | **Concluído [x]** | Contrato e funções de dados/modelos |

Cada dev implementa, testa e documenta sua própria entrega. O Dev 5 conecta os módulos no servidor; o Dev 1 conecta a interface ao servidor. Alterações no contrato precisam ser combinadas entre as duas frentes e refletidas nos tipos, validadores e exemplos.

### Dev 1 — Fernando: base e front-end

**Responsabilidade:** construir e manter a interface, sem depender de a API estar pronta.

**Arquivos principais:** `frontend/src/App.tsx`, `components/`, `pages/`, `hooks/`, `services/`, `types/`, `mocks/` e `docs/contrato_api.md`.

**Entregas já disponíveis:**

- [x] Estrutura React + TypeScript com as quatro áreas da aplicação.
- [x] Componentes reutilizáveis de layout, campos, tabelas, paginação, indicadores e upload.
- [x] Serviço mockado e cliente HTTP sob a mesma interface `AgroService`.
- [x] Upload local, esquema validado e bases demonstrativas reproduzíveis.
- [x] Mapa, gráficos, controles de modelo e simulador.
- [x] Estados de carregamento, vazio, erro e modelo não treinado.
- [x] Validação das respostas HTTP antes de atualizar a interface.
- [x] Testes do front, build e workflow de verificação para GitHub.

**O que falta nesta frente:**

- [x] Integrar a API real entregue pelo Dev 5 e testar os resultados dos Devs 3 e 4.
- [ ] Conferir os fluxos completos de sucesso e erro com o back-end ligado, no navegador.
- [ ] Fazer o ensaio final de apresentação e revisar responsividade e acessibilidade.

**Critério de conclusão:** a interface deve continuar funcionando em modo mock e também realizar upload → treino → previsão em modo real, sem apresentar dados simulados como resultados reais.

### Dev 2 — dados, ingestão e qualidade (Concluído [x])

**Responsabilidade:** entregar dados confiáveis aos modelos e ao servidor.

**Área implementada:** `backend/app/data/`, testes em `backend/tests/test_data.py` e bases acadêmicas em `data/examples/`.

**Tarefas concluídas:**

- [x] Implementar leitura de CSV, JSON e XML no Python, normalizando os três formatos para a mesma estrutura tabular (`backend/app/data/loader.py`).
- [x] Validar as 13 colunas, tipos, limites físicos, IDs únicos e classes/culturas aceitas (`backend/app/data/validator.py`).
- [x] Reproduzir no servidor os limites de 2 MB e 10.000 registros com rejeição imediata.
- [x] Rejeitar arquivos vazios, corrompidos ou incompatíveis com mensagens claras e estruturadas em exceções de domínio.
- [x] No XML, rejeitar DTD, entidades (XXE), atributos e elementos aninhados com `defusedxml`.
- [x] Retornar dados normalizados, resumo estatístico e envelope compatível com `Dataset` (`mode: "real"`).
- [x] Gerar e documentar 4 bases de teste acadêmico com variação edafoclimática (`safra_soja_favoravel.csv`, `safra_milho_seca_severa.json`, `safra_algodao_cerrado.xml`, `safra_mista_sul.csv`).
- [x] Testar os três formatos e os tipos nativos do JSON com 18 testes automatizados aprovados no pytest.

Consulte a instalação, a execução e as políticas do servidor no [guia do back-end](backend/README.md).

**Entrega aos outros devs:** registros normalizados para a API e dados tabulares para regressão/classificação, com esquema e regras de limpeza explícitos. A imputação aprendida deve ocorrer dentro dos pipelines de treino dos Devs 3 e 4, depois da divisão treino/teste.

**Critério de conclusão:** importar o mesmo conteúdo em formatos diferentes deve produzir dados e resumos equivalentes; arquivos inválidos devem falhar de forma controlada.

### Dev 3 — regressão de produtividade (Concluído [x])

**Responsabilidade:** prever `produtividade_sc_ha`, em sacas por hectare.

**Área implementada:** `backend/app/ml/regression.py`, pré-processamento compartilhado em `backend/app/ml/` e testes de regressão em `backend/tests/`.

**Tarefas:**

- [x] Definir a lista explícita de preditores com base no contrato: seis variáveis numéricas e cultura. Município fica como contexto da interface.
- [x] Excluir `produtividade_sc_ha`, `risco_quebra` e identificadores das features.
- [x] Criar um pipeline com imputação, encoding e, quando necessário, escala; ajustar tudo somente no treino.
- [x] Implementar os três regressores selecionáveis pela interface: Random Forest, Árvore de Decisão e KNN.
- [x] Validar e aplicar os hiperparâmetros permitidos para cada algoritmo.
- [x] Comparar com um baseline, como a média do treino, mantendo a mesma divisão para comparações.
- [x] Calcular MAE, RMSE e R² no teste e gerar a auditoria completa dos valores reais e previstos.
- [x] Entregar o pipeline ajustado para inferência posterior, com seed, configuração e vínculo com o dataset.
- [x] Testar treino, previsão e casos inviáveis; documentar como interpretar as métricas.

**Entrega ao Dev 5:** funções de treino/avaliação e de inferência, pipeline ajustado, configuração aplicada e métricas no formato de `TrainingResult`. O Dev 5 registra o artefato sob um `model_id`.

**Critério de conclusão:** um novo cenário válido deve gerar uma previsão usando o mesmo pré-processamento do treino, sem receber a produtividade observada e sem treinar novamente durante a inferência.

### Dev 4 — classificação de risco (Concluído [x])

**Responsabilidade:** prever `risco_quebra`, com classes `Baixo`, `Moderado` e `Alto`.

**Área implementada:** `backend/app/ml/classification.py` e testes de classificação em `backend/tests/`.

**Tarefas:**

- [x] Alinhar o pré-processamento com o Dev 3, mantendo pipelines ajustados separadamente por tarefa.
- [x] Excluir os dois alvos e os identificadores das features.
- [x] Implementar Random Forest, Árvore de Decisão e KNN para classificação.
- [x] Validar critérios e hiperparâmetros específicos de classificação; não reutilizar critérios de regressão em árvores classificadoras.
- [x] Verificar suporte das classes antes do split e da avaliação; usar estratificação quando viável.
- [x] Calcular acurácia, F1 ponderado, precisão e recall ponderados.
- [x] Gerar matriz de confusão e auditoria do mesmo teste, com ordem explícita das classes.
- [x] Retornar probabilidades somente quando calculadas pelo classificador; caso contrário, retornar `null`.
- [x] Criar testes para classes ausentes, suporte insuficiente, parâmetros, persistência e inferência.
- [x] Documentar que aprender os rótulos sintéticos atuais não comprova previsão de risco agrícola real.

**Entrega ao Dev 5:** funções de treino/avaliação e inferência, pipeline ajustado, classes, métricas e auditoria no formato do contrato.

Consulte o [guia de entrega do Dev 4](docs/entrega_dev4.md). O módulo está conectado às rotas HTTP do Dev 5.

**Critério de conclusão:** a soma da matriz deve corresponder ao tamanho do teste, a acurácia deve corresponder à diagonal e as probabilidades, quando existentes, devem respeitar a ordem das classes e somar 1.

### Dev 5 — API Python e integração do back-end (Concluído [x])

**Responsabilidade:** expor as entregas dos Devs 2–4 por HTTP, preservando o estado correto de bases e modelos.

**Área implementada:** `backend/app/main.py` (factory, CORS e tratadores de erro), `backend/app/errors.py`, `backend/app/routes/`, `backend/app/services/model_registry.py` e testes HTTP em `backend/tests/test_api.py`.

**Tarefas concluídas:**

- [x] Criar a aplicação Flask com factory testável e execução na porta 8000.
- [x] Implementar `/api/health`, `/api/data`, `/api/upload`, `/api/model/train` e `/api/predict`.
- [x] Conectar a ingestão do Dev 2 e os pipelines dos Devs 3 e 4, sem duplicar suas regras nas rotas.
- [x] Disponibilizar `safra_mista_sul.csv` como base padrão para a carga inicial.
- [x] Gerenciar `dataset_id` e `model_id`, mantendo artefato, tarefa e configuração associados.
- [x] Impedir previsão com modelo de outra base/tarefa e cultura ausente no treinamento.
- [x] Manter modelos de regressão e classificação independentes e combinar apenas tarefas solicitadas.
- [x] Preservar o estado válido anterior quando upload ou treino falharem.
- [x] Configurar CORS local e erros JSON padronizados em português.
- [x] Documentar dependências, execução, armazenamento e comportamento com múltiplos clientes.
- [x] Cobrir as rotas e o fluxo upload → treino → previsão com testes HTTP.

**Rotas expostas:** `GET /api/health`, `GET /api/data` (com `?dataset_id=` opcional), `POST /api/upload`, `POST /api/model/train` e `POST /api/predict`. As rotas apenas orquestram os módulos existentes; regras de dados e de aprendizado permanecem nos módulos dos Devs 2–4.

**Estado do servidor:** bases e modelos ficam em memória, compartilhados por todos os clientes da mesma instância e descartados ao reiniciar o processo. O mesmo conteúdo normalizado gera o mesmo `dataset_id`; cada treino gera um novo `model_id`. Não há autenticação nem isolamento por usuário nesta versão acadêmica. Os detalhes estão no [guia do back-end](backend/README.md).

**Erros:** envelope `{"erro": {"codigo": ..., "mensagem": ...}}` em português, nos status 400, 404, 409, 413, 415, 422 e 500. Falhas inesperadas expõem mensagem genérica e registram o traceback apenas no log do servidor.

**Verificações executadas:**

| Verificação | Resultado |
| --- | --- |
| `pytest backend/tests -q` | 68 testes aprovados |
| `ruff check backend` | Sem problemas |
| `pnpm test` | 26 testes do front-end aprovados |
| `pnpm build` | Aprovado, com o aviso conhecido de chunk acima de 500 kB |
| Fluxo HTTP real | `health` 200 → `upload` 201 → dois `model/train` 201 → `predict` 200 |

As respostas reais do servidor também foram submetidas aos validadores de contrato do front (`frontend/src/services/contracts.ts`) e aprovadas.

**Entrega ao Dev 1:** API executável, instruções de configuração e respostas compatíveis com os tipos e validadores existentes. Usar `mode: "real"` nas respostas da API.

**Critério de conclusão:** o front deve operar com `VITE_USE_MOCK=false`, sem mudanças no formato dos componentes e sem fallback silencioso para mocks.

## 3. Ordem de implementação e integração

| Etapa | Participantes | Resultado esperado |
| --- | --- | --- |
| 1. Alinhar o contrato | Devs 1 e 5, com revisão dos Devs 2–4 | Nomes, tipos, unidades, limites e erros combinados |
| 2. Desenvolver em paralelo | Dev 1 mantém o front; Dev 2 cria ingestão; Dev 5 cria a estrutura HTTP | Interface independente e base de dados validada |
| 3. Implementar os modelos | Devs 3 e 4, após a entrega do Dev 2 | Pipelines e avaliações reais por tarefa |
| 4. Conectar o servidor | Dev 5 com Devs 2–4 | API completa conforme o contrato |
| 5. Integrar e apresentar | Dev 1 com Dev 5; revisão de toda a equipe | Fluxo real testado e contribuição individual explicável |

**Regra de colaboração:** cada dev trabalha em sua frente, abre um PR descrevendo o que entregou e inclui evidências dos testes pertinentes. Mudanças em arquivos compartilhados devem ser combinadas para evitar contratos divergentes. Os nomes dos responsáveis pelos papéis 2–5 devem ser preenchidos quando a equipe fechar a distribuição.

## 4. Estrutura do repositório

```text
ML_AGROSENSE/
├── AGENTS.md                  # orientações para futuras alterações
├── iniciar_frontend.ps1       # inicialização local no Windows
├── frontend/
│   ├── src/
│   │   ├── components/        # common, forms, tables, layout, datasets e models
│   │   ├── config/            # navegação compartilhada
│   │   ├── hooks/             # estado e operações da base/modelos
│   │   ├── pages/             # quatro áreas da aplicação
│   │   ├── services/          # mock, HTTP, parser e validação do contrato
│   │   ├── mocks/             # fixtures reproduzíveis
│   │   ├── lib/               # esquema e cálculos didáticos
│   │   ├── types/             # tipos de domínio e contrato
│   │   └── tests/             # domínio, XML, HTTP e componentes/estado
│   └── public/examples/       # arquivos disponíveis para download na interface
├── backend/                   # API Flask, ingestão, pipelines e testes HTTP
├── data/examples/             # cópias dos exemplos para o back-end
├── docs/                      # contrato, arquitetura, revisão e apresentação
└── .github/workflows/         # verificação do front em teste/build
```

## 5. Executar e verificar o front-end

Requisitos: **Node.js 22.12+** e **pnpm 11**. Não é necessário Python para testar o modo demonstração.

Na raiz do repositório:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abrir [http://127.0.0.1:5173](http://127.0.0.1:5173). No Windows, também é possível executar `./iniciar_frontend.ps1` na raiz; o script usa pnpm no PATH ou o runtime local do Codex quando disponível.

Na pasta `frontend/`, os comandos adicionais são:

| Comando | Finalidade |
| --- | --- |
| `pnpm test` | Executar os testes automatizados |
| `pnpm build` | Verificar TypeScript e gerar o build de produção |
| `pnpm preview` | Servir o build já gerado para conferência |
| `pnpm examples` | Regenerar as três bases sintéticas nas duas pastas de exemplos |

O workflow de GitHub executa testes e build para alterações no front. Cada integrante também deve rodar as verificações locais pertinentes antes de abrir seu PR.

## 6. Executar e conectar a API

Requisitos: Python 3.10 ou superior. Na raiz do repositório, no Windows:

```powershell
python -m venv backend/.venv
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd backend
./.venv/Scripts/python.exe -m app.main
```

Em Linux/macOS:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd backend
./.venv/bin/python -m app.main
```

A API escuta em `http://127.0.0.1:8000/api` e `GET /api/health` confirma a prontidão. Os testes do back-end rodam com `python -m pytest backend/tests -q` a partir da raiz. Consulte a política de armazenamento e o detalhamento das rotas no [guia do back-end](backend/README.md).

Copiar `frontend/.env.example` para `frontend/.env.local` e configurar:

```ini
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
```

Reiniciar o Vite após alterar as variáveis. O back-end permite `http://127.0.0.1:5173` e `http://localhost:5173` no CORS.

As respostas são validadas em tempo de execução. Uma resposta HTTP 200 pode ser rejeitada por campos ausentes, identificadores incorretos ou números inconsistentes. O [contrato](docs/contrato_api.md) permanece como referência comum.

## 7. Critérios de conclusão do projeto

- [x] Upload real dos três formatos, com esquema validado no servidor.
- [x] Troca de base atualiza os dados e invalida os modelos anteriores na interface.
- [x] Treinamento real de regressão e classificação sem reiniciar a aplicação.
- [x] Hiperparâmetros da interface aplicados aos estimadores correspondentes.
- [x] Métricas, matriz e auditoria consistentes com o mesmo teste.
- [x] Simulador usa os modelos registrados para a base ativa.
- [x] Erros de arquivo, validação, treino e rede tratados sem perder estado válido.
- [ ] Ensaio do fluxo completo no navegador, com o back-end ligado.
- [ ] Instalação e execução reproduzidas por outro integrante.
- [ ] Responsabilidades individuais e limitações dos resultados explicadas na apresentação.

## 8. Dados, limites e documentação

As bases fornecidas são **sintéticas**: Soja em CSV, Milho em JSON e Algodão em XML, com 300 registros em cada arquivo. As fórmulas de produtividade e risco são didáticas, sem validade agronômica comprovada. As métricas do mock não avaliam estimadores reais.

O mapa depende de internet para o fundo cartográfico; a tabela de coordenadas permanece disponível. O estado do front fica em memória e é reiniciado ao recarregar a página.

| Documento | Quando consultar |
| --- | --- |
| [Contrato da API v1.0](docs/contrato_api.md) | Manter e validar a integração entre front e back-end |
| [Guia do front-end](frontend/README.md) | Executar e manter a interface |
| [Guia do back-end](backend/README.md) | Instalar, executar, testar e entender o estado da API |
| [Arquitetura dos componentes](docs/arquitetura_frontend.md) | Reutilizar e organizar componentes React |
| [Revisão técnica](docs/revisao_tecnica.md) | Consultar problemas corrigidos e melhorias pendentes |
| [Roteiro do Dev 1](docs/roteiro_dev1.md) | Preparar a demonstração da interface |
| [AGENTS.md](AGENTS.md) | Orientar futuras alterações no repositório |
| [Análise inicial e divisão proposta](docs/analise_e_divisao.md) | Consultar o contexto do planejamento |

As [propostas iniciais de Streamlit](docs/proposta_original_streamlit.md) e de [front-end React](docs/proposta_frontend_inicial.md) foram preservadas como histórico. A implementação atual segue React e o contrato v1.0; comandos e responsabilidades antigos não substituem este README.

O planejamento inicial menciona apresentação em **04/11** e entrega final em **11/11**. Confirmar datas e critérios no cronograma oficial da disciplina.
