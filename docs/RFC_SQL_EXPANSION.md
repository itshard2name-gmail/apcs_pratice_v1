# RFC: SQL Problem Support Expansion Feasibility Study

> [!IMPORTANT]
> **Status**: Draft / Future Exploration
> **Purpose**: This document records a technical feasibility study for expanding the platform to support SQL-based coding problems (e.g., for recruitment exams).
> **Note**: This feature is **NOT** currently in the development roadmap. It is documented here for future reference only.

## 1. Executive Summary
The current APCS Practice Platform architecture is highly extensible and suitable for adding SQL problem support. The existing Judge System (based on Docker containers) and AI Generation pipelines can be adapted with minimal structural changes.

## 2. Technical Architecture

### 2.1 Judge System Adaptation
- **Current State**: Uses Docker containers for Python/GCC/Java execution.
- **Proposed Solution**: Use **SQLite** via a lightweight Runner Script (Python/Node).
- **Execution Flow**:
    1. **Init**: Create an in-memory or temporary SQLite database.
    2. **Setup**: Execute `init_sql` (provided by the problem) to create tables and insert seed data.
    3. **Execution**:
        - Run **Student Query**.
        - Run **Model Solution Query**.
    4. **Output**: Export both result sets to JSON format.
    5. **Verification**: Compare the JSON structure and content of the Student's output vs. the Model Solution's output.

### 2.2 Database Schema Extensions
- **New Table**: `questions_sql` (or extend `questions_implementation`)
- **Required Fields**:
    - `init_sql` (TEXT): SQL script for schema creation and data seeding.
    - `solution_sql` (TEXT): The standard answer query used to generate the expected output.
    - `target_output` (JSON/TEXT): Cached expected output (optional, strictly speaking we can generate it on the fly).

### 2.3 AI Generation Pipeline (Gemini API)
- **Feasibility**: High. LLMs excel at structured SQL tasks.
- **Workflow**:
    - **Prompt**: Request the AI to generate a JSON object containing:
        - `description`: Problem scenario.
        - `init_sql`: Setup script for the test case.
        - `solution_sql`: The correct query.
    - **Auto-Validation**: The backend should immediately test the generated `init_sql` and `solution_sql` in a sandbox to ensure validity/non-empty results before saving to the database.

## 3. Implementation Details (Concept)

### 3.1 Python Runner Script Concept
```python
import sqlite3, json

def solve():
    # 1. Setup DB
    con = sqlite3.connect(":memory:")
    cur = con.cursor()
    
    # 2. Run Init Script (from AI/DB)
    with open("init.sql") as f:
        cur.executescript(f.read())
        
    # 3. Run Student Query
    with open("student.sql") as f:
        student_res = cur.execute(f.read()).fetchall()
        
    # 4. Run Model Solution
    with open("solution.sql") as f:
        expected_res = cur.execute(f.read()).fetchall()
        
    # 5. Output Comparison Result
    print(json.dumps({
        "verdict": "Accepted" if normalize(student_res) == normalize(expected_res) else "Wrong Answer"
    }))
```

## 4. Conclusion
Integrating SQL problems is a low-risk, high-value expansion. It leverages the existing containerized judge infrastructure and the "generate-validation" pattern used for coding problems. No major architectural refactoring is required.
