# Roteiro de demonstração — Dev 1

1. Iniciar `pnpm dev` em `frontend/` e abrir `http://127.0.0.1:5173`.
2. Apresentar o indicador de modo demonstração e os quatro KPIs derivados dos 300 registros.
3. Buscar um município, ordenar uma coluna e avançar a página da tabela.
4. Importar um arquivo de `data/examples/`. Explicar validação das 13 colunas e atualização dos KPIs.
5. Abrir Dashboard e mapa, filtrar cultura/município e clicar num marcador. Mostrar os gráficos e a correlação.
6. Treinar a regressão simulada na barra lateral. Mostrar configuração, métricas e auditoria.
7. Trocar o objetivo para classificação e treinar. Mostrar a matriz e a ordem real/previsto das classes.
8. Abrir o simulador, preencher o exemplo e executar. As duas tarefas agora têm resultado.
9. Alterar uma entrada para demonstrar que a previsão anterior desaparece. Inserir pH inválido e verificar a validação.
10. Trocar de base e mostrar que os modelos anteriores foram invalidados. A nova base exige novos treinamentos.

Na defesa, explicar `AgroService`: o mock e o cliente HTTP implementam a mesma interface. Os componentes não conhecem as rotas nem implementam modelos reais. O time de back-end entregará dados e resultados nos formatos do contrato, sem necessidade de reescrever as telas.

Não apresentar métricas do mock como qualidade de Random Forest, árvore ou KNN. Não apresentar as regras sintéticas como comprovação agronômica. Ao mostrar upload no modo mock, explicar que o arquivo é processado localmente no navegador.
