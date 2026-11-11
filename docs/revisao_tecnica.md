# Revisão técnica e próximos passos

Revisão iniciada em 03/11/2026, incluindo a organização dos componentes solicitada pelo Dev 1, e atualizada em 11/11/2026 após a integração do back-end.

## Avaliação

A estratégia inicial de entregar um front independente com mocks permitiu demonstrar ingestão, gráficos, mapa, configuração dos modelos e simulação antes do servidor. Naquele estágio, isso ainda não equivalia a uma aplicação com aprendizado de máquina real.

A integração posterior manteve a interface desacoplada e conectou os pipelines reais pelo contrato v1.0. O modo mock continua identificado; o modo API agora executa treino e inferência no back-end sem criar outra interface em Streamlit.

## Ajustes realizados nesta revisão

| Achado | Correção |
| --- | --- |
| Respostas HTTP eram tratadas como tipadas sem validação | Validação em tempo de execução com Zod para saúde, dados, treino e previsão |
| Resumo e auditoria podiam divergir do conteúdo retornado | Conferência de contagens, médias/somas, amostras, IDs, matriz e acurácia |
| Dataset/modelo diferentes dos solicitados podiam entrar no estado | Conferência dos identificadores e da configuração aplicada antes de aceitar a resposta |
| Indicador de conexão dependia apenas de haver dados já carregados | Estado de conexão baseado nas operações; erro de validação não se confunde com falha de rede/serviço |
| XML aceitava estruturas aninhadas fora do esquema | Rejeição de DTD, entidades, atributos, campos repetidos e filhos aninhados |
| Simulador oferecia culturas ausentes na base de treino | Opções limitadas à base ativa; mock também verifica a correspondência |
| Métrica de acurácia ausente aparecia como zero | Ausência não é convertida em resultado fictício |
| JSX e operações assíncronas concentrados no App | Layout em componentes; estado e operações em `useAgroWorkspace` |
| Tabelas e campos duplicados | Componentes tipados reutilizáveis de formulário, tabela, paginação e painel |
| Configuração comparada pela ordem das chaves JSON | Comparação semântica compartilhada entre interface e validação |
| Pouca cobertura da fronteira HTTP e do XML | Testes de resposta incompatível, falhas, XML e preservação do estado |
| Ausência de orientação para futuras alterações | `AGENTS.md`, guia de arquitetura e workflow de teste/build para GitHub |

O workflow foi adicionado ao repositório; sua execução no GitHub depende de o grupo publicar os arquivos. A verificação local é independente desse workflow.

## Pendências após a integração do back-end

| Prioridade | Pendência | Responsável sugerido | Aceite |
| --- | --- | --- | --- |
| Alta | Confirmar requisitos, datas e critérios do professor | Equipe | Conferir o edital/cronograma oficial, sem usar propostas antigas como comprovação |
| Média | Ensaio automatizado de navegador do fluxo completo | Devs 1 e 5 | Carga, troca de base, treino das duas tarefas, previsão, erros e navegação por teclado |
| Média | Avaliar volume próximo de 10.000 registros | Devs 1, 2 e 5 | Medir renderização de gráficos/mapa e tempo de resposta antes de prometer suporte confortável |
| Média | Validar domínio e unidades entre culturas | Equipe | Documentar se a mesma unidade/fórmula atende Soja, Milho e Algodão; revisar simplificações |
| Baixa | Organizar estilos por componente ou por área | Dev 1 | Separação sem regressão visual; manter tokens e responsividade coerentes |

## Limites que devem permanecer explícitos

- O modo mock não treina estimadores. Ajustar parâmetros demonstra configuração e contrato, sem comprovar melhoria dos algoritmos reais.
- Métricas elevadas sobre regras sintéticas não demonstram previsão de safra real. As classes de risco atuais derivam de uma fórmula didática.
- Mapa depende de rede para o fundo cartográfico. A tabela de coordenadas oferece uma alternativa, mas isso não torna os tiles offline.
- O front guarda estado em memória e perde a demonstração ao recarregar a página.
- O registro do servidor é compartilhado entre clientes e volátil. Persistência durável, autenticação e isolamento não fazem parte do MVP acadêmico.

Guia da estrutura reutilizável: [arquitetura_frontend.md](arquitetura_frontend.md).
