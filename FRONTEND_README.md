# AgroSense Front-End — Guia Completo de Desenvolvimento (React)

> **Marco de Entrega:** Apresentação da Interface em **04/11 (0,5 ponto)**  
> **Objetivo:** Desenvolver uma aplicação web em **React** rica, moderna e 100% desacoplada do backend, permitindo a demonstração interativa completa de todas as funcionalidades exigidas pelo edital através de uma camada de simulação (*Mock Service*), para posterior conexão com a API Python sem retrabalho.

---

## 1. Visão Geral da Arquitetura do Front-End

O front-end é projetado como uma **Single Page Application (SPA)** em React, modularizada em componentes reutilizáveis. Para permitir que o time desenvolva e apresente a interface antes da conclusão do backend em Python, a aplicação utilizará o padrão **Service Layer com Alternância de Mock**:

```text
┌─────────────────────────────────────────────────────────────┐
│                      INTERFACE REACT                        │
│   (Upload, Dashboard EDA, Mapa Leaflet, Controles de ML,    │
│                 Simulador de Produtividade)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────▼─────────────┐
                │   src/services/api.ts      │
                │  (Camada de Interceptação) │
                └──────┬──────────────┬──────┘
                       │              │
      [USE_MOCK = true]│              │[USE_MOCK = false]
                       ▼              ▼
           ┌────────────────┐   ┌───────────────────────────┐
           │  Mock Service  │   │  API Python Backend       │
           │  (Em memória)  │   │  (FastAPI / Flask :8000)  │
           └────────────────┘   └───────────────────────────┘
```

> **Vantagem Estratégica:** No dia **04/11**, a interface poderá ser executada de forma autônoma com dados simulados perfeitos. Na entrega final de **11/11**, bastará alterar a constante `USE_MOCK = false` no arquivo `.env` para consumir a API Python real.

---

## 2. Stack Tecnológica do Front-End

| Função | Biblioteca / Ferramenta | Versão | Justificativa Técnica |
| :--- | :--- | :--- | :--- |
| **Framework Base** | **React + Vite** (TypeScript) | `^18.2.0` | Inicialização ultrarrápida, tipagem forte e build otimizado |
| **Estilização** | **Tailwind CSS** | `^3.4.0` | Design elegante, responsivo e sem necessidade de arquivos CSS externos complexos |
| **Ícones** | **Lucide React** | `^0.300.0` | Ícones modernos para clima, lavoura, gráficos e status |
| **Mapeamento Geoespacial** | **Leaflet** + **React-Leaflet** | `^4.2.1` | Renderização leve do mapa com marcadores customizados de latitude e longitude |
| **Gráficos Analíticos** | **Recharts** | `^2.10.0` | Gráficos declarativos e interativos (barras, rosca, dispersão e heatmap) |
| **Cliente HTTP** | **Axios** | `^1.6.0` | Requisições padronizadas com suporte a interceptores |

---

## 3. Estrutura de Pastas do Projeto Front-End

A aplicação residirá no subdiretório `frontend/`:

```text
ML_AGROSENSE/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── .env.example
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx                     # Ponto de entrada React
│       ├── App.tsx                      # Orquestrador de layout e abas
│       ├── index.css                    # Diretivas Tailwind e estilos globais
│       ├── types/                       # Interfaces TypeScript do Schema
│       │   └── index.ts
│       ├── services/                    # Camada de comunicação e dados
│       │   ├── api.ts                   # Cliente Axios configurado
│       │   ├── mockData.ts              # Datasets simulados (Soja, Milho, Algodão)
│       │   └── agroService.ts           # Métodos de negócio (Upload, Treino, Predição)
│       └── components/                  # Componentes visuais modulares
│           ├── layout/
│           │   ├── Header.tsx           # Barra superior com título e status
│           │   ├── Sidebar.tsx          # Controles de ML e sliders de hiperparâmetros
│           │   └── TabsNavigation.tsx   # Alternador das 4 abas principais
│           ├── tabs/
│           │   ├── DataTab.tsx          # Aba 1: Upload, validação e tabela
│           │   ├── VisualizationTab.tsx # Aba 2: Gráficos e Mapa Leaflet
│           │   ├── ModelTab.tsx         # Aba 3: Métricas de ML e diagnóstico
│           │   └── SimulatorTab.tsx     # Aba 4: Simulador de novo talhão
│           ├── map/
│           │   └── GeoMap.tsx           # Componente isolado do Mapa com coordenadas
│           └── common/
│               ├── MetricCard.tsx       # Cards KPI numéricos
│               └── LoadingSpinner.tsx   # Feedback visual de processamento
```

---

## 4. Contrato de Tipos da API (TypeScript Interfaces)

Crie o arquivo `frontend/src/types/index.ts` contendo as definições exatas de dados que serão trafegados entre o Front e o Back:

```typescript
// 1. Registro individual de talhão agrícola (13 colunas do schema)
export interface TalhaoRecord {
  talhao_id: string;
  municipio: string;
  latitude: number;
  longitude: number;
  cultura: 'Soja' | 'Milho' | 'Algodão';
  area_hectares: number;
  precipitacao_mm: number;
  temperatura_media: number;
  umidade_solo_pct: number;
  ph_solo: number;
  teor_argila_pct: number;
  produtividade_sc_ha: number;
  risco_quebra: 'Baixo' | 'Moderado' | 'Alto';
}

// 2. Resumo de estatísticas descritivas (Aba 1)
export interface DataSummary {
  total_talhoes: number;
  area_total_ha: number;
  produtividade_media: number;
  precipitacao_media: number;
  culturas_contagem: Record<string, number>;
  risco_contagem: Record<string, number>;
}

// 3. Configurações de Machine Learning passadas pela Sidebar
export type MLTask = 'regressao' | 'classificacao';
export type MLAlgorithm = 'random_forest' | 'decision_tree' | 'knn';

export interface MLHyperparameters {
  // Random Forest
  n_estimators?: number;
  max_depth?: number;
  min_samples_split?: number;
  // Decision Tree
  criterion?: string;
  // KNN
  n_neighbors?: number;
  weights?: 'uniform' | 'distance';
  metric?: 'euclidean' | 'manhattan';
}

export interface TrainConfig {
  task: MLTask;
  algorithm: MLAlgorithm;
  hyperparameters: MLHyperparameters;
}

// 4. Métricas retornadas após o treinamento (Aba 3)
export interface TrainingMetrics {
  task: MLTask;
  algorithm: MLAlgorithm;
  // Métricas de Regressão
  r2?: number;
  mae?: number;
  rmse?: number;
  // Métricas de Classificação
  accuracy?: number;
  f1_weighted?: number;
  precision?: number;
  recall?: number;
  confusion_matrix?: number[][];
  classes?: string[];
  // Auditoria de teste
  test_samples?: {
    talhao_id: string;
    real: number | string;
    previsto: number | string;
  }[];
}

// 5. Payload e Resposta da Predição Interativa (Aba 4)
export interface PredictionInput {
  municipio: string;
  cultura: string;
  area_hectares: number;
  precipitacao_mm: number;
  temperatura_media: number;
  umidade_solo_pct: number;
  ph_solo: number;
  teor_argila_pct: number;
}

export interface PredictionResult {
  produtividade_estimada_sc_ha: number;
  risco_predito: 'Baixo' | 'Moderado' | 'Alto';
  probabilidades?: Record<string, number>;
}
```

---

## 5. Especificação Exata dos Endpoints REST

Quando a API Python backend estiver ativa, ela consumirá e retornará exatamente estas rotas:

### 1. `POST /api/upload`
* **Descrição:** Recebe arquivo multipart (`.csv`, `.json`, `.xml`).
* **Content-Type:** `multipart/form-data`
* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "status": "success",
    "filename": "safra_soja_mt.csv",
    "total_rows": 320,
    "columns_detected": 13,
    "summary": { ... },
    "sample_data": [ ... ]
  }
  ```

### 2. `GET /api/data`
* **Descrição:** Retorna todos os registros tabulares com suporte a paginação e filtros.
* **Query Params:** `?cultura=Soja&municipio=Sorriso`
* **Resposta (200 OK):** Array de `TalhaoRecord`.

### 3. `POST /api/model/train`
* **Descrição:** Dispara o re-treinamento dinâmico no backend.
* **Body (JSON):** `TrainConfig`
* **Resposta (200 OK):** `TrainingMetrics`

### 4. `POST /api/predict`
* **Descrição:** Executa a predição pontual do simulador.
* **Body (JSON):** `PredictionInput`
* **Resposta (200 OK):** `PredictionResult`

---

## 6. Camada de Mocking Interativa (`src/services/mockData.ts`)

Para que o Front-End funcione de imediato e possa ser apresentado em **04/11**, crie o arquivo `frontend/src/services/mockData.ts` contendo geradores de dados locais com as regras de negócio agronômicas:

```typescript
import { TalhaoRecord, DataSummary, TrainingMetrics, PredictionResult } from '../types';

export const INITIAL_MOCK_DATA: TalhaoRecord[] = [
  {
    talhao_id: "TAL-001",
    municipio: "Sorriso",
    latitude: -12.5425,
    longitude: -55.7211,
    cultura: "Soja",
    area_hectares: 120.0,
    precipitacao_mm: 1450.0,
    temperatura_media: 25.2,
    umidade_solo_pct: 68.0,
    ph_solo: 6.2,
    teor_argila_pct: 45.0,
    produtividade_sc_ha: 71.4,
    risco_quebra: "Baixo"
  },
  {
    talhao_id: "TAL-002",
    municipio: "Sinop",
    latitude: -11.8642,
    longitude: -55.5056,
    cultura: "Milho",
    area_hectares: 85.0,
    precipitacao_mm: 780.0,
    temperatura_media: 28.5,
    umidade_solo_pct: 35.0,
    ph_solo: 5.6,
    teor_argila_pct: 30.0,
    produtividade_sc_ha: 42.1,
    risco_quebra: "Moderado"
  },
  {
    talhao_id: "TAL-003",
    municipio: "Cascavel",
    latitude: -24.9558,
    longitude: -53.4552,
    cultura: "Soja",
    area_hectares: 210.0,
    precipitacao_mm: 1620.0,
    temperatura_media: 22.0,
    umidade_solo_pct: 75.0,
    ph_solo: 6.5,
    teor_argila_pct: 55.0,
    produtividade_sc_ha: 78.9,
    risco_quebra: "Baixo"
  },
  {
    talhao_id: "TAL-004",
    municipio: "Rio Verde",
    latitude: -17.7925,
    longitude: -50.9192,
    cultura: "Algodão",
    area_hectares: 180.0,
    precipitacao_mm: 520.0,
    temperatura_media: 32.1,
    umidade_solo_pct: 28.0,
    ph_solo: 5.2,
    teor_argila_pct: 25.0,
    produtividade_sc_ha: 29.5,
    risco_quebra: "Alto"
  },
  {
    talhao_id: "TAL-005",
    municipio: "Campo Mourão",
    latitude: -24.0458,
    longitude: -52.3789,
    cultura: "Milho",
    area_hectares: 95.0,
    precipitacao_mm: 1100.0,
    temperatura_media: 24.1,
    umidade_solo_pct: 58.0,
    ph_solo: 6.0,
    teor_argila_pct: 42.0,
    produtividade_sc_ha: 61.2,
    risco_quebra: "Baixo"
  }
];

export const getMockSummary = (data: TalhaoRecord[]): DataSummary => ({
  total_talhoes: data.length,
  area_total_ha: data.reduce((acc, t) => acc + t.area_hectares, 0),
  produtividade_media: Number((data.reduce((acc, t) => acc + t.produtividade_sc_ha, 0) / data.length).toFixed(1)),
  precipitacao_media: Number((data.reduce((acc, t) => acc + t.precipitacao_mm, 0) / data.length).toFixed(1)),
  culturas_contagem: data.reduce((acc, t) => {
    acc[t.cultura] = (acc[t.cultura] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  risco_contagem: data.reduce((acc, t) => {
    acc[t.risco_quebra] = (acc[t.risco_quebra] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
});

export const getMockTrainingMetrics = (task: string, algorithm: string): TrainingMetrics => {
  if (task === 'regressao') {
    return {
      task: 'regressao',
      algorithm: algorithm as any,
      r2: 0.89,
      mae: 3.42,
      rmse: 4.81,
      test_samples: [
        { talhao_id: "TAL-001", real: 71.4, previsto: 69.8 },
        { talhao_id: "TAL-002", real: 42.1, previsto: 44.5 },
        { talhao_id: "TAL-003", real: 78.9, previsto: 76.2 },
        { talhao_id: "TAL-004", real: 29.5, previsto: 31.0 }
      ]
    };
  }
  return {
    task: 'classificacao',
    algorithm: algorithm as any,
    accuracy: 0.92,
    f1_weighted: 0.91,
    precision: 0.93,
    recall: 0.92,
    classes: ["Baixo", "Moderado", "Alto"],
    confusion_matrix: [
      [24, 2, 0],
      [1, 15, 2],
      [0, 1, 12]
    ]
  };
};

export const getMockPrediction = (input: any): PredictionResult => {
  const isHighRisk = input.precipitacao_mm < 700 || input.temperatura_media > 31;
  const isModerate = input.precipitacao_mm >= 700 && input.precipitacao_mm < 1100;
  
  const risco = isHighRisk ? 'Alto' : isModerate ? 'Moderado' : 'Baixo';
  const prod = isHighRisk ? 31.5 : isModerate ? 52.8 : 74.2;

  return {
    produtividade_estimada_sc_ha: prod,
    risco_predito: risco,
    probabilidades: {
      Baixo: isHighRisk ? 0.05 : isModerate ? 0.25 : 0.85,
      Moderado: isHighRisk ? 0.15 : isModerate ? 0.65 : 0.12,
      Alto: isHighRisk ? 0.80 : isModerate ? 0.10 : 0.03
    }
  };
};
```

---

## 7. Camada de Serviço Híbrida (`src/services/agroService.ts`)

Este arquivo gerencia a alternância limpa entre Mock e Backend Real:

```typescript
import axios from 'axios';
import { TalhaoRecord, DataSummary, TrainConfig, TrainingMetrics, PredictionInput, PredictionResult } from '../types';
import { INITIAL_MOCK_DATA, getMockSummary, getMockTrainingMetrics, getMockPrediction } from './mockData';

// Configuração: se VITE_USE_MOCK for true (ou se a API falhar), opera em modo de simulação
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: API_URL });

// Estado em memória para simulação no front-end
let currentRecords: TalhaoRecord[] = [...INITIAL_MOCK_DATA];

export const AgroService = {
  // 1. Upload flexível (.csv, .json, .xml)
  uploadDataset: async (file: File): Promise<{ records: TalhaoRecord[]; summary: DataSummary }> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 600)); // Simula latência de rede
      // Simula leitura de arquivo: adiciona 2 talhões novos
      const mockNew: TalhaoRecord = {
        talhao_id: `TAL-UPLOAD-${Date.now().toString().slice(-3)}`,
        municipio: "Dourados",
        latitude: -22.2211,
        longitude: -54.8056,
        cultura: "Soja",
        area_hectares: 140.0,
        precipitacao_mm: 1350.0,
        temperatura_media: 24.8,
        umidade_solo_pct: 64.0,
        ph_solo: 6.1,
        teor_argila_pct: 48.0,
        produtividade_sc_ha: 69.5,
        risco_quebra: "Baixo"
      };
      currentRecords = [mockNew, ...currentRecords];
      return { records: currentRecords, summary: getMockSummary(currentRecords) };
    }

    const formData = new FormData();
    formData.append('file', file);
    const resp = await api.post('/upload', formData);
    return resp.data;
  },

  // 2. Obter dados e resumo
  fetchData: async () => {
    if (USE_MOCK) {
      return { records: currentRecords, summary: getMockSummary(currentRecords) };
    }
    const resp = await api.get('/data');
    return resp.data;
  },

  // 3. Re-treinamento dinâmico
  retrainModel: async (config: TrainConfig): Promise<TrainingMetrics> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 900)); // Simula tempo de treinamento
      return getMockTrainingMetrics(config.task, config.algorithm);
    }
    const resp = await api.post('/model/train', config);
    return resp.data;
  },

  // 4. Predição interativa
  predict: async (input: PredictionInput): Promise<PredictionResult> => {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 400));
      return getMockPrediction(input);
    }
    const resp = await api.post('/predict', input);
    return resp.data;
  }
};
```

---

## 8. Especificação das Telas e Componentes da Interface

### 8.1. Header e KPIs Superiores (`components/layout/Header.tsx`)
* **Identidade Visual:** Logotipo do *AgroSense*, indicador de status do backend (`Mock Simulado` ou `Backend Conectado` via badge verde/azul).
* **Grid de 4 Cards de KPI:**
  1. `Total de Talhões`: valor numérico total (ex.: `325`).
  2. `Área Monitorada`: soma em hectares formatada (ex.: `42.500 ha`).
  3. `Produtividade Média`: média com unidade (ex.: `68.2 sc/ha`).
  4. `Precipitação Acumulada Média`: média em mm (ex.: `1.240 mm`).

---

### 8.2. Barra Lateral de Machine Learning (`components/layout/Sidebar.tsx`)
* **Seletor de Arquivos:** Caixa de *Drag and Drop* com suporte explícito às extensões `.csv`, `.json`, `.xml`.
* **Configurador de Modelo:**
  * Seletor de Tarefa: Radio buttons (`Regressão - Produtividade` vs `Classificação - Risco`).
  * Seletor de Algoritmo: Dropdown (`Random Forest`, `Árvore de Decisão`, `KNN`).
* **Sliders Dinâmicos Condicionais:**
  * *Random Forest:* Sliders de `n_estimators` (10 a 300) e `max_depth` (2 a 25).
  * *Árvore de Decisão:* Slider de `max_depth` (1 a 20) e dropdown de `criterion`.
  * *KNN:* Slider de `n_neighbors` (1 a 25) e dropdowns de `weights` e `metric`.
* **Botão de Ação Primário:** `⚡ Re-treinar Modelo` com animação de spinner durante o treinamento.

---

### 8.3. As 4 Abas de Navegação

#### Aba 1: Carga e Tabela de Dados (`components/tabs/DataTab.tsx`)
* Exibição do status de integridade do Schema (13/13 colunas validadas).
* Tabela paginada com ordenação por cabeçalho, busca por município e badges de cores para as culturas.

#### Aba 2: Dashboard e Mapa Geográfico (`components/tabs/VisualizationTab.tsx`)
* **Visualização Geográfica Obrigatória (`GeoMap.tsx`):**
  * Renderizada com `react-leaflet`.
  * Centro inicial: Latitude `-15.7801`, Longitude `-47.9292` (Centro-Oeste do Brasil).
  * Marcadores circulares por talhão:
    * Se Risco: Marcador Verde (`Baixo`), Laranja (`Moderado`), Vermelho (`Alto`).
    * Se Produtividade: Marcadores em degradê azul/verde.
  * **Popup Interativo ao Clicar:** Exibe ID do talhão, cultura, município, coordenadas, histórico de chuva e rendimento.
* **Gráficos Analíticos com Recharts:**
  * Gráfico de Barras: Produtividade Média agrupada por Cultura.
  * Gráfico de Rosca (Donut): Proporção percentual de Risco de Quebra.
  * Gráfico de Dispersão: Chuva acumulada ($X$) vs. Produtividade colhida ($Y$).

#### Aba 3: Diagnóstico de Machine Learning (`components/tabs/ModelTab.tsx`)
* Painel de Métricas: Cards destacados com $R^2$, $MAE$ e $RMSE$ (se regressão) ou Acurácia e $F_1$-score (se classificação).
* Renderização visual da **Matriz de Confusão** em grade 3x3 com intensidades de cor proporcionais aos acertos.
* Tabela de Auditoria com as previsões comparadas aos valores reais de teste.

#### Aba 4: Simulador do Produtor (`components/tabs/SimulatorTab.tsx`)
* Formulário intuitivo dividido em 2 blocos (Dados do Solo e Previsão Climática).
* Botão destacado **"Calcular Diagnóstico da Safra"**.
* Card de Resultado com:
  * Valor em destaque da produtividade esperada (ex.: `72.4 sc/ha`).
  * Badge de risco climático com recomendação textual agronômica automática.

---

## 9. Passo a Passo para Inicializar o Projeto Front-End

Para criar o projeto front-end do zero em sua máquina:

```bash
# 1. Navegar até a raiz do repositório
cd "C:\Users\kinha\OneDrive\Área de Trabalho\topicos software\ML_AGROSENSE"

# 2. Criar o app React com Vite e TypeScript
npm create vite@latest frontend -- --template react-ts

# 3. Entrar na pasta do front-end
cd frontend

# 4. Instalar as dependências necessárias
npm install
npm install lucide-react recharts leaflet react-leaflet axios
npm install -D tailwindcss postcss autoprefixer @types/leaflet

# 5. Inicializar o Tailwind CSS
npx tailwindcss init -p
```

### Configurar `tailwind.config.js`
Substitua o conteúdo de `tailwind.config.js` por:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Adicionar as Diretivas ao `src/index.css`
No topo de `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "leaflet/dist/leaflet.css";
```

### Criar o arquivo `.env`
Na raiz de `frontend/`, crie o arquivo `.env`:
```ini
VITE_USE_MOCK=true
VITE_API_URL=http://localhost:8000/api
```

### Executar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173` no navegador.

---

## 10. Checklist de Sucesso para a Apresentação de 04/11

Para garantir a nota máxima (**0,5 ponto**) na apresentação preliminar do Front-end:

- [ ] **Design e Navegação:** Todas as 4 abas alternam suavemente sem erros no console (`F12`).
- [ ] **Responsividade e Estética:** KPIs destacados no topo com visual limpo e profissional.
- [ ] **Upload e Flexibilidade:** Simulação de upload de arquivo atualizando os contadores na tela.
- [ ] **Mapa Obrigatório:** Mapa Leaflet renderizando os talhões com marcadores coloridos e popups funcionais ao clicar.
- [ ] **Gráficos Básicos:** Gráficos de barras e rosca renderizados com tooltips interativos.
- [ ] **Sliders de Hiperparâmetros:** Sliders reativos na barra lateral mudando conforme o modelo selecionado.
- [ ] **Simulador:** Formulário calculando a predição imediata com animação de feedback ao clicar.
- [ ] **Autonomia:** Front-end rodando 100% independente do backend via `VITE_USE_MOCK=true`.
