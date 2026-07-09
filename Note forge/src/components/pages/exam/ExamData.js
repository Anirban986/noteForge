/**
 * examData.js
 *
 * Static exam data for the upload modal dropdowns.
 * Sourced directly from the official GATE 2026 CS syllabus (IIT Guwahati).
 *
 * Structure mirrors the Postgres schema:
 *   exam → subjects (with section labels) → chapters → topics
 *
 * When you're ready to fetch from DB, replace this file with:
 *   const res = await api.get("/api/exams/:examId/tree");
 *   return res.data.tree;
 *
 * The topic arrays are stored here for completeness but the upload
 * modal only needs exam → subject → chapter for its three dropdowns.
 */

export const EXAM_DATA = {

  // ── GATE CS 2026 ────────────────────────────────────────
  // Source: Official GATE 2026 syllabus, IIT Guwahati (CS)
  // Sections match the official section numbering.

  "GATE CS 2026": {
    label:       "GATE CS 2026",
    description: "Graduate Aptitude Test in Engineering — Computer Science and IT",
    totalMarks:  100,   // 65 questions: 1-mark + 2-mark sections + GA
    subjects: {

      // ── Section 1 ──────────────────────────────────────
      "Engineering Mathematics": {
        section: "Section 1",
        chapters: {

          "Discrete Mathematics": {
            topics: [
              "Propositional logic",
              "First order logic",
              "Sets", "Relations", "Functions",
              "Partial orders", "Lattices",
              "Monoids", "Groups",
              "Graph connectivity", "Graph matching", "Graph colouring",
              "Counting", "Recurrence relations", "Generating functions",
            ]
          },

          "Linear Algebra": {
            topics: [
              "Matrices", "Determinants",
              "System of linear equations",
              "Eigenvalues", "Eigenvectors",
              "LU decomposition",
            ]
          },

          "Calculus": {
            topics: [
              "Limits", "Continuity", "Differentiability",
              "Maxima and minima",
              "Mean value theorem",
              "Integration",
            ]
          },

          "Probability and Statistics": {
            topics: [
              "Random variables",
              "Uniform distribution", "Normal distribution",
              "Exponential distribution",
              "Poisson distribution",
              "Binomial distribution",
              "Mean", "Median", "Mode", "Standard deviation",
              "Conditional probability",
              "Bayes theorem",
            ]
          },
        }
      },

      // ── Section 2 ──────────────────────────────────────
      "Digital Logic": {
        section: "Section 2",
        chapters: {

          "Boolean Algebra": {
            topics: [
              "Boolean algebra",
              "Minimization",
              "Karnaugh maps",
            ]
          },

          "Combinational Circuits": {
            topics: [
              "Combinational circuits",
              "Multiplexers", "Decoders", "Adders",
            ]
          },

          "Sequential Circuits": {
            topics: [
              "Sequential circuits",
              "Flip-flops", "Counters", "Registers",
              "Finite state machines",
            ]
          },

          "Number Systems": {
            topics: [
              "Number representations",
              "Fixed point arithmetic",
              "Floating point arithmetic",
              "Computer arithmetic",
              "2s complement",
            ]
          },
        }
      },

      // ── Section 3 ──────────────────────────────────────
      "Computer Organization and Architecture": {
        section: "Section 3",
        chapters: {

          "Instruction Set Architecture": {
            topics: [
              "Machine instructions",
              "Addressing modes",
              "ALU", "Data-path", "Control unit",
            ]
          },

          "Pipelining": {
            topics: [
              "Instruction pipelining",
              "Pipeline hazards",
              "Data hazards", "Control hazards", "Structural hazards",
              "Throughput", "Speedup",
            ]
          },

          "Memory Hierarchy": {
            topics: [
              "Cache memory", "Cache mapping", "Cache replacement",
              "Main memory", "Secondary storage",
              "Memory organisation",
            ]
          },

          "I/O Systems": {
            topics: [
              "I/O interface",
              "Interrupt driven I/O",
              "DMA", "DMA controller", "Bus transfer",
            ]
          },
        }
      },

      // ── Section 4 ──────────────────────────────────────
      "Programming and Data Structures": {
        section: "Section 4",
        chapters: {

          "C Programming": {
            topics: [
              "Programming in C",
              "Pointers", "Recursion",
              "Functions", "Type checking",
              "Memory management",
            ]
          },

          "Arrays and Linked Lists": {
            topics: [
              "Arrays", "Linked lists",
              "Stacks", "Queues",
            ]
          },

          "Trees": {
            topics: [
              "Trees", "Binary trees",
              "Binary search trees",
              "Binary heaps",
              "Tree traversals",
              "AVL trees", "B trees",
            ]
          },

          "Graphs": {
            topics: [
              "Graph representation",
              "Graph traversal",
              "BFS", "DFS",
            ]
          },
        }
      },

      // ── Section 5 ──────────────────────────────────────
      "Algorithms": {
        section: "Section 5",
        chapters: {

          "Sorting and Searching": {
            topics: [
              "Searching", "Sorting", "Hashing",
              "Linear search", "Binary search",
              "Bubble sort", "Merge sort", "Quick sort",
              "Heap sort", "Insertion sort",
            ]
          },

          "Complexity Analysis": {
            topics: [
              "Asymptotic notation",
              "Worst case complexity", "Space complexity",
              "Time complexity",
              "Big-O", "Big-Omega", "Big-Theta",
            ]
          },

          "Algorithm Design Techniques": {
            topics: [
              "Greedy algorithms",
              "Dynamic programming",
              "Divide and conquer",
              "Recurrence solving",
            ]
          },

          "Graph Algorithms": {
            topics: [
              "Graph traversals", "BFS", "DFS",
              "Minimum spanning trees",
              "Kruskal", "Prim",
              "Shortest paths",
              "Dijkstra", "Bellman-Ford", "Floyd-Warshall",
              "Topological sort",
            ]
          },
        }
      },

      // ── Section 6 ──────────────────────────────────────
      "Theory of Computation": {
        section: "Section 6",
        chapters: {

          "Regular Languages": {
            topics: [
              "Regular expressions",
              "Finite automata", "DFA", "NFA",
              "Pumping lemma for regular languages",
              "Regular grammar",
            ]
          },

          "Context-Free Languages": {
            topics: [
              "Context-free grammars",
              "Push-down automata",
              "Pumping lemma for CFLs",
              "CFL properties",
              "Ambiguous grammars",
            ]
          },

          "Decidability": {
            topics: [
              "Turing machines",
              "Undecidability",
              "Halting problem",
              "Reducibility",
              "Recursive languages",
              "Recursively enumerable languages",
            ]
          },
        }
      },

      // ── Section 7 ──────────────────────────────────────
      "Compiler Design": {
        section: "Section 7",
        chapters: {

          "Lexical Analysis and Parsing": {
            topics: [
              "Lexical analysis",
              "Parsing",
              "LL parsing", "LR parsing", "LALR parsing",
              "Syntax-directed translation",
            ]
          },

          "Code Generation and Optimisation": {
            topics: [
              "Runtime environments",
              "Intermediate code generation",
              "Local optimisation",
              "Data flow analysis",
              "Constant propagation",
              "Liveness analysis",
              "Common subexpression elimination",
              "Static single assignment",
            ]
          },
        }
      },

      // ── Section 8 ──────────────────────────────────────
      "Operating System": {
        section: "Section 8",
        chapters: {

          "Process Management": {
            topics: [
              "System calls",
              "Processes", "Threads",
              "Inter-process communication",
              "Concurrency", "Synchronisation",
              "Mutual exclusion", "Semaphores",
            ]
          },

          "Deadlock": {
            topics: [
              "Deadlock",
              "Deadlock prevention",
              "Deadlock avoidance",
              "Deadlock detection",
              "Banker's algorithm",
            ]
          },

          "CPU and I/O Scheduling": {
            topics: [
              "CPU scheduling",
              "FCFS", "SJF", "SRTF",
              "Round robin", "Priority scheduling",
              "I/O scheduling",
              "Disk scheduling", "SSTF", "SCAN", "C-LOOK",
            ]
          },

          "Memory Management": {
            topics: [
              "Memory management",
              "Virtual memory",
              "Paging", "Segmentation",
              "Page tables", "TLB",
              "Page replacement",
              "LRU", "FIFO", "Optimal",
              "Thrashing",
            ]
          },

          "File Systems": {
            topics: [
              "File systems",
              "File organisation",
              "Directory structure",
              "Disk allocation",
            ]
          },
        }
      },

      // ── Section 9 ──────────────────────────────────────
      "Databases": {
        section: "Section 9",
        chapters: {

          "Entity-Relationship Model": {
            topics: [
              "ER model", "Entities", "Relationships",
              "ER diagram", "Weak entities",
            ]
          },

          "Relational Model": {
            topics: [
              "Relational model",
              "Relational algebra",
              "Tuple calculus", "SQL",
              "Integrity constraints",
              "Keys", "Superkeys", "Candidate keys",
            ]
          },

          "Normalisation": {
            topics: [
              "Normal forms",
              "1NF", "2NF", "3NF", "BCNF",
              "Functional dependencies",
              "Decomposition", "Lossless join",
            ]
          },

          "Indexing": {
            topics: [
              "File organisation",
              "Indexing",
              "B trees", "B+ trees",
              "Hash indexing",
            ]
          },

          "Transactions": {
            topics: [
              "Transactions",
              "ACID properties",
              "Concurrency control",
              "2PL", "Serializability",
              "Deadlock in databases",
            ]
          },
        }
      },

      // ── Section 10 ─────────────────────────────────────
      "Computer Networks": {
        section: "Section 10",
        chapters: {

          "Network Models and Switching": {
            topics: [
              "OSI model", "TCP/IP stack", "Layering",
              "Packet switching",
              "Circuit switching",
              "Virtual circuit switching",
            ]
          },

          "Data Link Layer": {
            topics: [
              "Framing", "Error detection", "CRC",
              "Medium access control",
              "Ethernet", "Ethernet bridging", "CSMA/CD",
              "Stop-and-Wait ARQ",
              "Go-Back-N", "Selective repeat",
            ]
          },

          "Network Layer": {
            topics: [
              "Routing protocols",
              "Shortest path routing",
              "Flooding",
              "Distance vector routing",
              "Link state routing",
              "IP fragmentation",
              "IP addressing", "IPv4", "CIDR",
              "ARP", "DHCP", "ICMP", "NAT",
            ]
          },

          "Transport Layer": {
            topics: [
              "Flow control",
              "Congestion control",
              "UDP", "TCP", "Sockets",
              "Sliding window",
              "Token bucket",
            ]
          },

          "Application Layer": {
            topics: [
              "DNS", "SMTP", "HTTP", "FTP", "Email",
              "Stateful protocols",
              "Stateless protocols",
            ]
          },

          "Network Security": {
            topics: [
              "Digital signatures",
              "Public key cryptography",
              "Message digest",
              "Authentication",
            ]
          },
        }
      },
    }
  },
};

// ─────────────────────────────────────────────────────────
//  Helper: get all exam names for the exam dropdown
// ─────────────────────────────────────────────────────────

export function getExamNames() {
  return Object.keys(EXAM_DATA);
}

// ─────────────────────────────────────────────────────────
//  Helper: get subjects for a given exam
// ─────────────────────────────────────────────────────────

export function getSubjects(examName) {
  return Object.keys(EXAM_DATA[examName]?.subjects || {});
}

// ─────────────────────────────────────────────────────────
//  Helper: get chapters for a given exam + subject
// ─────────────────────────────────────────────────────────

export function getChapters(examName, subjectName) {
  return Object.keys(
    EXAM_DATA[examName]?.subjects?.[subjectName]?.chapters || {}
  );
}

// ─────────────────────────────────────────────────────────
//  Helper: get topics for a given exam + subject + chapter
//  Used by the exam-mode note generation to enrich the prompt
// ─────────────────────────────────────────────────────────

export function getTopics(examName, subjectName, chapterName) {
  return (
    EXAM_DATA[examName]?.subjects?.[subjectName]?.chapters?.[chapterName]
      ?.topics || []
  );
}

// ─────────────────────────────────────────────────────────
//  Helper: get section label for a subject
// ─────────────────────────────────────────────────────────

export function getSectionLabel(examName, subjectName) {
  return EXAM_DATA[examName]?.subjects?.[subjectName]?.section || null;
}