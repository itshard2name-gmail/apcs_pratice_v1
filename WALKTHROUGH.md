# APCS Platform - Concept Mode MVP Walkthrough

I have successfully built the **Foundation** and **Phase 2: Concept Mode** of the APCS Practice Platform.

## 🚀 Features Implemented
1.  **Project Structure**: Vue 3 (Frontend) + Express (Backend) + PostgreSQL (Docker).
2.  **Concept Practice (Student)**:
    - View list of available concept questions.
    - Interactive Quiz Interface with code snippets and option selection.
    - Immediate feedback (Correct/Incorrect + Explanation).
3.  **Admin Interface**:
    - dedicated form to create new concept questions manually (as part of the Data Strategy).
    - Supports Markdown-like text and Code Snippets.
4.  **Implementation Practice (Student)**:
    - Lists Coding Problems with Time/Memory limits.
    - **Problem View**: Rendered Markdown description (using `markdown-it`).
    - **Code Editor**: Integrated Monaco Editor (VS Code experience) with syntax highlighting.
    - **Judge Simulation**: "Run Code" button sends code to backend and returns mock execution results (e.g., Python input "5 10" -> "15").

## 🛠️ How to Test

### 1. Access the Application
The application should be running locally.
- **Frontend**: [http://localhost:5173](http://localhost:5173) (or the port shown in terminal)
- **Backend**: [http://localhost:3000](http://localhost:3000)

### 2. Student Flow
1.  Go to the **Home Page**.
2.  Click on a question (e.g., "C Pointer Basics").
3.  Read the code snippet, select an option, and click **Submit**.
4.  See the result and explanation.

### 3. Admin Flow
1.  Click the **Admin** link in the top navigation bar (or visit `/admin/concept`).
2.  Fill in the form:
    - **Title**: "Python List Slicing"
    - **Content**: "What is output?"
    - **Code**: `print([1, 2, 3][1:])`
    - **Options**: `[1]`, `[2, 3]`, `[1, 2]`, `Error`
    - **Answer**: Select option B (index 1).
3.  Click **Create Question**.
4.  Go back to Home to see your new question!

### 4. Coding Problem Flow
1.  Click **Coding Problems** in the nav bar (or visit `/problem`).
2.  Click on "Sum of Two Integers".
3.  You will see the Problem Description on the left and Code Editor on the right.
4.  Select **Python** (or C/C++).
5.  There is pre-filled sample code. Click **Run Code**.
6.  See the output in the bottom console (Real Docker Execution!).

### 5. Judge Integration Strategy
I have implemented a **Local Docker Runner** (`server/services/judgeService.js`).
- **Mechanism**: Creates a temporary Python file, mounts it to a `python:3.9-alpine` container, and isolates execution.
- **Security**: Uses `docker run --network none` to prevent external access and mounts only the specific temp directory.
- **Status**: Python verification passed. C/C++ support is planned for future updates.

### 6. Authentication Testing
1.  Click **Sign Up** in the top right.
2.  Create an account (e.g., `student@test.com`).
3.  You will be redirected to Login.
4.  Log in. You should see "Hi, student@test.com" in the header.
5.  Click **Logout** to verify session clearing.

### 7. Full Submission Flow (Judge V2)
1.  Log in as a student.
2.  Go to the "Sum of Two Integers" problem.
3.  Write a correct solution (Python: `print(sum(map(int, input().split())))`).
4.  Click **Submit Solution** (Green Button).
5.  Wait for the Judge. You should see `Verdict: Accepted` and `Case 1: AC`.
6.  This also saves your record to the database!

### 8. Analytics Dashboard
1.  Go to your **Profile** (Click "Hi, [Email]" in nav).
2.  You will see two new charts:
    - **Submission Status**: Distribution of AC/WA/TLE.
    - **Language Usage**: Which languages you use most.
3.  These charts update automatically as you solve more problems!

### 9. Mock Exam Mode
1.  Click **Start Mock Exam** in the nav bar.
2.  You will see a Timer (2:30:00) starting immediately.
3.  **Concept Section**: Answer the multiple-choice questions.
4.  **Implementation Section**: Open coding problems in new tabs to solve them.
5.  Click **Finish Exam**.
6.  View your **Score Report** with breakdown!

### 10. Community Discusison
1.  Open any Coding Problem.
2.  Switch the tab from **Description** to **Discussion** (above the problem title).
3.  Read comments from other students.
4.  Type a message and click **Post** to ask for help or share a tip.

### 11. AI Tutor (Gemini Integration)
1.  Open any Coding Problem.
2.  Click the **purple "💡 Ask AI" button** in the editor toolbar.
3.  Wait a few seconds for an intelligent hint based on your specific code!
4.  The AI will point out logic errors or suggest edge cases without spoiling the solution.

## 🏗️ Technical Status
- **Database**: PostgreSQL running in Docker (`apcs-db`, port 5433).
- **Backend**: Express server running on port 3000.
    - **Auth**: JWT + Bcrypt active.
    - **Exam**: Random paper generation logic.
    - **Community**: Comments API active.
    - **AI**: Gemini 1.5 Flash integration active.
- **Judge**: Local Docker integration (Python + C/C++).
- **Frontend**: Vue 3 + Tailwind CSS running on Vite dev server.

## ⏭️ Next Steps
- **Deploy**: Move to cloud (AWS/GCP) using Docker Compose.

## 6. Deployment Guide
The project is ready for production deployment using Docker Compose.

### Prerequisites
- Docker & Docker Compose installed.
- `GEMINI_API_KEY` set in your `.env` file.

### Running in Production
1.  **Stop Local Dev**: Ensure local ports 3000, 5433, and 8080 are free.
2.  **Build and Start**:
    ```bash
    docker-compose up --build -d
    ```
3.  **Access the App**:
    -   Frontend: `http://localhost:8080`
    -   Backend API: `http://localhost:3000`
    -   Database: Port 5433

### CI/CD
A GitHub Actions workflow is located at `.github/workflows/ci.yml`. It will automatically:
-   Install dependencies.
-   Build the Vue.js frontend.
-   Verify backend dependencies install correctly.
