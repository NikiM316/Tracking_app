Study plan 

Week 1 — AI-Assisted Development & Context Engineering
Focus: Shift from using AI as a basic autocomplete tool to orchestrating AI agents, managing multi-file context, and enforcing architectural standards.
* Primary Resources:
    * Official Cursor Documentation & Tutorials (cursor.com/learn) (docs.cursor.com and [cursor.com/learn](https://cursor.com/learn)) — Master codebase indexing, @ symbol context referencing, Composer, and Plan mode.
    * Anthropic Interactive Prompt Engineering Tutorial (GitHub repo: anthropics/prompt-eng-interactive-tutorial) — Learn XML tagging, structured prompting, and zero-shot/few-shot system prompts.
* Secondary Resources:
    * DeepLearning.AI: Prompt Engineering for Developers (Short course by Andrew Ng & Isa Fulford).
* The Build Target:
    * Create a production-grade .cursorrules file for your Next.js/Supabase stack.
    * Prompt Claude to generate a complete Product Requirements Document (PRD) for a small practice application, then use Cursor Plan Mode to scaffold the full project in under 48 hours.

Week 2 — JavaScript / TypeScript + React & Next.js Fundamentals
Focus: Understand the execution environment. Learn enough core principles so you can read, debug, and refactor AI-generated code rather than blindly accepting hallucinations.
* Primary Resources:
    * JavaScript.info (The Modern JavaScript Tutorial) — Focus on Part 1: Promises, async/await, Event Loop, Array methods (map, filter, reduce), and Closures.
    * React.dev (Official Interactive Docs) — Read the "Describing the UI" and "Managing State" chapters. Master state, props, component lifecycles, and useEffect vs server rendering.
    * Next.js Learn (nextjs.org/learn) — Learn App Router mechanics: Server Components vs Client Components ("use client"), Server Actions, and dynamic routing.
* Secondary Resource:
    * Total TypeScript (Matt Pocock / totaltypescript.com) — Focus on Beginner TypeScript essentials: interfaces, types, generics, and typing API responses.
* The Build Target:
    * Refactor your Week 1 application to use strict TypeScript types, Next.js App Router conventions, and cleanly separated Server vs Client components.

Week 3 — Data Structures & Algorithms
Focus: Build intuition for computational complexity and operational costs. Understand why an algorithm scales or fails without spending all day grinding LeetCode.
* Primary Resources:
    * NeetCode.io (Roadmap: Core Concepts) — Watch visual explanations for Arrays/Hashing, Two Pointers, Stacks, Queues, Binary Search, Linked Lists, Trees, and Graphs.
    * Big-O Cheat Sheet (bigocheatsheet.com) — Memorize time and space complexities (O(1), O(logn), O(n), O(nlogn), O(n2)).
* Secondary Resource:
    * VisuAlgo.net — Interactive visualizer for data structures and sorting/searching algorithms.
* The Build Target:
    * Identify two places in your code (e.g., list filtering, search, or state lookups) and refactor from nested iterations (O(n2)) to Hash Map lookups (O(1)) or binary search patterns (O(logn)).

Week 4 — SQL & Database Engineering
Focus: Design resilient relational database schemas, write optimized SQL queries, and configure bulletproof security policies.
* Primary Resources:
    * PostgreSQL Tutorial (postgresqltutorial.com) — Focus on: Tables, Foreign Keys, Normalization (1NF to 3NF), INNER/LEFT JOINs, Indexes (B-Tree), Transactions (ACID), and Aggregations (GROUP BY).
    * Supabase Documentation (Database & Auth Guides) — Study Row Level Security (RLS) policies, database triggers, and PostgreSQL functions.
* Secondary Resource:
    * SQLBolt (sqlbolt.com) — 2-hour interactive in-browser SQL practice.
* The Build Target:
    * Design and deploy a normalized PostgreSQL schema in Supabase for your practice project. Write custom RLS policies ensuring users can only read/write their own records.

Week 5 — HTTP, APIs & Backend Security
Focus: Build secure, reliable communication layers between your frontend, backend, and external third-party services.
* Primary Resources:
    * MDN Web Docs: HTTP & Fetch API — HTTP Methods (GET, POST, PUT, DELETE, PATCH), Status Codes (200, 201, 400, 401, 403, 404, 500), Headers, and CORS.
    * Postman Academy / RESTful API Guide — Best practices for REST endpoint design, error payload formatting, and rate limiting.
    * Auth Guides (Supabase Auth / JWT.io) — Understand how JWT tokens work, cookie-based session management, and server-side authorization checks.
* Secondary Resource:
    * OWASP Top 10 API Security Risks — High-level scan of common vulnerabilities (injection, broken object level authorization).
* The Build Target:
    * Build and secure API endpoints / Next.js Server Actions connecting your frontend directly to your Supabase database with structured error handling and auth guards.

Week 6 — System Design & Startup Validation
Focus: Synthesize engineering scalability with market-driven business execution.
* Primary Resources:
    * The System Design Primer ([github.com/donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer)) — Study Horizontal vs. Vertical Scaling, Caching (Redis), Load Balancing, and Asynchronous Processing/Queues.
    * ByteByteGo (Alex Xu on YouTube) — High-level visual architectures of scalable web apps.
    * Y Combinator Startup School (startupschool.org) — Modules: "How to Evaluate Startup Ideas" and "How to Talk to Users."
    * The Mom Test by Rob Fitzpatrick (Book/Audiobook) — How to discover actual customer pain points without asking leading questions.
* The Final Capstone Project:
    * Pick 1 concrete startup problem and produce an end-to-end launch blueprint:Validated Problem⟶Customer ICP⟶MVP Scope⟶System Architecture⟶Database Schema⟶API Blueprint

Project to build
The B2B Multi-Tenant Feedback & Roadmap Portal

The 6-Week Execution Breakdown
Week 1: AI Workflows & Context
* Theory Target: Master Cursor codebase indexing, Composer/Plan Mode, and structured PRD generation with Claude.
* Weekly Build:
    * Prompt Claude to draft a detailed Product Requirements Document (PRD) defining three roles: Owner, Member, and End-User (Voter).
    * Scaffold a clean Next.js App Router repository with Tailwind CSS and your custom .cursorrules file.
    * Use Cursor Plan Mode to generate the basic wireframe layout (Admin Dashboard + Public Board view).
Week 2: Next.js & TypeScript Fundamentals
* Theory Target: App Router layout patterns, Server vs. Client Components, TypeScript interfaces, and optimistic UI.
* Weekly Build:
    * Build dynamic workspace routing: app/[workspaceSlug]/board/page.tsx (Public Server Component) and app/[workspaceSlug]/admin/page.tsx (Protected Dashboard).
    * Build an interactive upvote button with optimistic UI state—the vote count increments instantly on the screen before any network request completes.
    * Write strict TypeScript interfaces for Workspace, FeaturePost, Tag, and User.
Week 3: Data Structures & Algorithms
* Theory Target: Hash Maps (O(1) lookups), Big-O complexity, and Prefix Trees (Trie) / Fuzzy Search logic.
* Weekly Build:
    * Duplicate Detection (Algorithm): Write an in-memory search function in TypeScript. When an end-user starts typing a new feature request title, the algorithm scans existing posts using prefix matching/tokenization to display: "Are you asking for one of these existing features?" to prevent duplicate submissions.
    * Triage Priority Queue: Implement a sorting algorithm on the admin board that ranks backlog items by a composite score formula:Priority Score=Effort ScoreUpvotes×Impact Rating 
Week 4: PostgreSQL & Supabase Database Engineering
* Theory Target: Relational schema design, foreign key constraints, indexing, and Row Level Security (RLS).
* Weekly Build:
    * Create normalized tables in Supabase: workspaces, memberships, posts, votes, categories.
    * Create a unique composite constraint on votes(post_id, user_id) to prevent a user from voting multiple times on the same item.
    * Write RLS Policies:
        * Public: Anyone can SELECT posts where workspace.is_public = true.
        * Admin: Only users with a valid membership record matching workspace_id and role = 'owner' can DELETE or update post statuses (e.g., changing from "In Review" → "Shipped").
Week 5: HTTP, APIs & Security
* Theory Target: RESTful endpoints, Next.js Server Actions, authentication tokens (JWT/Cookies), and rate-limiting.
* Weekly Build:
    * Replace mock data with Next.js Server Actions connecting directly to your Supabase instance.
    * Secure the submission actions against spam by implementing a lightweight IP-based rate limiter.
    * Build a public REST API route (/api/v1/[workspaceSlug]/posts) that accepts an API key so an external website could programmatically submit feedback.
Week 6: System Design & Startup Validation
* Theory Target: Caching layers (Edge / Redis / Next.js ISR), system scalability, and customer feedback loops.
* Weekly Build:
    * Configure Incremental Static Regeneration (ISR) or Edge Caching on the public roadmap so high viral traffic does not exhaust database connections.
    * Deploy the project on Vercel.
    * Share the live link with other developers/founders to collect their feedback and test real-world usability.

