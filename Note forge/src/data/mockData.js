export const EXAMS = [
  "GATE Computer Science",
  "UPSC Civil Services",
  "CAT MBA",
  "JEE Advanced",
];

export const MISSING_TOPICS = {
  high:   ["Graph Theory – Max Flow Algorithms", "OS – Deadlock Avoidance (Banker's)", "DBMS – Normalization 4NF/5NF", "CN – TCP Congestion Control"],
  medium: ["Compiler Design – Code Optimization", "TOC – Context-Free Grammars", "Math – Linear Programming"],
  low:    ["Software Engg – Testing Methodologies", "DS – Splay Trees", "COA – Pipelining Hazards"],
};

export const NOTES_DATA = [
  {
    id: 1, subject: "Data Structures", chapter: "Trees & Graphs", topic: "Trees & Graphs",
    icon: "📘", iconBg: "#eef2ff", accentColor: "#3b5bdb",
    tags: ["AVL Trees", "BFS", "DFS", "Dijkstra"],
    addedTs: Date.now() - 2 * 3600000, dateLabel: "2h ago", pages: 18,
    content: {
      summary: "Trees are hierarchical data structures. Graphs generalize trees to allow cycles. Key algorithms include BFS, DFS, Dijkstra and Bellman-Ford.",
      keyPoints: [
        "AVL Tree maintains |height(L) - height(R)| ≤ 1 at every node",
        "BFS uses Queue; explores level by level — O(V+E)",
        "DFS uses Stack/Recursion; explores depth first — O(V+E)",
        "Dijkstra works only on non-negative weights — O((V+E) log V)",
        "Bellman-Ford handles negative weights — O(VE)",
      ],
      formulas: [
        "Height of AVL: h ≤ 1.44 log₂(n+2)",
        "Min nodes in AVL of height h: N(h) = N(h-1) + N(h-2) + 1",
        "Dijkstra relaxation: d[v] = min(d[v], d[u] + w(u,v))",
      ],
      subtopics: ["Binary Trees", "BST Operations", "AVL Rotations", "Heap", "BFS", "DFS", "Dijkstra", "Bellman-Ford"],
    },
    detailedExpansions: [
      "In an AVL tree rotations (LL, RR, LR, RL) are performed to restore balance. Balance factor must stay within {-1, 0, +1}.",
      "BFS uses a FIFO queue. Ideal for shortest path in unweighted graphs. Space complexity O(V).",
      "DFS explores as deep as possible before backtracking. Used in topological sort and SCC detection.",
      "Dijkstra uses a min-heap. Greedily selects vertex with smallest tentative distance. Fails with negative edges.",
      "Bellman-Ford relaxes all edges V-1 times. Detects negative cycles on the Vth pass.",
    ],
  },
  {
    id: 2, subject: "Data Structures", chapter: "Sorting Algorithms", topic: "Sorting & Searching",
    icon: "📊", iconBg: "#eef2ff", accentColor: "#3b5bdb",
    tags: ["Merge Sort", "Quick Sort", "Heap Sort", "Complexity"],
    addedTs: Date.now() - 86400000, dateLabel: "1 day ago", pages: 12,
    content: {
      summary: "Comparison-based sorts have a lower bound of O(n log n). Non-comparison sorts like Counting Sort achieve O(n) in specific conditions.",
      keyPoints: [
        "Merge Sort: Stable, O(n log n) always, O(n) space — divide & conquer",
        "Quick Sort: Avg O(n log n), worst O(n²), in-place, unstable",
        "Heap Sort: O(n log n) always, in-place, unstable — uses max-heap",
        "Counting Sort: O(n+k) for integers in [0,k] — not comparison-based",
        "Binary Search: O(log n) — requires sorted input",
      ],
      formulas: [
        "Merge Sort: T(n) = 2T(n/2) + O(n) → O(n log n)",
        "Quick Sort best/avg: T(n) = 2T(n/2) + O(n) → O(n log n)",
        "Binary Search mid: mid = low + (high - low) / 2",
      ],
      subtopics: ["Bubble Sort", "Selection Sort", "Insertion Sort", "Merge Sort", "Quick Sort", "Heap Sort", "Counting Sort", "Binary Search"],
    },
    detailedExpansions: [
      "Merge Sort splits, recursively sorts, and merges. Stable — equal elements maintain order.",
      "Quick Sort picks a pivot and partitions. Randomized pivot avoids worst case.",
      "Heap Sort builds a max-heap in O(n), then extracts max O(log n) repeatedly.",
      "Counting Sort counts occurrences. Works only for non-negative integers with known range.",
      "Binary Search halves search space each step.",
    ],
  },
  {
    id: 3, subject: "Operating Systems", chapter: "Process Scheduling", topic: "CPU Scheduling",
    icon: "⚙️", iconBg: "#ebfbee", accentColor: "#2f9e44",
    tags: ["FCFS", "SJF", "Round Robin", "Priority"],
    addedTs: Date.now() - 2 * 86400000, dateLabel: "2 days ago", pages: 14,
    content: {
      summary: "CPU scheduling determines which process runs. Preemptive vs non-preemptive algorithms differ in whether a running process can be interrupted.",
      keyPoints: [
        "FCFS: Non-preemptive; convoy effect causes high waiting time",
        "SJF: Optimal average waiting time; starvation risk",
        "Round Robin: Preemptive; good response time; quantum-dependent",
        "Priority Scheduling: Preemptive or not; aging prevents starvation",
      ],
      formulas: [
        "Turnaround Time = Completion - Arrival",
        "Waiting Time = Turnaround - Burst",
        "Response Time = First Run - Arrival",
        "CPU Utilization = (Total Burst / Total Time) × 100%",
      ],
      subtopics: ["CPU Scheduling", "FCFS", "SJF / SRTF", "Round Robin", "Priority", "Multilevel Queue"],
    },
    detailedExpansions: [
      "FCFS serves processes in arrival order. Convoy effect: short processes wait behind long ones.",
      "SJF selects smallest burst time. SRTF is the preemptive variant.",
      "Round Robin gives fixed quantum to each process in a cycle.",
      "Priority scheduling runs highest-priority process. Aging prevents indefinite starvation.",
    ],
  },
  {
    id: 4, subject: "Operating Systems", chapter: "Memory Management", topic: "Memory Management",
    icon: "🧠", iconBg: "#ebfbee", accentColor: "#2f9e44",
    tags: ["Paging", "Segmentation", "Virtual Memory", "TLB"],
    addedTs: Date.now() - 4 * 86400000, dateLabel: "4 days ago", pages: 16,
    content: {
      summary: "Paging eliminates external fragmentation. Virtual memory allows processes to use more memory than physically available via demand paging.",
      keyPoints: [
        "Paging: Fixed-size pages → frames; eliminates external fragmentation",
        "Segmentation: Variable-size segments; eliminates internal fragmentation",
        "TLB: Cache for page table entries; reduces memory access time",
        "Page Replacement: FIFO, LRU, Optimal — LRU closest to optimal",
        "Thrashing: Excessive paging when working set > available frames",
      ],
      formulas: [
        "EAT = hit_rate × TLB_time + (1-hit_rate) × (TLB_time + mem_time)",
        "Page fault: EAT = (1-p)×mem_access + p×fault_time",
        "Avg internal fragmentation: frame_size / 2 per process",
      ],
      subtopics: ["Paging", "Page Tables", "TLB", "Segmentation", "Virtual Memory", "Page Replacement", "Thrashing", "Working Set"],
    },
    detailedExpansions: [
      "Paging: page table maps logical pages to physical frames.",
      "TLB avoids page table lookup on a hit. Greatly reduces effective access time.",
      "Segmentation uses base + limit registers for each logical unit.",
      "LRU evicts least recently used page. Approximated with reference bits.",
    ],
  },
  {
    id: 5, subject: "DBMS", chapter: "Relational Algebra & SQL", topic: "Relational Algebra",
    icon: "🗄️", iconBg: "#fff9db", accentColor: "#f59f00",
    tags: ["SQL", "Joins", "Normalization", "Indexing"],
    addedTs: Date.now() - 5 * 86400000, dateLabel: "5 days ago", pages: 20,
    content: {
      summary: "Relational algebra provides the formal foundation for SQL. Normalization removes data redundancy through a series of normal forms.",
      keyPoints: [
        "Selection (σ): filters rows — SQL WHERE",
        "Projection (π): selects columns — SQL SELECT",
        "Joins: Inner, Left/Right Outer, Full, Natural, Cross",
        "Normalization: 1NF → 2NF → 3NF → BCNF",
        "Indexes: B+ tree (range), Hash (equality)",
      ],
      formulas: [
        "1NF: No repeating groups; atomic attributes",
        "2NF: 1NF + no partial dependency",
        "3NF: 2NF + no transitive dependency",
        "BCNF: Every FD X→Y, X is a super key",
      ],
      subtopics: ["RA Operators", "SQL SELECT", "Joins", "Aggregation", "1NF", "2NF", "3NF", "BCNF", "B+ Tree", "Hash Index"],
    },
    detailedExpansions: [
      "Relational algebra uses set-theoretic and relational operators.",
      "INNER JOIN returns matching rows. LEFT JOIN returns all left rows plus matches.",
      "2NF: remove partial dependencies from composite keys.",
      "BCNF: stricter than 3NF — every determinant must be a superkey.",
    ],
  },
  {
    id: 6, subject: "Computer Networks", chapter: "TCP/IP & Transport Layer", topic: "Transport Layer",
    icon: "🌐", iconBg: "#f3f0ff", accentColor: "#7048e8",
    tags: ["TCP", "UDP", "Congestion Control", "3-Way Handshake"],
    addedTs: Date.now() - 7 * 86400000, dateLabel: "1 week ago", pages: 15,
    content: {
      summary: "TCP is reliable, connection-oriented with flow and congestion control. UDP is connectionless, faster, with no delivery guarantees.",
      keyPoints: [
        "TCP 3-way handshake: SYN → SYN-ACK → ACK",
        "TCP 4-way termination: FIN → ACK → FIN → ACK",
        "Flow Control: Sliding window prevents buffer overflow",
        "Congestion Control: Slow Start → Congestion Avoidance → Fast Recovery",
        "UDP: No connection, no ordering — low overhead (DNS, streaming)",
      ],
      formulas: [
        "TCP Throughput ≈ MSS / (RTT × √loss_rate)",
        "Window Size = min(rwnd, cwnd)",
        "Slow Start: ssthresh = cwnd/2 on congestion",
      ],
      subtopics: ["TCP vs UDP", "3-Way Handshake", "Sliding Window", "Slow Start", "AIMD", "UDP Applications", "Port Numbers"],
    },
    detailedExpansions: [
      "3-way handshake: Client SYN → Server SYN-ACK → Client ACK. ISN exchanged.",
      "Sliding window: multiple unacknowledged segments in flight. Size = min(rwnd, cwnd).",
      "Slow Start: cwnd doubles each RTT until ssthresh, then linear increase.",
      "UDP is stateless. Best for DNS, DHCP, video/audio streaming.",
    ],
  },
  {
    id: 7, subject: "Computer Networks", chapter: "Network Layer & Routing", topic: "Routing Protocols",
    icon: "🔀", iconBg: "#f3f0ff", accentColor: "#7048e8",
    tags: ["IP Addressing", "OSPF", "BGP", "Subnetting"],
    addedTs: Date.now() - 10 * 86400000, dateLabel: "10 days ago", pages: 13,
    content: {
      summary: "IP provides best-effort delivery. Routing protocols determine optimal paths. Subnetting divides networks into smaller segments.",
      keyPoints: [
        "IPv4: 32-bit, dotted decimal; CIDR notation",
        "Subnetting: Borrow host bits to create subnets",
        "OSPF: Link-state; Dijkstra; hierarchical with areas",
        "BGP: Path vector; inter-AS routing; internet backbone",
        "NAT: Maps private IPs to public IPs",
      ],
      formulas: [
        "Subnets = 2^n (n = borrowed bits)",
        "Hosts/subnet = 2^h - 2 (h = remaining host bits)",
        "CIDR: IP/prefix e.g. 192.168.1.0/24",
      ],
      subtopics: ["IPv4 Addressing", "Subnetting", "CIDR", "OSPF", "RIP", "BGP", "NAT", "ARP", "ICMP"],
    },
    detailedExpansions: [
      "IPv4 uses 32-bit addresses. CIDR replaced classful addressing.",
      "OSPF: each router runs Dijkstra on full topology. Area 0 is backbone.",
      "BGP: exchanges routing info between Autonomous Systems using path vectors.",
      "NAT: multiple private devices share one public IP via port mapping.",
    ],
  },
  {
    id: 8, subject: "Algorithms", chapter: "Dynamic Programming", topic: "Dynamic Programming",
    icon: "⚡", iconBg: "#fff5f5", accentColor: "#e03131",
    tags: ["Memoization", "Tabulation", "LCS", "Knapsack"],
    addedTs: Date.now() - 12 * 86400000, dateLabel: "12 days ago", pages: 22,
    content: {
      summary: "DP solves problems by breaking them into overlapping subproblems and storing results. Requires optimal substructure + overlapping subproblems.",
      keyPoints: [
        "DP requires: Optimal Substructure + Overlapping Subproblems",
        "Memoization: Recursive + cache (top-down)",
        "Tabulation: Iterative + table (bottom-up); better cache performance",
        "LCS: O(mn) time and space",
        "0/1 Knapsack: O(nW) pseudo-polynomial",
      ],
      formulas: [
        "LCS: dp[i][j] = dp[i-1][j-1]+1 if match, else max(dp[i-1][j], dp[i][j-1])",
        "Knapsack: dp[i][w] = max(dp[i-1][w], val[i]+dp[i-1][w-wt[i]])",
        "Fibonacci: F(n) = F(n-1) + F(n-2); O(n) time O(1) space",
      ],
      subtopics: ["Optimal Substructure", "Memoization", "Tabulation", "LCS", "Edit Distance", "Matrix Chain", "0/1 Knapsack", "Coin Change", "LIS"],
    },
    detailedExpansions: [
      "Optimal substructure: optimal solution contains optimal sub-solutions.",
      "Memoization caches recursive calls. First call computes, subsequent calls return cache.",
      "Tabulation fills bottom-up. Better cache locality; no recursion overhead.",
      "LCS table: dp[i][j] = dp[i-1][j-1]+1 on match, else max of neighbours.",
    ],
  },
];

export const ALL_SUBJECTS = ["All Subjects", ...Array.from(new Set(NOTES_DATA.map(n => n.subject)))];

export const getTopicsForSubject = (subject) => {
  const filtered = subject === "All Subjects" ? NOTES_DATA : NOTES_DATA.filter(n => n.subject === subject);
  return ["All Topics", ...Array.from(new Set(filtered.map(n => n.topic)))];
};

export const SUBJECT_COLORS = {
  "Data Structures":   { color: "#3b5bdb", bg: "#eef2ff" },
  "Operating Systems": { color: "#2f9e44", bg: "#ebfbee" },
  "DBMS":              { color: "#f59f00", bg: "#fff9db" },
  "Computer Networks": { color: "#7048e8", bg: "#f3f0ff" },
  "Algorithms":        { color: "#e03131", bg: "#fff5f5" },
};

export const ANALYTICS_DATA = {
  weightage: [
    { topic: "Data Structures", weight: 15 },
    { topic: "Algorithms", weight: 13 },
    { topic: "Operating Systems", weight: 12 },
    { topic: "DBMS", weight: 11 },
    { topic: "Computer Networks", weight: 10 },
    { topic: "Theory of Computation", weight: 9 },
    { topic: "Compiler Design", weight: 8 },
    { topic: "Digital Logic", weight: 7 },
    { topic: "COA", weight: 8 },
    { topic: "Mathematics", weight: 7 },
  ],
  weakAreas: [
    { topic: "Compiler Design",       score: 38, target: 80 },
    { topic: "Theory of Computation", score: 45, target: 80 },
    { topic: "DBMS – Transactions",   score: 52, target: 80 },
    { topic: "Graph Algorithms",      score: 58, target: 80 },
    { topic: "OS – Memory Mgmt",      score: 61, target: 80 },
  ],
  heatmap: [
    [3,2,4,1,3,2,3,2,4,3,2,1],
    [4,3,3,2,4,3,2,3,3,4,3,2],
    [2,4,2,3,2,4,3,4,2,3,4,3],
    [3,3,4,2,3,3,4,2,3,2,3,4],
    [1,2,3,4,1,2,4,3,2,3,2,1],
  ],
};

export const MOCK_QUESTIONS = [
  { id:1, q:"Which sorting algorithm has the best average-case time complexity?", opts:["Bubble Sort — O(n²)","Merge Sort — O(n log n)","Insertion Sort — O(n²)","Selection Sort — O(n²)"], ans:1, topic:"Algorithms" },
  { id:2, q:"In an AVL tree, the maximum height difference between left and right subtrees is:", opts:["0","1","2","Unbounded"], ans:1, topic:"Data Structures" },
  { id:3, q:"Which scheduling algorithm gives minimum average waiting time?", opts:["FCFS","Round Robin","Shortest Job First","Priority Scheduling"], ans:2, topic:"Operating Systems" },
  { id:4, q:"Which normal form eliminates transitive dependencies of non-key attributes?", opts:["1NF","2NF","3NF","BCNF"], ans:2, topic:"DBMS" },
  { id:5, q:"In TCP, which mechanism prevents sending too much data into a congested network?", opts:["Flow Control","Congestion Control","Error Control","Checksum"], ans:1, topic:"Computer Networks" },
];

export const PREV_TESTS = [
  { id:1, name:"Data Structures Full Mock", date:"Feb 22", score:78, q:40, time:"85 min", subject:"DS+Algo" },
  { id:2, name:"OS + DBMS Combined",        date:"Feb 18", score:64, q:35, time:"72 min", subject:"OS+DBMS" },
  { id:3, name:"Computer Networks Quiz",    date:"Feb 14", score:85, q:20, time:"38 min", subject:"CN"      },
  { id:4, name:"GATE Mock #1 – Full Syllabus", date:"Feb 8", score:71, q:65, time:"180 min", subject:"Full" },
];