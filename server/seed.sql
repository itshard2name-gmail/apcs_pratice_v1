-- 1. Create Admin User (Password: admin123)
INSERT INTO users (email, password_hash, role)
VALUES ('admin@example.com', '$2b$10$RsG3iETam/Rux3D2H.hmV.givPphpsTzf0U7F.lsUPEkbC0IcWv9O', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Create Sample Concept Question
INSERT INTO questions_concept (title, content, code_snippet, options, answer_index, explanation)
VALUES (
    'Pointer Basics',
    'What is the output of the following C++ code?',
    E'int a = 10;\nint *p = &a;\n*p = 20;\ncout << a;',
    '["10", "20", "Address of a", "Compilation Error"]',
    1,
    'The pointer p stores the address of a. Dereferencing p (*p) accesses the value of a. Changing *p changes a.'
);

-- 3. Create Sample Implementation Problem
WITH new_question AS (
    INSERT INTO questions_implementation (title, description, time_limit, memory_limit)
    VALUES (
        'Sum of Two Numbers',
        E'# Sum of Two Numbers\n\nGiven two integers A and B, output their sum.\n\n## Input\nTwo integers A and B separated by a space.\n\n## Output\nA single integer representing A + B.',
        1000,
        256
    )
    RETURNING id
)
INSERT INTO implementation_test_cases (question_id, input_data, output_data, is_sample)
SELECT id, '1 2', '3', true FROM new_question
UNION ALL
SELECT id, '10 20', '30', false FROM new_question
UNION ALL
SELECT id, '-5 5', '0', false FROM new_question;
