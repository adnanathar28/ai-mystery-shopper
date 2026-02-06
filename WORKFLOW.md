## 🧠 The Agent Cognitive Loop (Chain of Thought)

To ensure the "Thought Bubble" and Agent actions are perfectly synchronized, we follow a **Single-Stream Cognitive Loop**. This prevents the agent from doing one thing while saying another.

### 🔄 The Loop Diagram
```mermaid
graph TD
    A[Capture Screenshot] --> B[Overlay ID Tags/Set-of-Mark]
    B --> C[Send to Multimodal LLM]
    C --> D{LLM Streaming}
    D -- Token by Token --> E[Frontend: Live Thought Bubble]
    D -- Final JSON Object --> F[Backend: Playwright Action]
    F --> G[Update Friction Score]
    G --> A