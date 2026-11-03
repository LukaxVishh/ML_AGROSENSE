# AgroSense

Sistema de demonstração de monitoramento agrícola e cenários preditivos.

**Disciplina:** Tópicos Especiais em Software

**Professor:** Rhafael Freitas Da Costa

**Dev 1:** Fernando de Araujo Pereira — base, front-end e mocks.

## Estado atual

O front-end React + TypeScript está implementado e funciona sem Python, com dados demonstrativos. A API e os modelos reais ficam para os Devs 2–5. Não há treinamento real de machine learning no navegador.

A interface inclui quatro áreas: dados, dashboard/mapa, modelos e simulador. A importação lê CSV, JSON e XML; as métricas demonstrativas são calculadas a partir das mesmas previsões usadas no diagnóstico.

## Estrutura

```text
ML_AGROSENSE/
├── frontend/       # aplicação do Dev 1, tipos, mocks e cliente HTTP
├── backend/        # instruções para implementação da equipe
├── data/examples/  # três bases sintéticas de 300 registros
└── docs/           # contrato, divisão e roteiro de apresentação
```

## Executar o front-end

Com Node.js 22.12+ e pnpm 11:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abrir `http://127.0.0.1:5173`. O padrão é modo demonstração. Configuração e comandos de testes/build estão no [guia do front-end](frontend/README.md).

No Windows, também é possível executar `./iniciar_frontend.ps1` na raiz. O script usa pnpm disponível no PATH ou o runtime local do Codex quando presente.

## Divisão da equipe

| Dev | Responsabilidade |
| --- | --- |
| **1 — Fernando** | Base, interface React, mocks e contrato compartilhado |
| **2** | Ingestão CSV/JSON/XML, validação e qualidade dos dados |
| **3** | Regressão de produtividade, avaliação e inferência |
| **4** | Classificação de risco, avaliação e inferência |
| **5** | API Python, estado de bases/modelos e integração |

A divisão dos Devs 2–5 é uma proposta por função, sem atribuição nominal.

## Documentação de trabalho

- [Contrato da API v1.0](docs/contrato_api.md)
- [Front-end implementado e instruções](frontend/README.md)
- [Entregas do back-end](backend/README.md)
- [Análise e divisão do projeto](docs/analise_e_divisao.md)
- [Roteiro de apresentação do Dev 1](docs/roteiro_dev1.md)
- [Estrutura e reutilização dos componentes](docs/arquitetura_frontend.md)
- [Revisão técnica e pendências](docs/revisao_tecnica.md)
- [Instruções para agentes](AGENTS.md)

Os documentos iniciais foram preservados em [proposta original Streamlit](docs/proposta_original_streamlit.md) e [proposta inicial React](docs/proposta_frontend_inicial.md). São registros históricos; a implementação atual segue React e o contrato v1.0. Os comandos Streamlit e as atribuições antigas não descrevem o estado atual.

## Integração futura

O front seleciona entre mock e HTTP por `VITE_USE_MOCK`. Com valor `false`, chama `VITE_API_URL`, inicialmente `http://localhost:8000/api`. A equipe deve implementar o contrato e reiniciar o Vite após mudar a configuração. Uma falha na API não ativa mocks automaticamente.

Trocar de base invalida os modelos. Cada treinamento tem sua tarefa e seu identificador, vinculado à base. O simulador apresenta apenas as tarefas treinadas e informa resultados ausentes.

## Dados e limites

As bases fornecidas são sintéticas e reproduzíveis. As regras de produtividade e risco são didáticas, sem validade agronômica comprovada. As métricas do mock não avaliam estimadores reais. O mapa depende de internet para os tiles; a consulta das coordenadas funciona com os dados locais.

O planejamento inicial menciona apresentação em 04/11 e entrega final em 11/11. Essas datas devem ser conferidas no cronograma oficial da disciplina.
