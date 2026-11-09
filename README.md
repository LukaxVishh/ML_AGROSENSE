# AgroSense

Aplicação acadêmica para explorar dados agrícolas, visualizar talhões no mapa e simular cenários de produtividade e risco de safra.

| Informação | Definição |
| --- | --- |
| Disciplina | **Tópicos Especiais em Software** |
| Professor | **Rhafael Freitas Da Costa** |
| Equipe | Até cinco desenvolvedores |
| Dev 1 | **Fernando de Araujo Pereira** — base, front-end e mocks |
| Interface | React + TypeScript + Vite |
| Back-end planejado | API Python; Flask é a proposta inicial |

## 1. Objetivo e estado atual

O AgroSense reúne quatro áreas da mesma aplicação:

| Área | O que o usuário pode fazer | Estado atual |
| --- | --- | --- |
| Dados | Importar CSV/JSON/XML, validar as 13 colunas, buscar, ordenar e paginar os registros | Implementado no front |
| Dashboard e mapa | Filtrar cultura/município, consultar marcadores e explorar gráficos de barras, rosca, dispersão e correlação | Implementado com dados locais |
| Machine Learning | Escolher tarefa, algoritmo e hiperparâmetros; consultar métricas e auditoria | Contrato de treinamento simulado |
| Simulador | Informar condições do talhão e consultar produtividade e/ou classe de risco | Respostas demonstrativas das tarefas treinadas no mock |

**A entrega atual é a base do Dev 1.** O front funciona de forma independente, com 300 talhões demonstrativos e importação local de arquivos. Não há treinamento real de estimadores no navegador. A API Python e os modelos reais serão desenvolvidos pelos Devs 2–5.

A arquitetura já permite trocar o serviço mockado pelo cliente HTTP. Essa troca depende de o back-end implementar o [contrato da API v1.0](docs/contrato_api.md) e passar pelos testes de integração.

## 2. Divisão do trabalho

Fernando assume o Dev 1. Os papéis dos Devs 2–5 ainda não têm nomes atribuídos neste documento. A divisão abaixo define entregas e responsabilidades; os caminhos do back-end são sugestões de organização e **ainda não representam arquivos implementados**.

| Dev | Frente principal | Entrega para o grupo | Status | Depende de |
| :---: | :--- | :--- | :---: | --- |
| **1 — Fernando** | Base, componentes React, mocks e integração da interface | Front executável sem Python, tipos e contrato para o back-end | Concluído (Front) | Contrato alinhado com Dev 5 |
| **2** | Dados, importação e validação | Ingestão CSV/JSON/XML, validação 13 colunas, 4 bases e 17 testes | **Concluído [x]** | Esquema de 13 colunas |
| **3** | Regressão de produtividade | Pipeline de regressão, métricas, persistência joblib e inferência | Implementado (módulo Python) | Dados do Dev 2 |
| **4** | Classificação de risco | Pipeline de classificação, matriz 3x3, probabilidades e joblib | Pendente [ ] | Dados do Dev 2; pré-processamento alinhado com Dev 3 |
| **5** | API Python e integração do back-end | Servidor Flask REST, rotas HTTP e registro de modelos pré-carregados | Pendente [ ] | Contrato e funções de dados/modelos |

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

- [ ] Integrar a API real entregue pelo Dev 5 e testar os resultados dos Devs 3 e 4.
- [ ] Conferir os fluxos completos de sucesso e erro com o back-end ligado.
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
- [x] Testar os três formatos com 17 testes automatizados aprovados no pytest (100% green).

*Consulte as instruções detalhadas e próximos passos dos Devs 3, 4 e 5 no documento [`backend/README.md`](file:///c:/Users/kinha/OneDrive/Área%20de%20Trabalho/topicos%20software/ML_AGROSENSE/backend/README.md).*

**Entrega aos outros devs:** registros normalizados para a API e dados tabulares para regressão/classificação, com esquema e regras de limpeza explícitos. A imputação aprendida deve ocorrer dentro dos pipelines de treino dos Devs 3 e 4, depois da divisão treino/teste.

**Critério de conclusão:** importar o mesmo conteúdo em formatos diferentes deve produzir dados e resumos equivalentes; arquivos inválidos devem falhar de forma controlada.

### Dev 3 — regressão de produtividade

**Responsabilidade:** prever `produtividade_sc_ha`, em sacas por hectare.

**Área sugerida:** `backend/app/ml/regression.py`, pré-processamento compartilhado em `backend/app/ml/` e testes de regressão em `backend/tests/`.

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

### Dev 4 — classificação de risco

**Responsabilidade:** prever `risco_quebra`, com classes `Baixo`, `Moderado` e `Alto`.

**Área sugerida:** `backend/app/ml/classification.py` e testes de classificação em `backend/tests/`.

**Tarefas:**

- [ ] Alinhar o pré-processamento com o Dev 3, mantendo pipelines ajustados separadamente por tarefa.
- [ ] Excluir os dois alvos e os identificadores das features.
- [ ] Implementar Random Forest, Árvore de Decisão e KNN para classificação.
- [ ] Validar critérios e hiperparâmetros específicos de classificação; não reutilizar critérios de regressão em árvores classificadoras.
- [ ] Verificar suporte das classes antes do split e da avaliação; usar estratificação quando viável.
- [ ] Calcular acurácia, F1 ponderado, precisão e recall ponderados.
- [ ] Gerar matriz de confusão e auditoria do mesmo teste, com ordem explícita das classes.
- [ ] Retornar probabilidades somente quando calculadas pelo classificador; caso contrário, retornar `null`.
- [ ] Testar classes ausentes, amostras insuficientes, categorias desconhecidas e inferência.
- [ ] Documentar que aprender os rótulos sintéticos atuais não comprova previsão de risco agrícola real.

**Entrega ao Dev 5:** funções de treino/avaliação e inferência, pipeline ajustado, classes, métricas e auditoria no formato do contrato.

**Critério de conclusão:** a soma da matriz deve corresponder ao tamanho do teste, a acurácia deve corresponder à diagonal e as probabilidades, quando existentes, devem respeitar a ordem das classes e somar 1.

### Dev 5 — API Python e integração do back-end

**Responsabilidade:** expor as entregas dos Devs 2–4 por HTTP, preservando o estado correto de bases e modelos.

**Área sugerida:** `backend/app/routes/`, `backend/app/services/`, inicialização da aplicação, `backend/requirements.txt` e testes HTTP em `backend/tests/`.

**Tarefas:**

- [ ] Criar a aplicação Python. Flask é a proposta inicial; qualquer mudança deve preservar o contrato combinado.
- [ ] Implementar `/api/health`, `/api/data`, `/api/upload`, `/api/model/train` e `/api/predict`.
- [ ] Conectar a ingestão do Dev 2 e os pipelines dos Devs 3 e 4, sem reimplementar suas regras nas rotas.
- [ ] Disponibilizar uma base padrão para a carga inicial da interface.
- [ ] Gerenciar `dataset_id` e `model_id`, com tarefa, configuração e versão associadas a cada modelo.
- [ ] Impedir previsão com modelo de outra base/tarefa e cultura ausente no treinamento.
- [ ] Manter modelos de regressão e classificação independentes; retornar apenas as tarefas solicitadas e disponíveis.
- [ ] Preservar o estado válido anterior quando upload ou treino falharem.
- [ ] Configurar CORS para as origens locais do front e retornar erros JSON padronizados.
- [ ] Documentar dependências, ambiente, instalação e comandos reais de execução do servidor.
- [ ] Definir armazenamento, descarte de artefatos e comportamento com múltiplos clientes.
- [ ] Testar as rotas e executar a integração final junto do Dev 1.

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
├── backend/                   # por enquanto, guia de implementação da equipe
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

## 6. Conectar a API quando estiver pronta

Copiar `frontend/.env.example` para `frontend/.env.local` e configurar:

```ini
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
```

Reiniciar o Vite após alterar as variáveis. O back-end deve permitir `http://127.0.0.1:5173` e `http://localhost:5173` no CORS.

As respostas são validadas em tempo de execução. Uma resposta HTTP 200 pode ser rejeitada por campos ausentes, identificadores incorretos ou números inconsistentes. O [contrato](docs/contrato_api.md) é a referência para implementar o servidor. Seus comandos de instalação e execução serão acrescentados quando o back-end existir.

## 7. Critérios de conclusão do projeto

- [ ] Upload real dos três formatos, com esquema validado no servidor.
- [ ] Troca de base atualiza os dados e invalida os modelos anteriores na interface.
- [ ] Treinamento real de regressão e classificação sem reiniciar a aplicação.
- [ ] Hiperparâmetros da interface aplicados aos estimadores correspondentes.
- [ ] Métricas, matriz e auditoria consistentes com o mesmo teste.
- [ ] Simulador usa os modelos registrados para a base ativa.
- [ ] Erros de arquivo, validação, treino e rede tratados sem perder estado válido.
- [ ] Instalação e execução reproduzidas por outro integrante.
- [ ] Responsabilidades individuais e limitações dos resultados explicadas na apresentação.

## 8. Dados, limites e documentação

As bases fornecidas são **sintéticas**: Soja em CSV, Milho em JSON e Algodão em XML, com 300 registros em cada arquivo. As fórmulas de produtividade e risco são didáticas, sem validade agronômica comprovada. As métricas do mock não avaliam estimadores reais.

O mapa depende de internet para o fundo cartográfico; a tabela de coordenadas permanece disponível. O estado do front fica em memória e é reiniciado ao recarregar a página.

| Documento | Quando consultar |
| --- | --- |
| [Contrato da API v1.0](docs/contrato_api.md) | Implementar e integrar as rotas |
| [Guia do front-end](frontend/README.md) | Executar e manter a interface |
| [Guia do back-end](backend/README.md) | Preparar as entregas dos Devs 2–5 |
| [Arquitetura dos componentes](docs/arquitetura_frontend.md) | Reutilizar e organizar componentes React |
| [Revisão técnica](docs/revisao_tecnica.md) | Consultar problemas corrigidos e melhorias pendentes |
| [Roteiro do Dev 1](docs/roteiro_dev1.md) | Preparar a demonstração da interface |
| [AGENTS.md](AGENTS.md) | Orientar futuras alterações no repositório |
| [Análise inicial e divisão proposta](docs/analise_e_divisao.md) | Consultar o contexto do planejamento |

As [propostas iniciais de Streamlit](docs/proposta_original_streamlit.md) e de [front-end React](docs/proposta_frontend_inicial.md) foram preservadas como histórico. A implementação atual segue React e o contrato v1.0; comandos e responsabilidades antigos não substituem este README.

O planejamento inicial menciona apresentação em **04/11** e entrega final em **11/11**. Confirmar datas e critérios no cronograma oficial da disciplina.


Entrega do Dev 3: consulte o [guia de regressão](docs/entrega_dev3.md). O módulo Python está implementado; a integração HTTP depende do Dev 5. O artefato joblib contém pipeline e metadados e deve ser carregado com `load_regression`.
