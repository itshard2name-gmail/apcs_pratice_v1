# APCS Practice Platform - User Manual 📘

Welcome to the **APCS Practice Platform**! This system is designed to help students prepare for the APCS (Advanced Placement Computer Science) exam through interactive quizzes, coding challenges, and mock exams.

---

## 🚀 Getting Started

### 1. Registration & Login
-   **Register**: Click "Sign Up" on the top right. Enter your name, email, and password.
-   **Login**: Use your email and password to access the platform.
-   **Roles**:
    -   **Student**: Default role. Can take quizzes and exams.
    -   **Admin**: (Requires manual database assignment) Can manage content.

---

## 🎓 Student Guide

### 1. Concept Quiz (程式識讀)
**URL**: `http://localhost:5173/concept`
Practice multiple-choice questions on C/C++ and Python concepts.
-   Navigate to **Concept Quiz**.
-   Select a quiz.
-   Answer questions and get immediate feedback.
-   **Score**: Your results are saved to your profile.

### 2. Coding Problems (程式實作)
**URL**: `http://localhost:5173/problem`
Solve algorithmic problems with an integrated Online Judge.
-   Navigate to **Coding Problems**.
-   **Editor**: Write code in C, C++, Java, or Python.
-   **Run Code**: Test against "Sample Inputs" to verify correctness.
-   **Submit**: Run against "Hidden Test Cases" for final grading.
-   **Status Codes**:
    -   `AC`: Accepted (Correct) ✅
    -   `WA`: Wrong Answer ❌
    -   `TLE`: Time Limit Exceeded ⏱️
    -   `CE`: Compilation Error ⚠️

### 3. AI Tutor 🤖
Stuck on a problem?
-   Click the **"🤖 Get AI Hint"** button in the coding workspace.
-   The AI will analyze your code and give you a helpful nudge without revealing the full answer.

### 4. Mock Exam 🕒
**URL**: `http://localhost:5173/exam`
Simulate the real APCS exam environment.
-   Click **Start Mock Exam**.
-   **Timer**: 2.5 hours total.
-   **Content**: 20 Concept Questions + 2 Coding Problems.
-   **Result**: Get a final grade (Level 1-5) and score breakdown.

### 5. Analytics & Profile
**URL**: `http://localhost:5173/profile`
-   Click your **Name** (top right) -> **Profile**.
-   View your submission history and pass rate charts.

---

## 🛠️ Admin Guide

### 1. Creating Concept Questions
-   Go to `http://localhost:5173/admin/concept`.
-   **Manual**: Fill in Title, Content, Options, and Answer.
-   **✨ AI Generate**:
    1.  Click the **"✨ AI Generate"** button.
    2.  Enter a topic (e.g., "Pointers", "Recursion").
    3.  The system will auto-generate a question for you.

### 2. Creating Coding Problems
-   Go to `http://localhost:5173/admin/problem`.
-   **Manual**: Fill in Title, Description (Markdown supported), Time Limit.
-   **Test Cases**: Add multiple input/output pairs. Check "Is Sample Case?" to make them visible to students.
-   **✨ AI Generate**:
    1.  Click **"✨ AI Generate"**.
    2.  Enter a topic (e.g., "Graph Theory", "DFS").
    3.  The system will generate the description and test cases automatically.

---

## 👨‍💻 Developer Guide (Resuming Work)
If you want to switch back to the Workspace and continue development, follow these steps:

### 1. Start the Database
The database runs in Docker. Ensure Docker Desktop is running.
```bash
# Start the existing database container
docker start apcs-db
```
*(If the container is missing, run `docker run --name apcs-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=apcs_db -p 5433:5432 -d postgres:15-alpine`)*

### 2. Start the Backend Server
Open a terminal in the project root:
```bash
cd server
export POSTGRES_PORT=5433
export POSTGRES_DB=apcs_db
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=password
# (Ensure GEMINI_API_KEY is in your .env or exported)
npm install # Install deps if needed
node index.js
```
*Server runs on `http://localhost:3000`*

### 3. Start the Frontend Client
Open a **new** terminal tab:
```bash
cd client
npm install # Install deps if needed
npm run dev
```
*Client runs on `http://localhost:5173`*
