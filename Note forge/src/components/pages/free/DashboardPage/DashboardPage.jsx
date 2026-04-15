import "./DashboardPage.css";
import Card from "../../../ui/Card/Card";
import Badge from "../../../ui/Badge/Badge";
import Button from "../../../ui/Button/Button";
import SectionTitle from "../../../ui/SectionTitle/SectionTitle";
import { NOTES_DATA } from "../../../../data/mockData";
import { useEffect, useState } from "react";
import api from "../../../layout/api";


export default function DashboardPage({ isPremium, onUpgrade, user }) {
  const recentNotes = [...NOTES_DATA]
    .sort((a, b) => b.addedTs - a.addedTs)
    .slice(0, 4);

  
  
  const [details,setDetails]=useState([]);
  const [count,setCount]=useState(null);

  useEffect(()=>{
    const fetchDetails=async ()=>{
      try{
        const res=await api.get("/api/auth/profile");
        setDetails(res.data.user);
        console.log(res);
        console.log(res.data);
      }
      catch(err){
        console.log(err);
      }
    }

    fetchDetails();

  },[])


  useEffect(()=>{
    const countDocs=async ()=>{
      try{
        const res=await api.get("/api/notes/countDocs");
        setCount(res.data.count);
        console.log(res.data);
        console.log(res.data.count);
      }catch(err){
        console.log(err)
      }
    }
    countDocs();
  },[])


  const stats = [
    { icon: "📄", label: "Notes Uploaded",  value: isPremium ? (count?count.normal:0) : "5",  sub: isPremium ? "Unlimited plan" : "5 / 5 free limit",  bg: "#eef2ff" },
    { icon: "🧠", label: "Topics Detected", value: "23", sub: "Across all notes",    bg: "#ebfbee" },
    { icon: "⬇", label: "Downloads",       value: "12", sub: "Structured exports",  bg: "#fff9db" },
  ];

  return (
    <div className="dashboard fade-up">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Welcome, {details?.username || "user"}  👋</h1>
        <p className="dashboard__subtitle">Your notes workspace is ready.</p>
      </div>

      {/* Stats */}
      <div className="dashboard__stats">
        {stats.map((s, i) => (
          <Card key={s.label} hover className={`stat-card fade-up-${i}`}>
            <div className="stat-card__orb" style={{ background: s.bg }} />
            <div className="stat-card__icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
            <div className="stat-card__sub">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Bottom two-col */}
      <div className="two-col">
        {/* Recent Notes */}
        <Card className="fade-up-2">
          <SectionTitle action={<Button variant="ghost" size="sm">View All →</Button>}>
            Recent Notes
          </SectionTitle>
          {recentNotes.map((n) => (
            <div key={n.id} className="recent-note">
              <div className="recent-note__icon" style={{ background: n.iconBg }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="recent-note__title">{n.chapter}</div>
                <div className="recent-note__meta">
                  {n.subject} · {n.pages}p · {n.dateLabel}
                </div>
              </div>
              <Badge color="accent" size="xs">AI</Badge>
            </div>
          ))}
        </Card>

        {/* Exam Mode card */}
        <Card className="fade-up-3">
          <SectionTitle>{isPremium ? "Exam Mode" : "Unlock Exam Mode"}</SectionTitle>
          <div className="promo-card__body">
            <div className="promo-card__emoji">⭐</div>
            <div className="promo-card__title">Exam Mode Workspace</div>
            <p className="promo-card__desc">
              {isPremium
                ? "Track exam performance, create mock tests, identify missing topics, and more."
                : "Upgrade to get mock tests, missing topic detection, analytics, and more."}
            </p>
            {isPremium
              ? <Button size="lg">Go to Exam Mode →</Button>
              : <Button size="lg" onClick={onUpgrade}>✨ Unlock Exam Mode</Button>
            }
          </div>
        </Card>
      </div>
    </div>
  );
}