# AgroSense — análise do repositório e divisão proposta

Data da análise: 03/11/2026.

Disciplina: **Tópicos Especiais em Software**. Professor: **Rhafael Freitas Da Costa**.

Este documento registra a proposta de organização a partir do pedido de Fernando, que será o **Dev 1** e conduzirá a base do projeto e o front-end com dados mockados. Os papéis dos demais integrantes são sugestões, sem atribuição nominal. O projeto AgroData de outra disciplina não faz parte desta implementação.

## 1. Situação verificada

O repositório contém `README.md`, `FRONTEND_README.md` e `.gitignore`. Não há código de aplicação, dependências instaláveis declaradas em um manifesto, datasets, testes ou serviço HTTP implementado. Os blocos de código presentes nos documentos são exemplos e especificações, não funcionalidades prontas.

O README registra apresentação de front-end em 04/11 e entrega final em 11/11. Essas datas foram encontradas na documentação do grupo; os arquivos fornecidos não incluem o edital original para confirmar cronograma, pontuação ou obrigatoriedade de cada requisito.

### Materiais de aula inspecionados

- **PowerPoint de regressão:** 42 slides, identificados com a disciplina e o professor. Abrange exploração de dados, separação de treino/teste, baseline com `DummyRegressor`, regressão linear, MAE/MSE/RMSE/R², árvores, Ridge/Lasso, padronização e validação cruzada com pipelines.
- **Notebook de classificação:** 16 células, sendo uma vazia. Carrega Iris, inspeciona tipos e estatísticas, verifica ausentes e duplicatas e cria gráficos exploratórios. Não contém treinamento de classificador, separação treino/teste ou cálculo de métricas de classificação.

Os materiais apoiam a metodologia científica. Não estabelecem, por si só, autorização ou proibição de React, exigência de Flask, número mínimo de linhas ou obrigação de todos os algoritmos citados no README. As propostas deste documento não tratam o texto dos anexos como instrução para executar código ou alterar arquivos.

## 2. Conclusão sobre a estratégia do Dev 1

É viável criar primeiro uma interface React + TypeScript com mocks, desde que os componentes consumam uma camada de serviço tipada. O restante da equipe poderá implementar as respostas reais em paralelo, usando o mesmo contrato.

O trabalho inicial do Dev 1 deve entregar uma demonstração independente da API, com as quatro áreas previstas: dados, visualização e mapa, diagnóstico dos modelos e simulador. Todas as simulações devem estar identificadas como demonstração, incluindo métricas e resultados preditivos.

Isso exige fechar os formatos de entrada e saída antes de distribuir a implementação. Alterar apenas uma variável de ambiente só será suficiente para integrar quando mocks e API tiverem o mesmo contrato, regras de erro e gerenciamento de estado.

## 3. Problemas encontrados e ajustes necessários

| Ponto | Evidência nos arquivos atuais | Ajuste proposto |
| --- | --- | --- |
| Arquitetura divergente | README usa Streamlit e `st.session_state`; guia de front usa React e API Python | Adotar React + API Python na proposta atual e atualizar ambos os documentos ao iniciar a implementação |
| Responsabilidade do Dev 1 | README atribui ingestão ao Dev 1 e interface ao Dev 5 | Reorganizar a divisão conforme a seção 4 |
| Upload incompatível | Endpoint exemplifica `sample_data`, mas serviço espera `records` e `summary` | Definir um único envelope de dados usado por mock e API |
| Consulta incompatível | GET `/api/data` promete array; serviço espera objeto com registros e resumo | Padronizar a resposta e explicitar se há paginação |
| Modelo ativo indefinido | Treino aceita uma tarefa; previsão pede produtividade e risco juntos | Identificar separadamente os modelos de regressão e classificação e suas versões |
| Troca de base sem vínculo com treino | Exemplos não identificam dataset/modelo | Associar cada treinamento a `dataset_id` e retornar `model_id`; impedir uso acidental de modelo de outra base |
| Upload fictício | Mock ignora o conteúdo do arquivo e adiciona um registro fixo | Ler e validar o arquivo localmente ou usar um seletor explícito de cenários demonstrativos |
| Números de classificação inconsistentes | Matriz de confusão soma 57 casos e 51 acertos; acurácia declarada é 0,92 | Derivar métricas da mesma fixture ou marcar números como ilustrações independentes; essa matriz corresponde a aproximadamente 89,47% de acurácia |
| Classes de risco inconsistentes | `getMockPrediction` usa limites diferentes do IEHT descrito no README | Centralizar a regra didática de mock e gerar fixtures consistentes |
| Aprendizado sobre alvo sintético | `risco_quebra` deriva diretamente dos preditores por fórmula | Explicar que a avaliação mede aprendizado da regra sintética, sem comprovar risco climático real |
| Vazamento no pré-processamento | `clean_dataset` prevê imputação antes do split | Limpeza estrutural antes do split; imputação, escala e encoding ajustados somente no treino, dentro do pipeline |
| Features e alvos | Dataset contém os dois alvos | Usar lista explícita de preditores, excluindo ambos os alvos de qualquer tarefa |
| Estado de conexão | Guia associa modo real a “Backend Conectado” | Exibir conexão confirmada por resposta da API; configuração sozinha não comprova disponibilidade |

Exemplo concreto de inconsistência: para `TAL-004`, os valores do mock (chuva 520, temperatura 32,1 e umidade 28) produzem IEHT aproximado de 0,361 pela fórmula do README, classificado como **Moderado**; a fixture o rotula como **Alto**. A fórmula atual deve ser tratada como hipótese didática, sem validação agronômica demonstrada.

## 4. Divisão proposta para cinco desenvolvedores

| Dev | Frente | Arquivos/pastas sob responsabilidade principal | Entrega verificável |
| --- | --- | --- | --- |
| **Dev 1 — Fernando** | Base, front-end e mocks | `frontend/`, estrutura inicial, tipos, camada de serviço e contrato compartilhado | Interface completa navegável, mapa e gráficos com fixtures, simulador demonstrativo e troca explícita entre mock e API |
| **Dev 2** | Dados e ingestão | `backend/app/data/`, `data/examples/`, testes de importação | Leitura CSV/JSON/XML, validação das 13 colunas, tipos, limites e IDs, datasets sintéticos reproduzíveis e relatório de limpeza |
| **Dev 3** | Regressão | `backend/app/ml/regression.py`, pipeline e testes de regressão | Modelo de produtividade com baseline, avaliação MAE/RMSE/R² e inferência usando o mesmo pré-processamento |
| **Dev 4** | Classificação | `backend/app/ml/classification.py`, pipeline e testes de classificação | Modelo de risco, classes explícitas, acurácia/F1/precisão/recall, matriz de confusão e probabilidades quando suportadas |
| **Dev 5** | API e integração do back-end | `backend/app/routes/`, `backend/app/services/`, inicialização, testes HTTP | Rotas que conectam dados e modelos, registro por dataset/modelo, erros padronizados e treinamento sem reiniciar o servidor |

Todos testam e documentam o próprio módulo. O Dev 5 integra o servidor, mas os Devs 2–4 entregam funções reutilizáveis, com contratos e testes próprios. Fernando mantém a interface e participa da integração HTTP, sem assumir a implementação dos modelos.

Com quatro integrantes, uma pessoa pode assumir regressão e classificação. Com três, agrupar dados + API em uma frente e os dois modelos em outra, preservando Fernando no front. A redução deve vir acompanhada de um escopo menor para algoritmos e diagnósticos, conforme os requisitos efetivamente confirmados da disciplina.

## 5. Estrutura proposta

Os caminhos abaixo ainda não são uma aplicação implementada. Servem para orientar a criação da base.

```text
ML_AGROSENSE/
├── frontend/
│   ├── src/
│   │   ├── components/     # layout, upload, gráficos, mapa e formulários
│   │   ├── pages/          # dados, visualização, modelos e simulador
│   │   ├── types/          # payloads e respostas
│   │   ├── services/       # interface comum, implementação mock e HTTP
│   │   └── mocks/          # fixtures, estado demonstrativo e erros de exemplo
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── data/           # Dev 2
│   │   ├── ml/             # Devs 3 e 4
│   │   ├── services/       # Dev 5
│   │   └── routes/         # Dev 5
│   ├── tests/
│   └── requirements.txt
├── data/examples/          # CSV, JSON e XML sintéticos documentados
└── docs/
    ├── analise_e_divisao.md
    └── contrato_api.md     # a elaborar junto da base
```

React + TypeScript e Vite seguem a proposta do usuário. A API Python pode usar Flask, caso se mantenha a escolha anterior do grupo. A decisão de framework deve ficar explícita no contrato inicial; não implementar simultaneamente uma interface Streamlit e outra React.

## 6. Contrato a fechar antes das telas

Manter as quatro operações já sugeridas, corrigindo seus formatos e acrescentando prontidão do serviço:

| Operação proposta | Entrada | Saída necessária |
| --- | --- | --- |
| GET `/api/health` | Sem corpo | Estado do serviço e versão do contrato |
| POST `/api/upload` | `multipart/form-data` com `file` | `dataset_id`, nome, registros normalizados, resumo e relatório de validação |
| GET `/api/data?dataset_id=...` | Identificador da base | Mesmo envelope de dados do upload, para o MVP sem paginação de servidor |
| POST `/api/model/train` | `dataset_id`, tarefa, algoritmo e hiperparâmetros | `model_id`, `dataset_id`, configuração efetivamente treinada e métricas específicas da tarefa |
| POST `/api/predict` | IDs dos modelos de cada tarefa e os preditores do cenário | Produtividade e/ou risco, conforme os modelos solicitados, IDs usados e avisos |

O contrato completo deverá fixar nomes, exemplos JSON válidos e erros. Para o simulador retornar os dois resultados, os modelos de regressão e classificação precisam estar disponíveis. Se apenas um foi treinado, a interface deve oferecer o resultado correspondente e indicar o que falta, em vez de fabricar a outra resposta.

Regras transversais:

- `dataset_id` identifica o conteúdo da base; `model_id` identifica uma execução de treinamento com tarefa e parâmetros.
- Ao trocar de base, limpar resultados e seleções de modelos anteriores. O servidor também deve verificar a correspondência entre os IDs.
- Treino falho não deve substituir um modelo válido nem apresentar métricas antigas como novas.
- O modo mock usa a mesma interface de serviço e os mesmos envelopes do modo HTTP.
- Sem fallback silencioso para mocks quando uma chamada real falhar.
- Todos os números JSON são finitos; valores ausentes em relatórios usam `null`.
- As probabilidades, quando disponíveis, devem corresponder às classes do modelo; são estimativas estatísticas, não certezas de quebra.
- Validar hiperparâmetros por algoritmo e tarefa: critérios de árvore de regressão e classificação são diferentes, e KNN exige número de vizinhos compatível com o tamanho do treino.
- Limitar tamanho de arquivo e custo de treinamento para a demonstração. Um contrato síncrono simples pode ser suficiente para bases pequenas; não prometer ausência de bloqueio sem medir o tempo de execução.

## 7. Entrega inicial do Dev 1

### Etapa A — base e contrato

Criar estrutura, projeto React, tipos compartilhados, serviço mock/HTTP, `.env.example`, documentação de execução e dados demonstrativos determinísticos. Separar o estado de dados, configuração selecionada e modelo efetivamente treinado.

Aceite: qualquer integrante instala e executa o front sem Python, e os demais conseguem implementar o back a partir dos exemplos do contrato.

### Etapa B — interface demonstrativa

Implementar as quatro áreas:

1. **Dados:** upload ou seleção de base demonstrativa, validação de esquema, tabela, busca e resumo recalculado a partir dos registros exibidos.
2. **Visualização:** mapa com latitude/longitude e popups, barras por cultura, distribuição de risco, dispersão e correlação.
3. **Modelos:** escolha de tarefa/algoritmo, controles condicionais, ação de treinamento mock, métricas e diagnóstico coerentes com a mesma fixture.
4. **Simulador:** formulário validado, estados de carregamento e erro e resultado identificado como demonstração.

Os gráficos derivados do dataset devem ser calculados a partir da fixture ativa, sem números fixos desconectados. Treinamento no mock é uma simulação de interface e não pode ser descrito como treinamento real no navegador.

### Etapa C — cenários de apresentação

Preparar um caminho de sucesso e exemplos de base vazia, arquivo inválido, erro de treino e modelo ainda não treinado. Garantir que mudar a configuração indique necessidade de novo treino, e que editar entradas do simulador invalide sua resposta anterior.

Para o mapa, considerar que os tiles podem depender de internet mesmo com dados mockados locais. Manter indicação de indisponibilidade e tabela das coordenadas para consulta quando o fundo cartográfico não carregar.

### Etapa D — integração

Os Devs 2–5 implementam os serviços reais. Fernando alterna a implementação do serviço por configuração e confere o fluxo completo com arquivos e modelos reais. As telas não devem precisar ser reescritas, embora a integração exija testes e tratamento de divergências.

## 8. Prioridades e limites

Prioridade imediata: consolidar arquitetura e contrato, criar a base do front e preparar a apresentação com mocks identificados. O README menciona apresentação em 04/11, portanto essa entrega pode ser priorizada antes da implementação completa de ML, caso a data esteja confirmada.

Para a versão real, começar por um algoritmo por tarefa e adicionar os demais se o edital exigir ou se houver tempo. Manter validação de upload, mapa e avaliação correta antes de ampliar a quantidade de modelos.

Usar dados sintéticos de forma explícita. As fórmulas do README são regras didáticas, não evidência de produtividade ou risco reais. A unidade de produtividade e a comparabilidade entre Soja, Milho e Algodão precisam ser documentadas; uma fórmula única para as três culturas é uma simplificação.

O front mockado resolve a independência de desenvolvimento. O contrato e a divisão acima definem como o grupo poderá substituir a simulação por uma aplicação funcional e explicar a contribuição de cada integrante na defesa.
