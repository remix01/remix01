# LiftGO AI Patterns v2.0 — Architecture Diagrams

Mermaid diagrams showing the architecture of all five AI execution patterns.

---

## Pattern 1: Sequential Pipeline

```mermaid
flowchart TD
    A[User Input\ninitialMessage] --> S1

    subgraph Pipeline
        S1[Step 1\nwork_description\nuseRAG: true]
        S2[Step 2\nquote_generator\nbuildMessage fn]
        S3[Step 3\njob_summary\nbuildMessage fn]

        S1 -->|response| S2
        S2 -->|response| S3
    end

    S3 -->|finalOutput| R[PipelineResult]

    E{Error?} -.->|failFast=true| STOP[Stop Pipeline]
    E -.->|failFast=false| CONT[Continue with\nprevious output]

    S1 -.->|throws| E
    S2 -.->|throws| E
    S3 -.->|throws| E

    style Pipeline fill:#f0f4ff,stroke:#6366f1
```

---

## Pattern 2: Parallel Execution

```mermaid
flowchart TD
    IN[Parallel Tasks Array] --> BATCH

    subgraph BATCH[Promise.allSettled]
        direction LR
        A1[quote_generator]
        A2[materials_agent]
        A3[job_summary]
    end

    BATCH --> COL[Collect Results]

    COL --> F[fulfilled[]]
    COL --> R[rejected[]]

    F --> M[Metrics\ntotalCost\ntotalTokens]
    F --> MAP[results Record\nlabel → result]

    style BATCH fill:#f0fdf4,stroke:#22c55e
```

---

## Pattern 3: Agent Router

```mermaid
flowchart TD
    IN[RouterInput\nuserId + userRole + message] --> OV{agentOverride\nset?}

    OV -->|Yes| OVER[Use override agent]
    OV -->|No| CLASS[classifyIntent\nkeyword scoring]

    CLASS --> BEST{Score > 0?}
    BEST -->|Yes| KW[keyword match]
    BEST -->|No| ROLE{userRole}
    ROLE -->|narocnik| WD[work_description]
    ROLE -->|obrtnik| QG[quote_generator]
    ROLE -->|fallback| GC[general_chat]

    OVER --> TIER
    KW --> TIER
    WD --> TIER
    QG --> TIER
    GC --> TIER

    TIER[isAgentAccessible\ntier check]
    TIER -->|No| ERR1[AgentAccessError]
    TIER -->|Yes| QUOTA[getDailyUsage\nquota check]
    QUOTA -->|Exceeded| ERR2[QuotaExceededError]
    QUOTA -->|OK| EXEC[executeAgent]
    EXEC --> RESULT[RouterResult]

    style TIER fill:#fef3c7,stroke:#f59e0b
    style QUOTA fill:#fef3c7,stroke:#f59e0b
```

---

## Pattern 4: Human-in-the-Loop

```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant HITL as HITL Pattern
    participant DB as hitl_approvals (Supabase)
    participant RT as Supabase Realtime
    participant Human as Human Approver
    participant UI as Frontend UI

    Agent->>HITL: createHITLRequest(executionId, context)
    HITL->>DB: INSERT status='pending'
    DB-->>HITL: approvalId
    HITL-->>Agent: { approvalId }

    Note over Agent: Execution paused (waiting)

    UI->>RT: subscribeToApprovals(executionId)

    Human->>DB: approveRequest(id, approverId) or rejectRequest()
    DB-->>RT: UPDATE event (status changed)
    RT-->>UI: callback(approval)

    alt Server-side polling
        Agent->>DB: Poll getApproval(id) every 5s
        DB-->>Agent: { status: 'approved' }
    end

    Agent->>Agent: Continue or abort based on status
```

---

## Pattern 5: Dynamic Spawn

```mermaid
flowchart TD
    DESC[taskDescription] --> ANALYSE

    subgraph ANALYSE[analyseTaskComplexity — Claude Haiku]
        C1[Detect domains]
        C2[Score complexity]
        C3[Recommend agents]
        C1 --> C2 --> C3
    end

    ANALYSE --> DECISION{complexity}

    DECISION -->|simple| SINGLE[Single Agent\nAI.route]
    DECISION -->|moderate| POOL2[Pool: 2 agents]
    DECISION -->|complex| POOL5[Pool: 3-5 agents]

    POOL2 --> PARALLEL
    POOL5 --> PARALLEL

    subgraph PARALLEL[spawnAgentPool — Promise.allSettled]
        direction LR
        SA1[Agent 1]
        SA2[Agent 2]
        SA3[Agent 3...]
    end

    PARALLEL --> MERGE[mergeAgentOutputs\nClaude Haiku]
    MERGE --> OUT[SpawnPoolResult\nmergedResponse]
    SINGLE --> OUT2[RouterResult]

    style ANALYSE fill:#fdf4ff,stroke:#a855f7
    style PARALLEL fill:#f0fdf4,stroke:#22c55e
    style MERGE fill:#fdf4ff,stroke:#a855f7
```

---

## Combined: HITL + Dynamic Spawn

```mermaid
flowchart TD
    START[Complex Task Request] --> SPAWN

    subgraph SPAWN[Dynamic Spawn Phase]
        ANA[analyseTaskComplexity]
        POOL[spawnAgentPool\nparallel execution]
        MERGE[mergeAgentOutputs]
        ANA --> POOL --> MERGE
    end

    MERGE --> HITL_REQ[createHITLRequest\ncontext = mergedOutput]

    subgraph HITL_PHASE[HITL Phase]
        WAIT[waitForApproval\nserver polling]
        RT[Realtime push to UI]
        HUMAN[Human Reviews]
        DECIDE{Decision}

        WAIT --> RT --> HUMAN --> DECIDE
    end

    HITL_REQ --> HITL_PHASE

    DECIDE -->|approved| DELIVER[Deliver mergedOutput]
    DECIDE -->|rejected| ABORT[Abort with note]
    DECIDE -->|timeout| EXPIRE[Expire request]

    style SPAWN fill:#f0fdf4,stroke:#22c55e
    style HITL_PHASE fill:#fef3c7,stroke:#f59e0b
```

---

## System Architecture: Data Flow

```mermaid
flowchart LR
    subgraph Client["Client (Next.js App Router)"]
        PAGE[Page / Component]
        ACTION[Server Action]
    end

    subgraph Patterns["lib/ai/patterns/"]
        SEQ[sequential-pipeline]
        PAR[parallel-execution]
        ROUTER[agent-router]
        HITL_P[human-in-the-loop]
        SPAWN_P[dynamic-spawn]
    end

    subgraph Core["lib/ai/orchestrator.ts"]
        EXEC[executeAgent]
        QUOTA[Quota Check]
        RAG[RAG Context]
        CLAUDE[Claude API]
    end

    subgraph DB["Supabase (whabaeatixtymbccwigu)"]
        PROFILES[profiles]
        USAGE[ai_usage_logs]
        HITL_TBL[hitl_approvals]
        TASKS[tasks / ponudbe]
    end

    PAGE --> ACTION
    ACTION --> Patterns
    Patterns --> Core
    Core --> CLAUDE
    Core --> QUOTA --> PROFILES
    Core --> QUOTA --> USAGE
    Core --> RAG --> TASKS
    HITL_P --> HITL_TBL
    HITL_TBL -.->|Realtime| PAGE
```

---

## Subscription Tier Access Matrix

```mermaid
%%{init: {'theme': 'base'}}%%
quadrantChart
    title Agent Availability by Tier
    x-axis "START" --> "PRO"
    y-axis "Low Daily Limit" --> "High Daily Limit"
    quadrant-1 PRO Power Agents
    quadrant-2 PRO Restricted
    quadrant-3 START Basic
    quadrant-4 START Everyday
    general_chat: [0.15, 0.35]
    work_description: [0.15, 0.25]
    offer_comparison: [0.15, 0.20]
    scheduling_assistant: [0.15, 0.30]
    quote_generator: [0.15, 0.30]
    job_summary: [0.15, 0.30]
    video_diagnosis: [0.85, 0.45]
    materials_agent: [0.85, 0.55]
    offer_writing: [0.85, 0.70]
    profile_optimization: [0.85, 0.40]
```
