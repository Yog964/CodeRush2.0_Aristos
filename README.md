# CodeRush2.0_Aristos: Unified Agentic Coding Harness

## Problem Statement
Developing reliable, autonomous, and production-ready AI coding agents is incredibly challenging. Most current agentic solutions suffer from:
- **Lack of Safety and Isolation**: Executing arbitrary LLM commands on local machines introduces catastrophic security and stability risks.
- **Context Overload**: Feeding entire repositories into LLM contexts causes hallucination, token exhaustion, and extreme latency.
- **Brittle Planning**: Single-agent loops often fail on complex, multi-step tasks due to accumulating errors and lack of peer validation.
- **Poor Observability**: "Black box" AI executions make it impossible to debug, audit, or build trust in the system's autonomous decisions.

## Solution
We introduce the **Unified Agentic Coding Harness**, an advanced, modular architecture designed to solve these exact problems. Instead of treating the LLM as a monolithic magic box, the harness provides a structured, four-layered ecosystem where LLMs act as intelligent actors within a heavily governed, observable, and isolated environment. 

## Harness Details
The harness acts as the robust backbone of the system, providing:
- **Production Hardening**: A comprehensive Trust System with dynamic **Approval Gates** (human-in-the-loop) for high-risk commands (like `rm`, `push`) and a robust Event Logger/Trace Collector.
- **Sandbox Executor**: All code changes and shell commands are safely executed within isolated environments (Docker-backed) featuring strict resource limits (Memory, CPU, PIDs) and network isolation.
- **Reversible Tool System**: Built-in Git snapshotting and rollback mechanics to instantly revert mistakes or hallucinated code edits.

## Architecture
The system is divided into four main functional layers, closely aligning with advanced multi-phase agent designs:

1. **Layer 0: Adapters & Observability**
   - **Model-Agnostic Adapters**: Pluggable interfaces for local (Ollama) and cloud models.
   - **Observability**: End-to-end event tracing, token counting, and colored terminal logging for total transparency.

2. **Layer A: Perception**
   - **Repository Intelligence**: Automatically indexes files, maps ASTs/symbols, and builds an Engineering Knowledge Graph.
   - **Context Manager**: Dynamically compresses context and limits prompt injections based on strict token budgets.

3. **Layer B: Cognitive Intelligence**
   - **Memory System**: A multi-tiered SQLite-backed memory system (Working, Task, Project, Strategy) providing persistent state.
   - **Parliamentary Planner**: Automatically delegates work across specialized AI personas (e.g., Coder, Tester, Reviewer) and creates DAG (Directed Acyclic Graph) task structures with robust fallback mechanics.

4. **Layer C & D: Action & Validation**
   - **Tool Engine**: Executes read/write, search, and shell commands safely.
   - **Verification Engine**: An Evidence-First system running linters, tests, and security checks to generate a final Confidence Score before changes are ever proposed to the user.
