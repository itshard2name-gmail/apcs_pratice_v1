# APCS Practice Platform 🎓

> A comprehensive learning platform focused on the Taiwan APCS (Advanced Placement Computer Science) exam.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue.js](https://img.shields.io/badge/vue.js-v3-green.svg)
![Node.js](https://img.shields.io/badge/node.js-v20-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

## 🌟 Overview
This platform provides an all-in-one environment for students to practice **Concept Questions** (Multiple Choice) and **Implementation Problems** (Coding) simulating the real APCS exam experience.

## ✨ Key Features
*   **Concept Quiz**: Interactive mock quizzes with instant explanation feedback.
*   **Online Judge**: Real-time code execution (C/C++, Python, Java) running in secure Docker containers.
*   **Mock Exam**: Full 2.5-hour exam simulation with scoring.
*   **AI Tutor**: Integrated Google Gemini AI to provide intelligent hints.
*   **Admin Panel**: AI-assisted question generation tools for teachers.
*   **Analytics**: Personal dashboard tracking submission history and problem-type analysis.

## 🛠️ Tech Stack
*   **Frontend**: Vue 3, Vite, Tailwind CSS, Pinia, Monaco Editor.
*   **Backend**: Node.js (Express), PostgreSQL.
*   **Infrastructure**: Docker, Docker Compose, Nginx.
*   **AI**: Google Gemini API (`gemini-flash-latest`).

## 🚀 Quick Start

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop)
*   [Node.js](https://nodejs.org/) (v18+)

### Development Setup
1.  **Start Database**:
    ```bash
    # Run PostgreSQL container
    docker run --name apcs-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=apcs_db -p 5433:5432 -d postgres:15-alpine
    ```

2.  **Setup Backend**:
    ```bash
    cd server
    cp .env.example .env # Set your GEMINI_API_KEY
    npm install
    # Export DB Config (Mac/Linux)
    export POSTGRES_PORT=5433
    export POSTGRES_DB=apcs_db
    export POSTGRES_USER=postgres
    export POSTGRES_PASSWORD=password
    node index.js
    ```

3.  **Setup Frontend**:
    ```bash
    cd client
    npm install
    npm run dev
    ```
    Visit `http://localhost:5173`.

### Development with Docker (Hybrid/Full)
**Option A: Hybrid (Recommended)**
Run **Development DB** in Docker, code locally.
```bash
docker-compose -f docker-compose.dev.yml up -d db
# Then run backend and frontend locally as above
```

**Option B: Full Docker Dev**
Run everything in Docker with Hot Reload.
```bash
docker-compose -f docker-compose.dev.yml up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- API Key: Set `GEMINI_API_KEY` in `.env` or export it before running.

### Production Deployment
Run the entire stack with Docker Compose:
```bash
docker-compose up --build -d
```
Access the app at `http://localhost:8080`.

## 📚 Documentation
*   [**User Manual**](./USER_MANUAL.md): Comprehensive guide for Students and Admins.
*   [**Implementation Plan**](./IMPLEMENTATION_PLAN.md): Technical requirements and architecture.
*   [**Task List**](./TASK.md): Development progress tracker.
*   [**System Design**](./SYSTEM_DESIGN.md): Architecture and Dev Guidelines.
*   [**Walkthrough**](./WALKTHROUGH.md): Detailed feature verification steps.

## 📄 License
MIT License.
