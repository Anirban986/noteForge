import { useState } from "react";
import "./AdminDashboard.css";

import AdminSidebar   from "../AdminSidebar/AdminSidebar";
import AdminTopbar    from "../AdminTopbar/AdminTopbar";
import RevenueTickers from "../RevenueTickers/RevenueTickers";
import KpiGrid        from "../KpiGrid/KpiGrid";
import GrowthChart    from "../GrowthChart/GrowthChart";
import PlanDonut      from "../PlanDonut/PlanDonut";
import NewSubsBar     from "../NewSubsBar/NewSubsBar";
import CohortTable    from "../CohortTable/CohortTable";
import ExamTrends     from "../ExamTrends/ExamTrends";
import TopNotes       from "../TopNotes/TopNotes";
import RecentUsers    from "../RecentUsers/RecentUsers";

export default function AdminDashboard({onExit}) {
  const [range,     setRange]     = useState("weekly");
  const [activeNav, setActiveNav] = useState("overview");

  return (
    <div className="adm-root">
      <div className="adm-shell">

        <AdminSidebar activeNav={activeNav} onNav={setActiveNav} onExit={onExit} />

        <div className="adm-main">
          <AdminTopbar range={range} onRangeChange={setRange} />

          <div className="adm-body">

            {/* Revenue tickers */}
            <RevenueTickers />

            {/* KPI cards */}
            <div className="adm-section-hd">
              <div className="adm-section-hd__label">Key Metrics</div>
            </div>
            <KpiGrid />

            {/* Growth chart + plan donut */}
            <div className="adm-section-hd">
              <div className="adm-section-hd__label">User Growth</div>
            </div>
            <div className="adm-charts-row">
              <GrowthChart range={range} onRangeChange={setRange} />
              <PlanDonut />
            </div>

            {/* New subscribers + cohort retention */}
            <div className="adm-section-hd">
              <div className="adm-section-hd__label">Acquisition & Retention</div>
            </div>
            <div className="adm-mid-row">
              <NewSubsBar range={range} />
              <CohortTable />
            </div>

            {/* Exam trends + top notes + recent users */}
            <div className="adm-section-hd">
              <div className="adm-section-hd__label">Content & Users</div>
            </div>
            <div className="adm-bottom-row">
              <ExamTrends />
              <TopNotes />
              <RecentUsers />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
