# Product brief: Study OS foundation

## Status

This is a planning document only. No Study OS product has been implemented in this repository as of 2026-09-20.

## Product intent

Study OS is intended to be a personal learning operating system: a calm place to plan study, execute focused sessions, retain knowledge, and learn from progress. It should turn scattered study activity into a trustworthy feedback loop without pretending that inferred metrics are facts.

## Candidate capabilities

Subjects and courses, study sessions, a focused timer, notes, flashcards, spaced repetition, quizzes, progress views, weak-topic detection, goals, calendar planning, streaks, exam countdowns, PDF-assisted study, quiz generation, study-plan generation, and an optional tutor.

## MVP hypothesis

The first release should validate one loop: define a subject and goal, plan a session, complete and record it, review the resulting progress, and receive a small next action. Flashcards or AI features should enter only when the basic activity and knowledge model is trustworthy.

## Non-goals for foundation work

Do not implement UI, database schema, AI calls, PDF ingestion, authentication, calendar sync, or a second application shell during this foundation phase. Do not assume that the current Career Ops application or TouchDesigner project should be renamed or converted into Study OS.

## Product questions to resolve before implementation

- Is this a new app in this workspace or a separate repository?
- Is the primary user only the repository owner, or will accounts and sync matter?
- What counts as evidence of learning: time, recall, assessment, confidence, or a combination?
- Which single workflow is valuable enough for the MVP?
- Are AI and uploaded documents optional assistants or core dependencies?
