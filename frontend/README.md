# Front-end AgroSense — Dev 1

Interface React + TypeScript que funciona independentemente do back-end em modo demonstração.

## Executar

Requisitos: Node.js 22.12 ou superior e pnpm 11. Na pasta `frontend/`:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Abrir `http://127.0.0.1:5173`. A porta é fixa para manter as origens do CORS previsíveis.

O modo padrão é mock. Para personalizar, copiar `.env.example` para `.env.local`. Depois de alterar as variáveis, reiniciar o servidor de desenvolvimento.

```ini
VITE_USE_MOCK=true
VITE_API_URL=http://localhost:8000/api
```

Com `VITE_USE_MOCK=false`, a interface chama a API real e exibe falhas de conexão. Não há fallback automático. O back-end ainda será implementado pela equipe.

## Funcionalidades

- Dados: importação CSV/JSON/XML, validação das 13 colunas, busca, ordenação e paginação.
- Dashboard: mapa Leaflet com popups, filtros por cultura/município, barras, rosca, dispersão e correlação de Pearson.
- Modelos: controles de tarefa, algoritmo e parâmetros, treinamento demonstrativo, métricas, diagnóstico e auditoria das mesmas previsões usadas no cálculo.
- Simulador: validação do cenário e resposta parcial ou combinada, conforme as tarefas já treinadas.
- Estados: base vazia, arquivo inválido, modelo não treinado, carregamento e erros. Trocar de base invalida os modelos; mudar uma entrada invalida a previsão.

## Organização

```text
src/
├── components/     # common, forms, tables, layout, datasets, models e mapa
├── config/         # catálogo de navegação compartilhado
├── hooks/          # estado de base/modelos e operações do workspace
├── lib/            # esquema, limites, regras didáticas e métricas
├── mocks/          # geração reproduzível dos 300 talhões iniciais
├── pages/          # quatro áreas da interface
├── services/       # contrato mock, HTTP e parsing de arquivos
├── tests/          # testes de dados, contrato e estado
└── types/          # tipos compartilhados com a especificação da API
```

## Verificação e arquivos de exemplo

```powershell
pnpm test
pnpm build
pnpm examples
```

`examples` regenera três bases sintéticas de 300 registros: Soja em CSV, Milho em JSON e Algodão em XML. As cópias em `public/examples/` alimentam os downloads da interface; as cópias em `../data/examples/` servem à equipe de back-end.

O upload substitui a base inteira, não acrescenta linhas. Limites: 2 MB e 10.000 registros. JSON exige números nativos; CSV/XML convertem campos numéricos com ponto decimal. Arquivos vazios, IDs duplicados e campos fora do esquema são rejeitados.

## Limites do mock

Nenhum estimador scikit-learn é treinado no navegador. Os diagnósticos usam regras didáticas e amostras da base, com cálculos coerentes entre previsões, métricas e matriz. Os controles simulam o fluxo de configuração, sem demonstrar ganho real ao ajustar hiperparâmetros. Os modelos de regressão e classificação têm IDs independentes e ficam em memória; atualizar a página reinicia a demonstração.

O mapa usa tiles do OpenStreetMap e depende de conexão para o fundo cartográfico. A tabela de coordenadas permanece disponível quando os tiles falham. As fontes têm fallback local se o Google Fonts não carregar.

Contrato completo: [docs/contrato_api.md](../docs/contrato_api.md).

As respostas HTTP são validadas em tempo de execução por `services/contracts.ts`, incluindo identificadores, resumo da base e auditoria do treino. Respostas incompatíveis geram erro antes de atualizar o estado. O simulador oferece apenas culturas presentes na base ativa.

Guia dos componentes: [arquitetura_frontend.md](../docs/arquitetura_frontend.md). Achados e melhorias pendentes: [revisao_tecnica.md](../docs/revisao_tecnica.md). O workflow em `.github/workflows/frontend.yml` executa os mesmos testes e build quando os arquivos forem publicados no GitHub.
