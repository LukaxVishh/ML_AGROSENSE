# Instruções para agentes — ML_AGROSENSE

## Contexto e escopo

- Projeto **AgroSense**, da disciplina **Tópicos Especiais em Software**, professor **Rhafael Freitas Da Costa**.
- Este repositório é independente de `predicao_agricola`/AgroData. Não copiar resultados, integrantes ou regras daquele projeto como se fossem deste.
- Fernando é o **Dev 1**: estrutura do repositório, front-end React + TypeScript, mocks, contrato da API e integração da interface.
- O back-end real será implementado pelos Devs 2–5. Não expandir uma tarefa de front para criar modelos ou servidor sem solicitação do usuário.
- A instrução do usuário prevalece sobre este arquivo. Não criar etapas adicionais de aprovação para alterações locais reversíveis já autorizadas.

## Documentos que descrevem o estado atual

1. `README.md` e `frontend/README.md`: implementação e execução.
2. `docs/contrato_api.md`: comportamento do contrato HTTP v1.0.
3. `frontend/src/types/index.ts`: tipos TypeScript.
4. `frontend/src/services/contracts.ts`: validação das respostas reais em tempo de execução.
5. `docs/revisao_tecnica.md`: achados e pendências da revisão.
6. `backend/README.md`: entregas da equipe de back-end.

`docs/proposta_original_streamlit.md` e `docs/proposta_frontend_inicial.md` são históricos. Não restaurar Streamlit, contratos incompatíveis ou a divisão antiga a partir desses arquivos. `docs/analise_e_divisao.md` registra a análise anterior à implementação; consultar o README para o estado presente.

## Arquitetura e divisão

| Área | Responsabilidade |
| --- | --- |
| `frontend/src/pages/`, `components/` | Interface do Dev 1 |
| `frontend/src/services/` | Interface `AgroService`, implementações mock/HTTP, parser e validação de respostas |
| `frontend/src/lib/` | Regras e cálculos didáticos usados na demonstração |
| `frontend/src/mocks/` | Fixtures determinísticas |
| `frontend/src/hooks/` | Estado e operações dos fluxos, sem layout ou navegação |
| `backend/app/data/` (planejado) | Dev 2: ingestão e validação de dados |
| `backend/app/ml/` (planejado) | Dev 3: regressão; Dev 4: classificação |
| `backend/app/routes/`, `services/` (planejado) | Dev 5: API e registro de bases/modelos |

Componentes não devem montar URLs nem duplicar a camada de serviço. Mudanças no contrato devem atualizar tipos, validadores, mock, cliente HTTP, documentação e testes relevantes juntos.

## Regras de comportamento

- Mock é o modo padrão e deve permanecer identificado. Uma falha da API nunca pode ativar mock silenciosamente.
- Mocks não treinam estimadores reais. Não apresentar seus números como desempenho de Random Forest, árvore ou KNN.
- A origem dos dados fornecidos é sintética. Regras de risco e produtividade são didáticas, sem comprovação agronômica.
- Preservar o vínculo `dataset_id` → `model_id` → tarefa/configuração. Trocar a base invalida os modelos na interface; editar um cenário invalida sua previsão anterior.
- Falha de upload ou de treino preserva o estado válido anterior e mostra o erro. Não transformar métricas ausentes em zero.
- Registros importados seguem as 13 colunas, tipos, limites e unicidade de ID do contrato. Validar números finitos. JSON exige números nativos; CSV/XML admitem conversão de números textuais.
- XML tem estrutura simples `talhoes/talhao/campo`, sem DTD, entidades, atributos ou filhos aninhados nos campos.
- O simulador usa apenas culturas presentes na base ativa. Modelos reais também deverão validar a cultura observada no treinamento.
- Não enviar os dois alvos históricos como features. Na API real, ajustar imputação, escala e encoding somente no treino, dentro de pipelines.
- Probabilidades ausentes são `null`. Métricas, matriz de confusão e auditoria devem representar o mesmo conjunto de teste.
- Manter mensagens em português do Brasil, unidades explícitas, navegação por teclado e estados de vazio/carregamento/erro.

## Ferramentas e verificações

Requisitos: Node.js 22.12+ e pnpm 11. O lockfile é `frontend/pnpm-lock.yaml`; evitar criar lockfiles de outro gerenciador.

Na pasta `frontend/`:

```text
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

- Usar os testes pertinentes ao comportamento alterado. Validar respostas reais com testes HTTP simulados; não depender de uma API implementada para testar o front.
- XML é testado em ambiente DOM (`jsdom`); os demais testes de domínio/serviço usam Node.
- Conferir no navegador mudanças visuais ou de interação. Registrar limitações se a verificação não puder ocorrer.
- Reutilizar os componentes em `components/common`, `forms`, `tables`, `layout`, `datasets` e `models`. Seguir `docs/arquitetura_frontend.md` ao extrair novas responsabilidades.
- `pnpm examples` regenera as cópias em `frontend/public/examples/` e `data/examples/`; manter ambas sincronizadas. Não editar uma cópia isoladamente.
- O launcher Windows é `iniciar_frontend.ps1`, na raiz. Caminhos pessoais devem ficar fora dos módulos da aplicação.
- Não versionar `node_modules/`, `dist/`, credenciais ou `.env.local`. Não remover arquivos ou alterações do usuário sem relação com a tarefa.
- Não fazer commit, push ou deploy como consequência automática de uma revisão. Seguir a autorização da tarefa.

## Entrega

Reportar o que mudou, verificações realizadas e pendências relevantes. Distinguir implementação do front, simulação de contrato e funcionalidades reais ainda aguardando o back-end. Não prometer datas ou requisitos do edital com base apenas em propostas históricas.
