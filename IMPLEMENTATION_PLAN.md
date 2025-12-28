# APCS Practice Platform - Requirements Specification

## 1. Product Overview
The goal is to build a web-based platform for students to practice for the **Taiwan APCS (Advanced Placement Computer Science)** exam. The platform must simulate the actual exam environment and provide learning feedback.

### Exam Structure Reference
- **Concept (程式識讀)**: 30 Questions / 90 Mins.
    - Format: Multiple Choice.
    - Content: C/C++ (Traditional), Python (New from 2025).
    - Scope: Code tracing, Debugging, Logic, Recursion, Data Structures.
- **Implementation (程式實作)**: 3-4 Questions / 120 Mins.
    - Format: Online Coding (Input -> Output).
    - Languages: C, C++, Java, Python.
    - Judge System: Automated text-based input/output testing.

## 2. User Roles
### 2.1 Student
- Practice concept questions (Quiz mode).
- Practice implementation questions (Code Editor + Judge).
- View progress and history.
- Take Mock Exams (Full timer and set question set).

### 2.2 Admin / Teacher
- Manage Question Bank (Create/Edit/Delete Concept & Implementation questions).
- View Student Analytics (optional for MVP, but good for "Teacher").

## 3. Key Feature Requirements

### 3.1 Authentication
- Simple Email/Password login.
- (Optional) OAuth (Google).

### 3.2 Concept Practice (Quiz System)
- **Question Bank**: Support for code blocks (syntax highlighted) in question descriptions.
- **Modes**:
    - *Practice Mode*: Immediate feedback after each question (Correct/Incorrect + Explanation).
    - *Exam Mode*: Timer (90m), no feedback until end.
- **Scoring**: Calculate final score (0-100).

### 3.3 Implementation Practice (Online Judge)
- **Problem View**: Markdown support for problem description, input/output format, and sample cases.
- **Code Editor**:
    - Syntax highlighting for C, C++, Java, Python.
    - Theme support (Light/Dark).
    - Basic autocomplete.
- **Judge System**:
    - **Run Code**: Allow users to run code against "Sample Inputs" to see output.
    - **Submit**: Run code against "Hidden Test Cases".
    - **Status**: AC (Accepted), WA (Wrong Answer), TLE (Time Limit Exceeded), CE (Compilation Error), RE (Runtime Error).
    - **Sandbox**: Secure execution environment (prevent malicious code).

### 3.4 Mock Exam
- Combine Concept + Implementation.
- Strict timer.
- Dashboard to review past exams.

## 4. Technical Architecture Recommendations

### 4.1 Frontend (User's Preference Reference: Vue.js)
- **Framework**: Vue 3 + Vite.
- **Styling**: Tailwind CSS (Modern, Responsive).
- **State**: Pinia.
- **Router**: Vue Router.
- **Editor Component**: `monaco-editor` (VS Code's editor core) is highly recommended for the best coding experience.

### 4.2 Backend
- **Option A (Node.js)**: Express.js or NestJS. Easy to implement WebSockets for real-time judge status.
- **Option B (Python)**: FastAPI. Good if we want to write the Grading Logic in Python.

### 4.3 Database
- **PostgreSQL**: Strong relational data (Users -> Submissions -> Problems).
- **Redis** (Optional): For caching judge results or managing queues if high traffic.

### 4.4 Judge Engine (The Core Challenge)
- **Recommendation**: Do NOT build from scratch if possible.
- **External API**: Use [Judge0](https://judge0.com/) API (Self-hosted or Cloud). It handles sandboxing, multiple languages (C/C++/Java/Python), and TLE/Memory limits.
- **Custom (Docker)**: If building custom, spawn a Docker container for each submission, mount source code, compile, run with timeout `timeout`, and diff output.

## 5. Implementation Roadmap (Agent Instructions)
1.  **Phase 1: Foundation**: Setup Vue 3 + Backend. Auth system.
2.  **Phase 2: Concept Mode**: Database schema for MCQs. Quiz UI.
3.  **Phase 3: Implementation Mode (UI)**: Integrate Monaco Editor. Problem View.
4.  **Phase 4: Judge Integration**:
    - Build local `judgeService.js` using `child_process`.
    - Pull `python:3.9-alpine` for Python execution.
    - Mount temp files to Docker container for execution security.
    - (Future) Add GCC for C/C++ support.
5.  **Phase 5: Authentication & User Profiles**:
    - Implement JWT / Session-based Login.
    - Role-based Access Control (Admin vs Student).
    - User Profile & Submission History.
6.  **Phase 6: Advanced Judge Feature (Judge V2)**:
    - Add GCC/G++ support for C/C++.
    - Implement "Hidden Test Cases" (Full Submission vs Sample Run).
    - Secure the Sandbox (Memory limits, File system restriction).
7.  **Phase 7: Mock Exam Mode**:
    - Combined Concept (30 MCQs) + Implementation (3 Coding problems).
    - 2.5 Hour Timer (simulating real APCS).
    - Automatic Scoring & Grade Calculation (1-5 Level).
8.  **Phase 8: Analytics & Dashboard**:
    - Student: "Weakness Analysis" (e.g., "You often fail Pointer questions").
    - Admin: Question Bank Statistics (Difficulty rating based on pass rate).
    - Visual Charts using `chart.js` or `echarts`.
9.  **Phase 9: Community & Discussions**:
    - Discussion Board per problem.
    - Solution Sharing (after solving).
    - Vote/Like system.
10. **Phase 10: AI Tutor Integration**:
    - "Explain this Code" button (using LLM).
    - "Get Hint" for stuck students (without revealing answer).
    - **Implementation**: Integrate `@google/generative-ai` SDK.
    - **Models**: Use `gemini-1.5-flash` for speed/cost.
11. **Phase 11: AI Question Generator (Admin)**:
    - **Concept Questions UI (`AdminConcept.vue`)**: Admin inputs a topic, AI generates JSON (Title, Content, Options, Answer).
    - **Implementation Questions UI (`AdminProblem.vue`)**:
        - Create missing Admin UI for coding problems.
        - Add "Generate with AI" button.
        - AI generates: Title, Markdown Description, and JSON Test Cases (Input/Output).
12. **Phase 12: Production Deployment**:
    - Docker Compose for full stack (App + DB + Redis).
    - Nginx reverse proxy configuration.
    - CI/CD pipeline (GitHub Actions).

## 6. Schema Draft (Simplified)

### `users`
- id, email, password_hash, role

### `questions_concept`
- id, title, content (markdown), code_snippet, options (JSON), answer_index, explanation

### `questions_implementation`
- id, title, description (markdown), time_limit, memory_limit
- `test_cases`: [{input, output, is_sample}]

### `submissions`
- id, user_id, question_id, code, language, status (AC/WA...), output_log, timestamp

## 7. Data Strategy for Question Bank
Since there is no official API for APCS questions (mostly PDFs), we will use a hybrid approach:
1.  **Manual Entry (Admin)**: The Admin portal will have a "Create Question" form to manually input questions from released PDF exams.
2.  **Community Repositories**: Use data from open-source repos like `twyu/APCS` or `kungyanling/APCS` as a reference to copy-paste problem descriptions and test cases.
3.  **AI Generation (Teacher Aid)**: Integrate an LLM (Gemini/GPT) feature in the Admin block to "Generate similar concept questions" or "Parse PDF text to Markdown" to speed up data entry.

## 8. Refinement 2025-12-28
### Goal
Ensure the AI Question Generator returns clean, valid JSON without any markdown formatting or "thinking" text, to prevent parsing errors in the frontend.

### Proposed Changes
#### Server
- `server/routes/ai.js`:
    - Update `getGenerativeModel` or `generateContent` to use `generationConfig: { responseMimeType: "application/json" }`.
    - Refine prompts to be stricter about JSON output if needed, though `responseMimeType` should handle it.

### Verification Plan
#### Automated Tests
- Run the following command to generate a question and verify the output is raw JSON:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com", "password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s -X POST http://localhost:3000/api/ai/generate-question -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"topic": "Recursion"}'
```
- Verify no ` ```json ` fences are present in the output.

## 9. Question Bank LLM Integration (branch: feature/question_bank_llm)
### Goal
Enhance the "Admin" capabilities to rapidly build the question bank using LLMs.

### Proposed Changes
#### Backend
- `server/routes/ai.js`:
    - **[DEFERRED]** Endpoint: `/api/ai/parse-pdf-text` (Mock/Text based first).
    - **[NEW]** Endpoint: `/api/ai/generate-batch` -> 
        - Input: `topic` (optional, String) + `count` (optional, default 3, Integer).
        - Logic: 
            - If `topic` is provided: Generate `count` questions on that topic.
            - If `topic` is EMPTY: For each of the `count` questions, randomly select a topic from a predefined list (e.g., Arrays, Recursion, Pointers) to ensure variety.
        - Output: List of JSON questions.

#### Frontend
- `client/src/views/AdminConcept.vue`:
    - Add "Bulk Generate" button/modal.
    - **UI Inputs**:
        - **Topic**: (Optional) Dropdown with "Random (Mixed Topics)" as default.
            - **Curated List**: 
                - Basic IO & Variables
                - Control Structures (If/Else, Loops)
                - Arrays & Strings
                - Functions & Recursion
                - Pointers & Memory
                - Data Structures (Stack, Queue, Tree)
                - Algorithms (Sorting, Searching, Greedy, DP)
            - Allow "Other" (Manual Entry).
        - **Quantity**: (Dropdown: 3, 5, 10).
    - **Display**: Show generated questions in a list for review before saving to DB.

### Verification Plan
- **Manual Test**:
    - Login as Admin.
    - **Scenario A (Specific Topic)**: Select "Recursion", Count: 3. Verify 3 Recursion questions.
    - **Scenario B (Random)**: Select "Random", Count: 5. Verify 5 questions from DIFFERENT topics.
    - Save them and verify they appear in the database/list.

## 9.1 Bulk Generate for Implementation Problems
### Goal
Extend bulk generation to "Coding Problems" (Implementation Mode).

### Proposed Changes
#### Backend
- `server/routes/ai.js`:
    - **[NEW]** Endpoint: `/api/ai/generate-implementation-batch` -> 
        - Input: `topic` (optional) + `count`.
        - Logic: Similar to concept batch, but generates full coding problems with test cases.
        - **Note**: Generating 10 coding problems is slow/expensive. Cap at 3 for now.

#### Frontend
- `client/src/views/AdminProblem.vue`:
    - Replicate the "Bulk Generate" UI from `AdminConcept.vue`.
    - Adapt the "Review List" to show Problem Title + Brief Description.

### Verification Plan
- Generate 2 Coding Problems on "Arrays".
- Verify they have Description and Test Cases.
