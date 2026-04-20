export const GROWTH_DATA = {
  daily: {
    labels:  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    total:   [1240,1285,1301,1358,1390,1412,1447],
    premium: [312, 325, 334, 348, 361, 371, 382],
  },
  weekly: {
    labels:  ["W1","W2","W3","W4","W5","W6","W7","W8"],
    total:   [950,1020,1090,1180,1240,1310,1380,1447],
    premium: [210,235, 258, 290, 312, 336, 361, 382],
  },
  monthly: {
    labels:  ["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"],
    total:   [420,580,740,920,1100,1210,1330,1447],
    premium: [60, 95, 140,200,270, 310, 345, 382],
  },
};

export const NEW_SUBS_DATA = {
  daily:   [12,18,9,24,16,31,28,14,22,19,27,33,17,25,29],
  weekly:  [74,88,65,102,91,118,107,125],
  monthly: [210,285,340,420,390,460,510,480],
};

export const PLAN_BREAKDOWN = [
  { label:"Premium Annual",  val:148, color:"#00d4ff", pct:39 },
  { label:"Premium Monthly", val:234, color:"#00e5a0", pct:61 },
];

export const EXAM_TRENDS = [
  { name:"GATE CS",      uploads:1842, users:612, color:"#00d4ff", max:1842, tags:["CS","Engineering"] },
  { name:"UPSC Civil",   uploads:1390, users:487, color:"#00e5a0", max:1842, tags:["Government"]       },
  { name:"CAT MBA",      uploads:980,  users:341, color:"#ffb547", max:1842, tags:["Management"]       },
  { name:"JEE Advanced", uploads:874,  users:298, color:"#a78bfa", max:1842, tags:["Engineering"]      },
  { name:"NEET",         uploads:621,  users:213, color:"#ff4d6a", max:1842, tags:["Medical"]          },
];

export const TOP_NOTES = [
  { icon:"📘", name:"Data Structures – Trees & Graphs", sub:"DS · GATE CS",   views:2841, uploads:412 },
  { icon:"⚙️", name:"OS Process Scheduling",            sub:"OS · GATE CS",   views:2190, uploads:381 },
  { icon:"🗄️", name:"DBMS Normalization",               sub:"DBMS · GATE CS", views:1874, uploads:310 },
  { icon:"🌐", name:"TCP/IP Transport Layer",           sub:"CN · GATE CS",   views:1650, uploads:287 },
  { icon:"⚡", name:"Dynamic Programming",              sub:"Algo · GATE CS", views:1420, uploads:251 },
  { icon:"📐", name:"Linear Algebra Basics",            sub:"Math · JEE",     views:1210, uploads:198 },
];

export const RECENT_USERS = [
  { name:"Priya Sharma",  email:"priya@gmail.com",    plan:"premium", time:"2m ago",  color:"#1e3a5f", initials:"PS" },
  { name:"Rohan Mehta",   email:"rohan@outlook.com",  plan:"free",    time:"8m ago",  color:"#1a3320", initials:"RM" },
  { name:"Anjali Singh",  email:"anjali@yahoo.com",   plan:"premium", time:"15m ago", color:"#2d1a3d", initials:"AS" },
  { name:"Vikram Nair",   email:"vikram@gmail.com",   plan:"free",    time:"23m ago", color:"#3d2a0a", initials:"VN" },
  { name:"Meera Patel",   email:"meera@gmail.com",    plan:"premium", time:"41m ago", color:"#1a2d3d", initials:"MP" },
  { name:"Arjun Kumar",   email:"arjun@hotmail.com",  plan:"free",    time:"1h ago",  color:"#1e1a3d", initials:"AK" },
];

export const COHORT_DATA = [
  { month:"Oct '24", w0:100, w1:72, w2:61, w3:54, w4:49, w5:45, w6:42  },
  { month:"Nov '24", w0:100, w1:75, w2:64, w3:57, w4:52, w5:48, w6:45  },
  { month:"Dec '24", w0:100, w1:78, w2:66, w3:60, w4:55, w5:51, w6:null },
  { month:"Jan '25", w0:100, w1:80, w2:69, w3:63, w4:57, w5:null,w6:null},
  { month:"Feb '25", w0:100, w1:82, w2:71, w3:65, w4:null,w5:null,w6:null},
  { month:"Mar '25", w0:100, w1:85, w2:73, w3:null,w4:null,w5:null,w6:null},
];

export const TICKER_DATA = [
  { label:"MRR",        val:"$3,438",  change:"+12.4%", up:true  },
  { label:"ARR",        val:"$41,256", change:"+9.8%",  up:true  },
  { label:"ARPU",       val:"$8.99",   change:"+0.0%",  up:true  },
  { label:"CHURN RATE", val:"2.1%",    change:"-0.3%",  up:true  },
];

export const KPI_SPARK = {
  users:   [38,42,39,47,51,45,53,56,52,61,58,67],
  premium: [8, 9, 8, 11,13,11,14,15,13,16,15,18],
  uploads: [120,145,132,160,175,155,182,195,178,210,198,228],
  revenue: [310,340,325,370,395,360,402,418,390,445,420,468],
};

export const SIDEBAR_NAV = [
  { key:"overview",  icon:"▦",  label:"Overview",    dot:true  },
  { key:"users",     icon:"👥", label:"Users",       dot:false },
  { key:"revenue",   icon:"💳", label:"Revenue",     dot:false },
  { key:"notes",     icon:"📄", label:"Notes",       dot:false },
  { key:"exams",     icon:"🎯", label:"Exam Trends", dot:false },
  { key:"settings",  icon:"⚙",  label:"Settings",    dot:false },
];
