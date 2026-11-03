# Organização do front-end e reutilização de componentes

O front-end segue quatro responsabilidades: composição da aplicação, estado dos fluxos, apresentação e acesso a dados. Essa divisão permite que o Dev 1 evolua as telas enquanto os demais implementam a API.

```text
frontend/src/
├── App.tsx                      # compõe layout e escolhe a página ativa
├── config/navigation.ts         # catálogo único de seções
├── hooks/useAgroWorkspace.ts    # carga, upload, treino e estado de base/modelos
├── components/
│   ├── common/                  # Notice, Empty, Loading, Metric, RiskBadge, Panel
│   ├── forms/                   # Field, TextField, SelectField, RangeField, SearchField
│   ├── tables/                  # DataTable genérica e Pagination
│   ├── layout/                  # Sidebar, Topbar, WorkspaceHeader, WorkspaceNavigation
│   ├── datasets/                # DatasetSummary, DatasetSelector, DatasetUpload
│   ├── models/                  # ModelControls e PredictionAudit
│   ├── GeoMap.tsx               # integração específica com Leaflet
│   └── AboutDialog.tsx          # informações da equipe
├── pages/                       # composição dos quatro fluxos de tela
├── services/                    # mock, HTTP, parser e validação do contrato
├── lib/                         # esquema e regras/cálculos de demonstração
├── mocks/                       # fixtures reproduzíveis
├── types/                       # dados de domínio e contrato de serviço
└── tests/                       # domínio, HTTP, XML, estado e integração de componentes
```

## Regras de uso

- `App.tsx` compõe os componentes e controla apenas navegação e abertura do diálogo da equipe.
- `useAgroWorkspace` controla as operações assíncronas. Preserva dados/modelos quando uma operação falha, impede operações concorrentes sobre seu estado e invalida respostas após desmontagem.
- `WorkspaceNavigation` usa o mesmo catálogo para menu lateral e abas, evitando divergência entre eles.
- Componentes genéricos recebem valores, eventos e conteúdo por props. Não importam `agroService`, não montam URLs e não conhecem o dataset ativo.
- As páginas coordenam interações do seu próprio fluxo. Por exemplo, o simulador valida o formulário e chama o serviço de previsão; suas entradas visuais vêm de `TextField` e `SelectField`.
- Componentes de domínio (`datasets/`, `models/`) combinam os componentes genéricos com tipos do AgroSense.
- `GeoMap` permanece específico: tem ciclo de vida e dependências próprias do Leaflet. Não tentar transformá-lo em uma abstração genérica sem outro caso de uso concreto.
- Extrair componentes quando houver repetição ou responsabilidade própria. Evitar abstrações com muitas flags que apenas movem JSX para outro arquivo.

## Exemplos

Campo reutilizável com erro e associação acessível entre rótulo e entrada:

```tsx
<TextField
  label="pH do solo"
  value={value}
  onValueChange={setValue}
  inputMode="decimal"
  error={error}
/>
```

Tabela reutilizável com renderização tipada por coluna:

```tsx
<DataTable
  caption="Talhões ativos"
  rows={records}
  rowKey={record => record.talhao_id}
  columns={[
    { id: "talhao", label: "Talhão", render: record => record.talhao_id },
    { id: "municipio", label: "Município", render: record => record.municipio },
  ]}
/>
```

`DataTable` não busca dados nem os ordena. Recebe as linhas já preparadas; quando houver ordenação, recebe `sort`, `onSort` e `sortKey` nas colunas apropriadas. `Pagination` também é controlada por props. A tabela de talhões e a auditoria de previsões já reutilizam a mesma estrutura.

Painel reutilizável:

```tsx
<Panel title="Resultado" description="Avaliação do conjunto de teste">
  {children}
</Panel>
```

Os componentes mantêm as classes CSS existentes para preservar a interface durante a refatoração. Estilos continuam centralizados nesta etapa; separar estilos por componente pode ser feito depois, junto de uma revisão visual, sem misturar essa alteração com regras do contrato.

## Verificar uma alteração

1. Alterou contrato? Atualizar tipos, `contracts.ts`, mock, cliente HTTP e documentação juntos.
2. Alterou fluxo? Testar estados de sucesso, falha e preservação/invalidação dos dados relevantes.
3. Alterou componente compartilhado? Conferir os locais que o consomem, incluindo teclado e tela pequena.
4. Executar `pnpm test` e `pnpm build` em `frontend/`.

O back-end permanece fora desta refatoração. A fronteira continua sendo a interface `AgroService`.
