# RESOLVE — High-Performance E-Commerce Product Entity Resolution Platform

> An end-to-end, deterministic entity resolution and catalog deduplication engine built with **Spring Boot 3 (Java 17/21)**, **React 19 + TypeScript + Vite**, and **PostgreSQL (Supabase)**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Getting Started (Step-by-Step)](#3-getting-started---step-by-step)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Architecture](#5-architecture)
6. [Complete API Reference](#6-complete-api-reference)
7. [The Algorithm Pipeline (Step-by-Step)](#7-the-algorithm-pipeline---step-by-step)
8. [Database Schema](#8-database-schema)
9. [Frontend Pages & Features](#9-frontend-pages--features)
10. [Algorithm Pages (Interactive Demos)](#10-algorithm-pages-interactive-demos)
11. [Configuration](#11-configuration)
12. [Mock Datasets & Test Data](#12-mock-datasets--test-data)
13. [Known Limitations](#13-known-limitations)

---

## 1. Project Overview

### The Real-World Problem
Modern e-commerce aggregators and retailers ingest product catalogs from multiple competing marketplaces (e.g., Amazon, Flipkart, eBay, Walmart, Target). Because each seller uses varied naming conventions, typos, abbreviations, and formatting, identical physical products appear under completely distinct product titles, descriptions, and prices:
- *"Apple iPhone 15 Pro (128 GB) - Natural Titanium"* (Amazon)
- *"Apple iPhone 15 Pro 128GB Natural Titanium 5G"* (Flipkart)
- *"Apple iPhone 15 Pro - 128GB - Natural Titanium (Unlocked)"* (eBay)

Evaluating all pairs via brute-force pairwise string comparison requires $\mathcal{O}(N^2)$ comparisons. For $N = 100{,}000$ products, that is $\approx 5 \times 10^9$ comparisons, which is computationally intractable in production environments.

### What RESOLVE Does
RESOLVE implements a multi-stage Data Structures and Algorithms (DSA) pipeline that solves this problem:
1. **Keyword Filtering ($\mathcal{O}(L)$ Trie)**: Prunes stop-words and normalizes title tokens.
2. **Candidate Blocking ($\mathcal{O}(N \log N)$ Suffix Array + Kasai LCP & Inverted Index)**: Filters the comparison space by $>80\%$, generating candidate pairs without evaluating irrelevant combinations.
3. **Multi-Signal Similarity Scoring**: Blends Knuth-Morris-Pratt (KMP) exact substring searching, Rabin-Karp rolling double-hashing, Wagner-Fischer Levenshtein dynamic programming distance, and token Jaccard overlap into a weighted confidence metric.
4. **Graph Clustering ($\mathcal{O}(\alpha(N))$ Disjoint Set Union & Min-Heap Priority Queue)**: Connects match edges into canonical entities with path compression and rank optimization, ranking clusters by statistical confidence.

### Core Technology Stack
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS, Recharts, Lucide React, Radix UI.
- **Backend**: Spring Boot 3.3.4, Java 17/21 bytecode target, Spring Data JPA, Hibernate 6, HikariCP.
- **Database**: PostgreSQL 15+ (hosted on Supabase Cloud Pooler with SSL).
- **Build Tools**: Bundled Apache Maven 3.9.6, Node.js / npm.

---

## 2. Prerequisites

| Requirement | Supported Version | Notes |
| :--- | :--- | :--- |
| **Java Development Kit (JDK)** | JDK 17 or JDK 21+ | Required to run Spring Boot (`java -version`). |
| **Node.js** | Node 18.x, 20.x, or 22.x | Required for the Vite frontend (`node -v`). |
| **Apache Maven** | Bundled (`tools/maven/`) | **No installation required**. A dedicated Maven binary is bundled with the project. |
| **Database (PostgreSQL)** | Cloud-Hosted (Supabase) | **No local PostgreSQL installation required**. Connection string is pre-configured. |
| **Web Browser** | Modern Browser | Chrome, Edge, Firefox, or Safari with JavaScript enabled. |

---

## 3. Getting Started - Step by Step

### Step 1: Clone or Open the Workspace
Ensure your terminal is in the root directory:
```bash
cd "Project"
```

---

### Step 2: Start the Spring Boot Backend

#### On Windows (PowerShell / Command Prompt):
```powershell
cd backend
.\tools\maven\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```

#### On macOS / Linux:
```bash
cd backend
chmod +x ./tools/maven/apache-maven-3.9.6/bin/mvn
./tools/maven/apache-maven-3.9.6/bin/mvn spring-boot:run
```

#### Confirmation:
When the backend starts successfully, the terminal will log:
```text
[INFO] Started ResolveApplication in 3.842 seconds (process running for 4.512)
[INFO] [TRIE] Pre-loaded 22 stop-words into Trie for O(L) keyword filtration
[INFO] [MILLER-RABIN] Testing p=1000000007 -> prime confirmed, using as hash modulus
```
The backend server listens on `http://localhost:8080`.

---

### Step 3: Start the Vite Frontend

Open a new terminal window:
```bash
cd entity-iq
npm install
npm run dev
```

#### Confirmation:
```text
  VITE v8.3.0  ready in 240 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```
Open **`http://localhost:5173`** in your browser.

---

### Step 4: First-Run Workflow
1. Navigate to **Catalog** (`/datasets`) in the sidebar.
2. Click **Upload Dataset** and select the 3 CSV files from the `mock csv/` directory (`mock_appliances.csv`, `mock_electronics.csv`, `mock_mixed_catalog.csv`).
3. Navigate to **Run** (`/pipeline`) in the sidebar.
4. Click **Start New Run** (runs across all uploaded datasets).
5. Watch the real-time progress bar transition through `TOKENIZATION` $\to$ `CANDIDATE_BLOCKING` $\to$ `SIMILARITY_SCORING` $\to$ `CLUSTERING` $\to$ `COMPLETE`.
6. Explore the generated clusters under **Results** (`/entities`), pairwise match breakdowns under **Compare** (`/compare`), and analytics under **Analytics** (`/analytics`).

---

## 4. Project Folder Structure

```text
Project/
├── backend/                                  # Spring Boot 3 Java Backend
│   ├── pom.xml                               # Maven project configuration & dependencies
│   ├── tools/maven/                          # Bundled portable Apache Maven 3.9.6
│   └── src/
│       ├── main/
│       │   ├── java/com/resolve/
│       │   │   ├── ResolveApplication.java   # Main Spring Boot Entry Point (@SpringBootApplication)
│       │   │   ├── config/                   # Configuration Beans
│       │   │   │   ├── AsyncConfig.java      # Pipeline thread pool executor (4-8 threads)
│       │   │   │   ├── CacheConfig.java      # Spring CacheManager configuration
│       │   │   │   ├── CorsConfig.java       # Cross-Origin Resource Sharing filters
│       │   │   │   └── GlobalExceptionHandler.java # REST API exception mappings
│       │   │   ├── controller/               # REST API Endpoints
│       │   │   │   ├── AdminController.java  # Fast DB truncate and sequence reset (/api/admin/clear-all)
│       │   │   │   ├── DatasetController.java# CSV file upload, listing, deletion
│       │   │   │   ├── EntityController.java # Resolved entity clusters & member pagination
│       │   │   │   ├── ExportController.java # CSV streaming exports for clusters & pairs
│       │   │   │   ├── MatchController.java  # Candidate pair scores & inspection
│       │   │   │   ├── PipelineController.java # Pipeline triggers & execution polling
│       │   │   │   ├── SimilarityController.java # Interactive string metric testing API
│       │   │   │   └── StatsController.java  # Aggregated metrics & algorithm counters
│       │   │   ├── dto/                      # Data Transfer Objects & JSON Schemas
│       │   │   ├── model/                    # JPA Entities mapped to PostgreSQL tables
│       │   │   │   ├── CandidatePair.java    # Pairwise comparison record & similarity scores
│       │   │   │   ├── ClusterMember.java    # Membership mapping product -> entity cluster
│       │   │   │   ├── Dataset.java          # Uploaded catalog metadata
│       │   │   │   ├── EntityCluster.java    # Canonical cluster record
│       │   │   │   ├── PipelineRun.java      # Pipeline run lifecycle & statistics
│       │   │   │   └── Product.java          # Ingested product item listing
│       │   │   ├── repository/               # Spring Data JPA Repositories
│       │   │   └── service/                  # Business Logic & Core Algorithms
│       │   │       ├── CsvIngestionService.java # Apache Commons CSV parsing & DB batching
│       │   │       └── algorithm/            # Core DSA Resolution Engines
│       │   │           ├── AlgorithmMetricsTracker.java # In-memory operation counter
│       │   │           ├── AlgorithmPipelineService.java# 5-stage orchestration orchestrator
│       │   │           ├── BlockingService.java  # Suffix Array, Kasai LCP & Inverted Index
│       │   │           ├── ClusteringService.java# DSU with Path Compression & Max-Heap ranking
│       │   │           ├── SimilarityService.java# KMP, Rabin-Karp, Levenshtein, Jaccard
│       │   │           └── TokenizerService.java # Trie-based stopword filtration
│       │   └── resources/
│       │       └── application.properties    # PostgreSQL connection, HikariCP, and JPA config
│
├── entity-iq/                                # React 19 + TypeScript + Vite Frontend
│   ├── package.json                          # Frontend dependencies & build scripts
│   ├── vite.config.ts                        # Vite bundler config with /api reverse proxy
│   ├── src/
│   │   ├── App.tsx                           # React Router route registry & CacheProvider
│   │   ├── main.tsx                          # DOM mount point
│   │   ├── index.css                         # Design system, CSS variables & typography
│   │   ├── components/
│   │   │   └── ui/                           # Reusable UI component library
│   │   │       ├── button.tsx                # Accessible button components
│   │   │       ├── EmptyState.tsx            # Zero-data fallback layouts
│   │   │       ├── ProgressBar.tsx           # Multi-stage animated pipeline progress bar
│   │   │       └── ScoreBar.tsx              # Graphical metric breakdown bar
│   │   ├── context/
│   │   │   └── CacheContext.tsx              # Stale-While-Revalidate (SWR) client cache
│   │   ├── hooks/
│   │   │   ├── useDatasets.ts                # Dataset polling & mutation hook
│   │   │   ├── useEntities.ts                # Paginated entity clusters hook
│   │   │   ├── useMatches.ts                 # Paginated candidate pairs hook
│   │   │   ├── usePipelineRuns.ts            # Pipeline runs & active execution hook
│   │   │   └── useStats.ts                   # System overview stats hook
│   │   ├── layouts/
│   │   │   └── AppShell.tsx                  # Collapsible sidebar & header wrapper
│   │   ├── lib/
│   │   │   ├── api.ts                        # Typed REST API client & interfaces
│   │   │   └── utils.ts                      # ClassName merger (clsx + tailwind-merge)
│   │   └── pages/                            # Application View Pages
│   │       ├── AnalyticsPage.tsx             # Resolution charts & confidence histogram
│   │       ├── BlockingPage.tsx              # Interactive Suffix Array / LCP demo
│   │       ├── ClusterExplorerPage.tsx       # Resolved entity catalog & cluster viewer
│   │       ├── ClusteringPage.tsx            # Interactive DSU graph clustering demo
│   │       ├── ComparePage.tsx               # Pairwise similarity inspector & diff viewer
│   │       ├── DashboardPage.tsx             # System overview KPIs & recent activity
│   │       ├── ExportsPage.tsx               # CSV download center for entities & pairs
│   │       ├── LoginPage.tsx                 # Authentication view
│   │       ├── PipelinePage.tsx              # Pipeline execution monitor & live logs
│   │       ├── RegisterPage.tsx              # Registration view
│   │       ├── SettingsPage.tsx              # Algorithmic weights & DB clear admin panel
│   │       └── UploadPage.tsx                # Multi-CSV ingestion manager
│
├── mock csv/                                 # Standard Test Catalog Datasets
│   ├── mock_appliances.csv                   # 20 appliance listings (LG, Samsung, Dyson, Daikin)
│   ├── mock_electronics.csv                  # 30 electronics listings (Apple, Sony, Bose, Dell)
│   └── mock_mixed_catalog.csv                # 50 mixed cross-domain listings (Consoles, TVs, Audio)
└── README.md                                 # Complete Technical Documentation
```

---

## 5. Architecture

```mermaid
flowchart TD
    subgraph ClientTier[" 🖥️ Client Tier (Browser) "]
        direction TB
        ReactApp["<b>React 19 + TypeScript SPA</b><br/>• Tailwind CSS + Lucide React<br/>• Interactive Algorithm Simulators<br/>• Real-Time Progress Monitoring"]
        SWR["<b>SWR Cache Context</b><br/>• 60-second TTL in-memory cache<br/>• Stale-While-Revalidate background fetch"]
        ReactApp <--> SWR
    end

    subgraph GatewayTier[" ⚡ Development & Reverse Proxy Tier "]
        Vite["<b>Vite 8 Reverse Proxy (:5173)</b><br/>• Seamless <code>/api</code> forwarding to backend (:8080)<br/>• Hot Module Replacement (HMR)"]
    end

    subgraph BackendTier[" ☕ Spring Boot 3 Application Server (:8080) "]
        direction TB
        subgraph Controllers["REST Controller Layer"]
            C_API["<b>Spring REST Controllers (/api/v1)</b><br/>• Dataset, Pipeline & Entity Controllers<br/>• Match, Stats, Export & Similarity APIs<br/>• GlobalExceptionHandler & CorsConfig"]
        end

        subgraph Middleware["Execution & Middleware Layer"]
            CacheMgr["<b>Spring CacheManager</b><br/>ConcurrentMapCacheManager<br/>(@Cacheable / @CacheEvict)"]
            ThreadPool["<b>ThreadPoolTaskExecutor</b><br/>Async Pipeline Pool<br/>(4–8 Worker Threads)"]
        end

        subgraph DSAPipeline["⚡ High-Performance DSA Engine"]
            direction LR
            Trie["<b>Stage 1: Trie Index</b><br/>Stopword Filter O(L)"]
            SA["<b>Stage 2: Suffix Array + LCP</b><br/>Inverted Index Blocking O(N log N)"]
            SimEngine["<b>Stage 3: Multi-Signal Sim</b><br/>KMP + Rabin-Karp + Lev + Jaccard"]
            Clustering["<b>Stage 4: DSU Graph + Heap</b><br/>Path Compression O(α(N))"]

            Trie --> SA --> SimEngine --> Clustering
        end

        Controllers --> Middleware
        Middleware --> DSAPipeline
    end

    subgraph StorageTier[" 🐘 Persistence Tier (PostgreSQL / Supabase Cloud) "]
        Hikari["<b>HikariCP Connection Pool</b><br/>• Maximum Pool Size: 10<br/>• Batch Inserts (batch_size=100)<br/>• reWriteBatchedInserts=true"]
        Database[("<b>PostgreSQL 15+ Schema</b><br/>• datasets • products • pipeline_runs<br/>• candidate_pairs • entity_clusters<br/>• cluster_members")]
        Hikari --> Database
    end

    ClientTier -- "HTTP Requests (Port 5173)" --> GatewayTier
    GatewayTier -- "Reverse Proxy / JSON (Port 8080)" --> Controllers
    DSAPipeline -- "Spring Data JPA / Hibernate 6" --> Hikari

    classDef clientBox fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef gateBox fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef backBox fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
    classDef dsaBox fill:#312e81,stroke:#c084fc,stroke-width:2px,color:#f8fafc;
    classDef dbBox fill:#1c1917,stroke:#fbbf24,stroke-width:2px,color:#f8fafc;

    class ClientTier,ReactApp,SWR clientBox;
    class GatewayTier,Vite gateBox;
    class BackendTier,Controllers,C_API,Middleware,CacheMgr,ThreadPool backBox;
    class DSAPipeline,Trie,SA,SimEngine,Clustering dsaBox;
    class StorageTier,Hikari,Database dbBox;
```

### Architectural Component Breakdown

| Layer | Technology | Key Responsibilities | Latency / Throughput |
| :--- | :--- | :--- | :--- |
| **Client Tier** | React 19, TypeScript, Tailwind CSS | High-performance SPA with interactive DSA simulators (DSU graph, Suffix Array LCP, Multi-signal scoring). | Instant UI rendering ($<16\text{ms}$) |
| **Client Caching** | React Context (`CacheContext`) | Stale-While-Revalidate (SWR) cache pattern with 60-second TTL. Prevents redundant API roundtrips during navigation. | In-memory cache hit ($<1\text{ms}$) |
| **API Gateway** | Vite Reverse Proxy | Proxies `/api/v1/*` and `/api/admin/*` calls from port `5173` to `8080`, eliminating CORS issues during development. | Local loopback ($<2\text{ms}$) |
| **REST Controller** | Spring Boot 3.3.4 (Java 17/21) | Exposes strictly typed REST endpoints, handles multipart CSV uploads, input validation, and unified error handling. | API handling ($5\text{–}15\text{ms}$) |
| **Asynchronous Engine** | `ThreadPoolTaskExecutor` | Manages background pipeline workers (4 core, 8 max threads, 100 queue capacity) to prevent HTTP timeouts during long runs. | Non-blocking execution |
| **DSA Processing** | Pure In-Memory Java Engine | Multi-stage pipeline: Prefix Trie $\to$ Suffix Array + Kasai LCP $\to$ KMP / Rabin-Karp / Levenshtein / Jaccard $\to$ DSU + Max-Heap. | $10{,}000\text{+ records/sec}$ |
| **Persistence** | Supabase Cloud PostgreSQL 15+ | Relational storage with HikariCP connection pooling, JDBC batch rewrites (`batch_size=100`), and foreign key indexing. | Network RTT: $50\text{–}120\text{ms}$ |

### Communication & Caching Mechanics
- **CORS & Proxying**: Vite reverse-proxies `/api` requests to `http://localhost:8080`. In production, Spring's `CorsConfig` permits `http://localhost:5173` and `http://localhost:3000` with full credential support.
- **Asynchronous Execution**: Pipeline triggers (`POST /api/v1/pipeline/run`) create a `PENDING` run record and delegate processing to the `@Async("pipelineTaskExecutor")` thread pool. The frontend polls `/api/v1/pipeline/runs/{id}/status` until completion.
- **Spring Server-Side Caching**: Controller read endpoints (`/api/v1/stats/overview`, `/api/v1/entities`, `/api/v1/datasets`) utilize Spring's `@Cacheable`. Ingestion, pipeline completion, and database wipes trigger automatic `@CacheEvict` across all caches.
- **Frontend SWR Cache**: `CacheContext` maintains in-memory SWR caching with a 60-second TTL. If data is stale, it serves the cached snapshot instantly while dispatching a background revalidation request.

---

## 6. Complete API Reference

All REST endpoints are prefixed with `/api/v1` (admin endpoints also accept `/api/admin`).

### 1. Dataset Management (`DatasetController`)

| Method | Endpoint | Description | Request | Response | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/datasets/upload` | Ingest and parse a catalog CSV file | `MultipartFile file` | `DatasetResponse` | `201 CREATED` | `UploadPage` |
| `GET` | `/api/v1/datasets` | List all uploaded catalog datasets | None | `List<DatasetResponse>` | `200 OK` | `UploadPage`, `DashboardPage` |
| `GET` | `/api/v1/datasets/{id}` | Get dataset details by ID | `id` (path) | `DatasetResponse` | `200 OK` / `404` | `UploadPage` |
| `DELETE` | `/api/v1/datasets/{id}` | Cascade delete a dataset & its products | `id` (path) | `void` | `204 NO CONTENT` | `UploadPage` |

### 2. Pipeline Execution (`PipelineController`)

| Method | Endpoint | Description | Request | Response | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/pipeline/run` | Start async pipeline (All or single dataset) | `{ "datasetId": optional Long }` | `{ "runId": Long, "status": "PENDING", "message": String }` | `200 OK` | `PipelinePage` |
| `GET` | `/api/v1/pipeline/runs` | List all historical pipeline runs | None | `List<PipelineRunResponse>` | `200 OK` | `PipelinePage`, `DashboardPage` |
| `GET` | `/api/v1/pipeline/runs/{id}` | Get specific pipeline run metadata | `id` (path) | `PipelineRunResponse` | `200 OK` / `404` | `PipelinePage` |
| `GET` | `/api/v1/pipeline/runs/{id}/status` | Poll run stage and progress percentage | `id` (path) | `PipelineStatusResponse` | `200 OK` / `404` | `PipelinePage` |

### 3. Resolved Entities (`EntityController`)

| Method | Endpoint | Description | Request Params | Response | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/entities` | Paginated list of resolved entity clusters | `runId` (opt), `page` (def 0), `size` (def 50) | `PaginatedResponse<EntityClusterResponse>` | `200 OK` | `ClusterExplorerPage` |
| `GET` | `/api/v1/entities/{id}` | Get cluster details with member listings | `id` (path) | `EntityClusterResponse` (with `members`) | `200 OK` / `404` | `ClusterExplorerPage` |

### 4. Matches & Candidate Pairs (`MatchController`)

| Method | Endpoint | Description | Request Params | Response | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/matches/pairs` | Paginated candidate pairs with scores | `runId` (opt), `minScore` (def 0.45), `page`, `size` | `PaginatedResponse<CandidatePairResponse>` | `200 OK` | `ComparePage` |
| `GET` | `/api/v1/matches/pairs/{id}` | Get pairwise score decomposition for a pair | `id` (path) | `CandidatePairResponse` | `200 OK` / `404` | `ComparePage` |

### 5. System Analytics & Counters (`StatsController`)

| Method | Endpoint | Description | Request | Response | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stats/overview` | Global KPIs (Listings, Entities, Confidence, Reduction) | None | `StatsOverviewResponse` | `200 OK` | `DashboardPage`, `AnalyticsPage` |
| `GET` | `/api/v1/stats/algorithms` | Cumulative execution counters for all algorithms | None | `AlgorithmCountersResponse` | `200 OK` | `AnalyticsPage` |

### 6. Interactive Similarity Demo (`SimilarityController`)

| Method | Endpoint | Description | Request Body | Response Body | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/similarity/test` | Compute live multi-signal scores for 2 strings | `{ "titleA": String, "titleB": String }` | `{ "kmp": Float, "rabinKarp": Float, "levenshtein": Float, "jaccard": Float, "weighted": Float }` | `200 OK` | `SimilarityPage` |

### 7. Data Exports (`ExportController`)

| Method | Endpoint | Description | Format | Headers | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/export/clusters/{runId}` | Stream resolved clusters CSV | `text/csv` | `Content-Disposition: attachment; filename="clusters_{id}.csv"` | `ExportsPage` |
| `GET` | `/api/v1/export/pairs/{runId}` | Stream candidate pairs with scores CSV | `text/csv` | `Content-Disposition: attachment; filename="pairs_{id}.csv"` | `ExportsPage` |

### 8. Administration (`AdminController`)

| Method | Endpoint | Description | Request | Response | Status | Caller Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DELETE` | `/api/admin/clear-all` | Truncate all tables and reset ID sequences to 1 | None | `{ "status": "cleared", "message": String }` | `200 OK` | `SettingsPage` |

---

## 7. The Algorithm Pipeline - Step by Step

```mermaid
flowchart TD
    RAW(["<b>📦 Raw CSV Product Catalogs</b><br/><i>(N un-normalized listings from Amazon, Flipkart, eBay)</i>"])

    subgraph S1[" 🌿 STAGE 1: Tokenization & Trie Indexing "]
        direction TB
        S1_INFO["<b>Data Structure:</b> <code>Prefix Trie</code> | <b>Time:</b> <code>O(L)</code> per token<br/>• Filters 22 e-commerce stop-words (e.g. <i>for, with, and, original, pack</i>)<br/>• Sanitizes noise, normalizes casing, and tokenizes title strings<br/>• <b>Output:</b> <code>Map&lt;productId, List&lt;Token&gt;&gt;</code>"]
    end

    subgraph S2[" 🔍 STAGE 2: Candidate Blocking (Suffix Array + Inverted Index) "]
        direction TB
        S2_INFO["<b>Data Structures:</b> <code>Suffix Array</code>, <code>Kasai LCP</code>, <code>Inverted Index</code><br/><b>Time:</b> <code>O(N log N)</code> sorting, <code>O(N)</code> LCP array construction<br/>• <b>Inverted Index:</b> Groups items into token buckets; caps high-frequency lists at 500<br/>• <b>Suffix Array & LCP:</b> Concatenates titles with delimiters; scans adjacent suffixes for LCP $\ge 8$<br/>• <b>Output:</b> <b>80%–90% reduction</b> in pairwise comparison space"]
    end

    subgraph S3[" 🎯 STAGE 3: Multi-Signal Similarity Scoring "]
        direction TB
        subgraph Signals["Similarity Signal Decomposition"]
            KMP["<b>KMP Search (30%)</b><br/><code>O(M + N)</code> LPS table"]
            RK["<b>Rabin-Karp (15%)</b><br/><code>O(M + N)</code> 3-gram hash"]
            LEV["<b>Levenshtein (25%)</b><br/><code>O(M · N)</code> 2-row DP"]
            JAC["<b>Jaccard (30%)</b><br/><code>O(|A| + |B|)</code> token sets"]
        end
        S3_FORMULA["<b>Weighted Score Equation:</b><br/><code>Score = (0.30 · KMP) + (0.15 · RK) + (0.25 · Lev) + (0.30 · Jaccard) + Brand Boost (+0.05)</code><br/><i>⚡ Pairs with Composite Score &lt; 0.45 are pruned</i>"]
        Signals --> S3_FORMULA
    end

    subgraph S4[" 🌐 STAGE 4: Graph Clustering & Max-Heap Ranking "]
        direction TB
        S4_INFO["<b>Data Structures:</b> <code>Disjoint Set Union (DSU)</code>, <code>Max-Heap (PriorityQueue)</code><br/><b>Time:</b> <code>O(α(N))</code> per merge/find operation (nearly linear)<br/>• <b>DSU Engine:</b> Merges candidate pairs with <b>Path Compression</b> & <b>Union by Rank</b><br/>• <b>Max-Heap Ranking:</b> Orders clusters by confidence score and listing volume<br/>• <b>Canonical Resolution:</b> Highest-degree title & majority-vote brand selection"]
    end

    subgraph S5[" 💾 STAGE 5: Cloud Persistence & Cache Eviction "]
        direction TB
        S5_INFO["<b>Persistence:</b> <code>Spring Data JPA + PostgreSQL Batching</code><br/>• Batch-inserts <code>EntityCluster</code> and <code>ClusterMember</code> records to Supabase<br/>• Transitions <code>PipelineRun</code> status to <code>COMPLETE</code> with execution timers<br/>• Triggers <code>@CacheEvict</code> to refresh frontend analytics and entity tables"]
    end

    FINAL(["<b>✨ Resolved Canonical Entity Catalog</b><br/><i>(Deduplicated clusters with cross-vendor price comparison & high confidence)</i>"])

    RAW --> S1
    S1 --> S2
    S2 --> S3
    S3_FORMULA --> S4
    S4 --> S5
    S5 --> FINAL

    classDef stageBox fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef sigBox fill:#1e1b4b,stroke:#818cf8,stroke-width:1px,color:#f8fafc;
    classDef termBox fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;

    class S1,S2,S4,S5,S1_INFO,S2_INFO,S4_INFO,S5_INFO,S3_FORMULA stageBox;
    class KMP,RK,LEV,JAC sigBox;
    class RAW,FINAL termBox;
```

### Algorithmic Complexity & Pipeline Stages Deep Dive

| Stage | DSA Component | Time Complexity | Space Complexity | Contract & Engineering Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **Prefix Trie Stopword Filter** | $\mathcal{O}(L)$ per word | $\mathcal{O}(\Sigma \cdot L)$ | Pre-loaded with 22 noise words (e.g., *original, combo, for, with*); normalizes casing and punctuation in a single streaming pass. |
| **Stage 2** | **Suffix Array + Kasai LCP & Inverted Index** | $\mathcal{O}(N \log N)$ sort, $\mathcal{O}(N)$ LCP | $\mathcal{O}(N)$ | Generates candidate pairs by token bucket inversion (capped at 500 items/bucket) and adjacent suffix matching with $\text{LCP} \ge 8$ chars. Yields an **80%–90% reduction** in pairwise comparison space. |
| **Stage 3** | **Multi-Signal Similarity Scoring** | $\mathcal{O}(M + N)$ (KMP/RK), $\mathcal{O}(M \cdot N)$ (Lev) | $\mathcal{O}(\min(M, N))$ | Blends KMP prefix function ($30\%$), Rabin-Karp rolling hash ($15\%$), space-optimized Levenshtein matrix ($25\%$), and Jaccard token overlap ($30\%$). Pairs below $0.45$ threshold are pruned. |
| **Stage 4** | **Disjoint Set Union (DSU) & Max-Heap** | $\mathcal{O}(\alpha(N))$ amortized | $\mathcal{O}(V + E)$ | Merges connected graph components using **Path Compression** and **Union by Rank**. Resolves canonical representative titles via vertex degree and sorts clusters using a Max-Heap PriorityQueue. |
| **Stage 5** | **Batch Persistence & Cache Invalidation** | $\mathcal{O}(K / \text{batch\_size})$ | $\mathcal{O}(1)$ buffer | Writes `EntityCluster` and `ClusterMember` records in bulk (`batch_size=100`) to Supabase PostgreSQL, updates execution benchmarks, and triggers `@CacheEvict`. |

---

## 8. Database Schema

```mermaid
erDiagram
    DATASETS ||--o{ PRODUCTS : contains
    DATASETS ||--o{ PIPELINE_RUNS : scopes
    PIPELINE_RUNS ||--o{ CANDIDATE_PAIRS : evaluates
    PIPELINE_RUNS ||--o{ ENTITY_CLUSTERS : generates
    ENTITY_CLUSTERS ||--o{ CLUSTER_MEMBERS : groups
    PRODUCTS ||--o{ CLUSTER_MEMBERS : references

    DATASETS {
        bigint id PK
        varchar filename
        bigint record_count
        numeric file_size_mb
        varchar status
        timestamp uploaded_at
        timestamp completed_at
    }

    PRODUCTS {
        bigint id PK
        varchar external_id
        varchar title
        text description
        varchar brand
        numeric price
        varchar category
        varchar source
        bigint dataset_id FK
        timestamp created_at
    }

    PIPELINE_RUNS {
        bigint id PK
        bigint dataset_id FK
        varchar scope
        int dataset_count
        varchar dataset_filename
        varchar status
        varchar stage
        bigint input_records
        bigint entities_formed
        numeric match_confidence
        numeric comparison_reduction
        bigint duration_ms
        timestamp started_at
        timestamp completed_at
    }

    CANDIDATE_PAIRS {
        bigint id PK
        bigint product_a_id FK
        bigint product_b_id FK
        bigint pipeline_run_id FK
        numeric title_similarity
        numeric description_jaccard
        int levenshtein_distance
        boolean brand_match
        boolean model_match
        numeric final_score
        boolean is_match
    }

    ENTITY_CLUSTERS {
        bigint id PK
        bigint pipeline_run_id FK
        varchar canonical_title
        varchar canonical_brand
        int listing_count
        int source_count
        numeric confidence
        timestamp created_at
    }

    CLUSTER_MEMBERS {
        bigint id PK
        bigint cluster_id FK
        bigint product_id FK
    }
```

### Relational Data Dictionary

#### 1. `datasets`
Stores uploaded catalog metadata and file ingest status.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Unique dataset identifier. |
| `filename` | `VARCHAR(500)` | `NOT NULL` | Uploaded catalog CSV file name. |
| `record_count` | `BIGINT` | | Total product records parsed from the CSV. |
| `file_size_mb` | `NUMERIC(8,2)` | | Uploaded file size in Megabytes. |
| `status` | `VARCHAR(50)` | | Ingestion status (`UPLOADED`, `PROCESSING`, `COMPLETE`, `FAILED`). |
| `uploaded_at` | `TIMESTAMP` | `DEFAULT NOW()` | Upload timestamp. |
| `completed_at` | `TIMESTAMP` | | Parsing completion timestamp. |

#### 2. `products`
Individual product listings extracted from uploaded CSV catalogs.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Unique product listing identifier. |
| `external_id` | `VARCHAR(255)` | | Original vendor SKU / product identifier (e.g. `ELEC-101`). |
| `title` | `VARCHAR(1000)` | `NOT NULL` | Raw product title string. |
| `description` | `TEXT` | | Product specification and feature text. |
| `brand` | `VARCHAR(255)` | | Extracted or normalized brand name. |
| `price` | `NUMERIC(12,2)` | | Listing retail price. |
| `category` | `VARCHAR(255)` | | Product taxonomy classification. |
| `source` | `VARCHAR(100)` | `INDEX` (`idx_product_source`) | E-commerce marketplace source (`amazon`, `flipkart`, `ebay`). |
| `dataset_id` | `BIGINT` | `FK`, `INDEX` (`idx_product_dataset`) | Reference to parent `datasets.id`. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Record creation timestamp. |

#### 3. `pipeline_runs`
Tracks asynchronous execution runs, progress stages, and benchmark KPIs.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Unique pipeline run identifier. |
| `dataset_id` | `BIGINT` | `FK`, `INDEX` (`idx_run_dataset`) | Reference to single dataset ID (null for multi-dataset runs). |
| `scope` | `VARCHAR(50)` | | Run scope (`ALL_DATASETS`, `SINGLE_DATASET`). |
| `dataset_count` | `INT` | | Number of distinct catalog datasets evaluated. |
| `dataset_filename`| `VARCHAR(500)` | | Target filename if scoped to a single dataset. |
| `status` | `VARCHAR(50)` | | Run lifecycle state (`PENDING`, `RUNNING`, `COMPLETE`, `FAILED`). |
| `stage` | `VARCHAR(100)` | | Active pipeline stage (`TOKENIZATION`, `CANDIDATE_BLOCKING`, etc.). |
| `input_records` | `BIGINT` | | Total product listings evaluated. |
| `entities_formed` | `BIGINT` | | Number of canonical entity clusters generated. |
| `match_confidence`| `NUMERIC(5,2)`| | Mean confidence score across resolved clusters (percentage). |
| `comparison_reduction`| `NUMERIC(5,2)`| | Percentage of pairwise comparisons avoided via candidate blocking. |
| `duration_ms` | `BIGINT` | | Total execution time in milliseconds. |
| `started_at` | `TIMESTAMP` | `DEFAULT NOW()` | Execution start timestamp. |
| `completed_at` | `TIMESTAMP` | | Execution completion timestamp. |

#### 4. `candidate_pairs`
Stores candidate pairs evaluated during Stage 3 with granular signal score breakdowns.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Unique candidate pair evaluation identifier. |
| `product_a_id` | `BIGINT` | `FK` | First candidate product ID. |
| `product_b_id` | `BIGINT` | `FK` | Second candidate product ID. |
| `pipeline_run_id`| `BIGINT` | `FK`, `INDEX` (`idx_pair_run`) | Reference to parent `pipeline_runs.id`. |
| `title_similarity`| `NUMERIC(5,4)` | | Weighted combination of KMP and Rabin-Karp scores. |
| `description_jaccard`| `NUMERIC(5,4)` | | Jaccard token overlap score. |
| `levenshtein_distance`| `INT` | | Normalized edit distance similarity. |
| `brand_match` | `BOOLEAN` | | Whether product brands match or normalize to the same entity. |
| `model_match` | `BOOLEAN` | | Whether extracted model alphanumeric codes match. |
| `final_score` | `NUMERIC(5,4)` | `INDEX` (`idx_pair_score`) | Composite multi-signal confidence score ($0.00\text{–}1.00$). |
| `is_match` | `BOOLEAN` | `INDEX` (`idx_pair_match`) | True if `final_score` $\ge 0.45$. |

#### 5. `entity_clusters`
Canonical deduplicated entities formed by DSU connected component analysis.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Unique canonical entity cluster identifier. |
| `pipeline_run_id`| `BIGINT` | `FK`, `INDEX` (`idx_cluster_run`) | Reference to parent `pipeline_runs.id`. |
| `canonical_title`| `VARCHAR(1000)`| | Selected canonical title (highest matched vertex degree). |
| `canonical_brand`| `VARCHAR(255)` | | Selected canonical brand (majority voting). |
| `listing_count` | `INT` | | Total product listings merged into this cluster. |
| `source_count` | `INT` | | Count of distinct marketplaces representing this product. |
| `confidence` | `NUMERIC(5,4)` | | Aggregated statistical confidence score for the cluster. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Cluster generation timestamp. |

#### 6. `cluster_members`
Association table mapping individual product listings to their resolved canonical entity cluster.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Unique membership identifier. |
| `cluster_id` | `BIGINT` | `FK`, `INDEX` (`idx_member_cluster`) | Reference to parent `entity_clusters.id`. |
| `product_id` | `BIGINT` | `FK`, `INDEX` (`idx_member_product`) | Reference to merged `products.id`. |

---

## 9. Frontend Pages & Features

| Page | Route | Description | Actions & Capabilities | API Calls |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `/dashboard` | System KPI overview & recent runs | Inspect global stats, view recent run status, quick links | `GET /stats/overview`, `GET /pipeline/runs` |
| **Catalog** | `/datasets` | Multi-CSV catalog ingestion hub | Drag-and-drop CSV upload, inspect record count, delete dataset | `POST /datasets/upload`, `GET /datasets`, `DELETE /datasets/{id}` |
| **Run Pipeline** | `/pipeline` | Multi-dataset execution monitor | Trigger cross-dataset resolution, real-time stage progress bar | `POST /pipeline/run`, `GET /pipeline/runs/{id}/status` |
| **Results** | `/entities` | Resolved canonical entity explorer | Search clusters, inspect merged listings, view price variance | `GET /entities`, `GET /entities/{id}` |
| **Compare** | `/compare` | Pairwise match inspection matrix | Filter by match confidence, inspect token & Levenshtein scores | `GET /matches/pairs`, `GET /matches/pairs/{id}` |
| **Analytics** | `/analytics` | Algorithmic metrics & distributions | Recharts entity trends, confidence histogram, counter badges | `GET /stats/overview`, `GET /stats/algorithms`, `GET /pipeline/runs` |
| **Candidate Blocking** | `/algorithms/blocking` | Suffix Array & LCP visualizer | Interactive LCP slider simulation, live comparison reduction | `GET /pipeline/runs` |
| **Similarity Engine** | `/algorithms/similarity` | Real-time string metric test harness | Debounced live API test, decomposed algorithmic score bars | `POST /similarity/test` |
| **Clustering Engine** | `/algorithms/clustering` | Union-Find DSU graph simulator | Live threshold cutoff slider, real-time graph component counts | `GET /matches/pairs`, `GET /pipeline/runs` |
| **Exports** | `/exports` | Data export center | Stream clusters CSV and candidate pairs CSV directly to browser | `GET /export/clusters/{id}`, `GET /export/pairs/{id}` |
| **Settings** | `/settings` | System parameters & DB management | View algorithm thresholds, execute instantaneous DB wipe | `DELETE /admin/clear-all` |

---

## 10. Algorithm Pages (Interactive Demos)

### 1. Candidate Blocking (`/algorithms/blocking`)
- **Minimum LCP Suffix Length Slider (`4–20 chars`)**: Simulates the strictness of the Suffix Array window. Higher values prune candidate pairs aggressively; lower values capture broader spelling variations.
- **Token N-Gram Shingle Size Slider (`2–6 shingles`)**: Controls the sub-word granularity used in inverted index token buckets.
- **Client-Side Simulation**: Computes live projected candidate pairs and comparison reduction percentage instantly based on the catalog size of the latest run.

### 2. Similarity Metric Test Harness (`/algorithms/similarity`)
- **Real-Time Backend Execution**: Debounces user input by 500ms and calls `POST /api/v1/similarity/test`.
- **Algorithmic Decomposition**: Renders live animated score bars for:
  - **KMP Substring Match** (exact pattern containment)
  - **Rabin-Karp Rolling Hash** (3-gram hash overlap)
  - **Levenshtein Similarity** (normalized edit distance)
  - **Jaccard Token Overlap** (word set intersection / union)
  - **Weighted Composite Confidence** with decision badge (`MATCH (CONFIRMED)`, `PROBABLE MATCH (REVIEW)`, or `DISTINCT ENTITY`).

### 3. Clustering Engine (`/algorithms/clustering`)
- **Live DSU Graph Simulator**: Fetches all candidate pairs from the latest completed pipeline run.
- **Edge Threshold Slider (`0.00–1.00`)**: Evaluates Disjoint Set Union (DSU) in-memory in JavaScript with path compression. As the threshold moves, it counts active graph edges and updates the estimated canonical cluster count in $<1\text{ms}$.

---

## 11. Configuration

### Backend Configuration (`application.properties`)

```properties
# Application Name & Port
spring.application.name=resolve-backend
server.port=8080

# Supabase PostgreSQL (IPv4 Session Pooler with Batch Rewriting)
spring.datasource.url=jdbc:postgresql://aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require&reWriteBatchedInserts=true
spring.datasource.username=postgres.nsvaqxjodwqdtmeocvtr
spring.datasource.password=z9RL-pTM34SNwGk
spring.datasource.driver-class-name=org.postgresql.Driver

# HikariCP Connection Pool Optimization
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=3
spring.datasource.hikari.keepalive-time=30000

# Hibernate Batching (Critical for fast bulk insertion)
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.jdbc.batch_size=100
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
spring.jpa.properties.hibernate.jdbc.batch_versioned_data=true
spring.jpa.open-in-view=false

# File Upload Limits
spring.servlet.multipart.max-file-size=500MB
spring.servlet.multipart.max-request-size=500MB

# Thread Pool for Asynchronous Pipeline Runs
spring.task.execution.pool.core-size=4
spring.task.execution.pool.max-size=8
spring.task.execution.pool.queue-capacity=100
```

---

## 12. Mock Datasets & Test Data

The `mock csv/` directory contains 3 curated CSV files designed with intentional real-world duplicates, vendor price variances, brand casing discrepancies, and model number noise.

### CSV Format Requirements
Any custom CSV uploaded to the system must include the following 7 column headers:
```csv
id,title,brand,price,description,category,source
```

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` | String | Vendor-specific external record identifier | `ELEC-101` |
| `title` | String | Raw product title string | `Apple iPhone 15 Pro (128 GB) - Natural Titanium` |
| `brand` | String | Brand or manufacturer name | `Apple` |
| `price` | Numeric | Listing price | `999.00` |
| `description` | String | Textual specification or product description | `A17 Pro chip 48MP main camera...` |
| `category` | String | Product category classification | `Smartphones` |
| `source` | String | E-commerce platform source | `amazon`, `flipkart`, `ebay` |

### Included Mock Files
1. **`mock_appliances.csv`** (20 products): Washing machines, refrigerators, cordless vacuums, air fryers, and microwaves across LG, Samsung, Dyson, Daikin, Philips, Instant Pot, iRobot, and Panasonic.
2. **`mock_electronics.csv`** (30 products): Flagship smartphones, laptops, noise-cancelling headphones, wireless mice, e-readers, and cameras across Apple, Samsung, Sony, Bose, Dell, ASUS, GoPro, and Logitech.
3. **`mock_mixed_catalog.csv`** (50 products): Multi-category catalog items with cross-vendor variations across Amazon, Flipkart, Walmart, Target, and eBay.

---

## 13. Known Limitations

- **Cloud Database Latency**: The PostgreSQL database is hosted on Supabase in the `ap-northeast-2` region. Depending on your geographic location, network latency per round-trip query is typically $50\text{–}150\text{ms}$. Bulk inserts use Hibernate batching (`batch_size=100`) to mitigate network overhead.
- **Suffix Array String Bounds**: To maintain a deterministic memory footprint during in-memory suffix array construction on JVM heap, aggregated title strings are bounded at 50,000 characters.
- **Authentication**: Authentication routes (`/login`, `/register`) are structured for frontend presentation; API endpoints operate in open workspace mode for demonstration and evaluation.

---

## Authors & Academic Attribution
Developed as part of the **Data Structures and Algorithms (DSA)** Engineering Curriculum for High-Throughput E-Commerce Entity Resolution.
