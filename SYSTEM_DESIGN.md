# System Design Documentation

> **Note for AI Agents**: Read this file to understand the project architecture, key workflows, and development conventions.

## 1. System Overview
**APCS Practice Platform** is a web-based learning environment for the Taiwan APCS exam. It features an interactive quiz system, an online code judge, mock exams, and an AI tutor.

### Tech Stack
*   **Frontend**: Vue 3 (Composition API), Vite, Tailwind CSS, Pinia.
*   **Backend**: Node.js (Express), PostgreSQL (`pg`), Gemini API.
*   **Infrastructure**: Docker Compose (Production & Dev variants).

## 2. Architecture & Key Modules

### A. Frontend (`client/`)
*   **Views**:
    *   `ConceptQuiz.vue`: Interactive multiple-choice questions.
    *   `ProblemView.vue`: Coding environment with Monaco Editor.
    *   `MockExamView.vue`: 2.5h timer-based exam simulation.
*   **API Proxy**: Vite is configured (`vite.config.js`) to proxy `/api` requests to the backend (configurable via `VITE_API_TARGET`).

### B. Backend (`server/`)
*   **Judge System (`routes/judge.js`)**:
    *   Supports Python and C/C++.
    *   **Mechanism**: Currently uses direct execution via `child_process` (simple implementation) or looks for Docker containers? *Analysis indicates it relies on `services/judgeService.js`.*
    *   **Flow**: User submits code -> Backend retrieves Test Cases -> Backend executes code against inputs -> Compares outputs -> Returns Verdict (AC/WA/TLE/RE).
*   **AI Tutor (`routes/ai.js`)**:
    *   Integrates Google Gemini (`gemini-flash-latest`).
    *   **Features**: Code Hints (without giving answers), Question Generation (Single & Batch JSON output).
    *   **Batch Generation**: Supports generating sets of Concept Questions or Coding Problems with random topic selection.
*   **Authentication**:
    *   JWT-based (Access Token).
    *   Bcrypt for password hashing (10 rounds).

### C. Database (PostgreSQL)
*   **Tables**: `users`, `questions_concept`, `questions_implementation`, `implementation_test_cases`, `submissions`, `comments`.
*   **Initialization**: 
    *   Schema: `server/schema.sql`
    *   Seeding: `server/seed.sql` (Admin User + Sample Data)
    *   *Automated in Docker via `/docker-entrypoint-initdb.d/` mounts.*

## 3. Development Workflow (Critical)
We support two development modes. **Method A is the standard recommendation.**

### Method A: Hybrid (Recommended)
*   **Database**: Runs in Docker (`apcs-db-dev`).
    ```bash
    docker-compose -f docker-compose.dev.yml up -d db
    ```
*   **Backend**: Runs locally (Port 3000).
    ```bash
    cd server && npm install && node index.js
    ```
*   **Frontend**: Runs locally (Port 5173).
    ```bash
    cd client && npm install && npm run dev
    ```

### Method B: Full Docker
*   Uses `docker-compose.dev.yml` to run all services (App + DB) in containers with Hot Reload enabled via Volumes.

## 4. API Design
*   Base URL: `/api`
*   Auth Header: `Authorization: Bearer <token>`
