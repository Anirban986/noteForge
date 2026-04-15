import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeFilter, setActiveFilter] = useState({
    userGrowth: 'monthly',
    subscriberGrowth: '7d'
  });

  const userGrowthChartRef = useRef(null);
  const subscriptionChartRef = useRef(null);
  const examDistChartRef = useRef(null);
  const subscriberGrowthChartRef = useRef(null);

  const userGrowthChartInstance = useRef(null);
  const subscriptionChartInstance = useRef(null);
  const examDistChartInstance = useRef(null);
  const subscriberGrowthChartInstance = useRef(null);

  // Chart.js default configuration
  useEffect(() => {
    Chart.defaults.color = '#cbd5e1';
    Chart.defaults.borderColor = '#334155';
    Chart.defaults.font.family = "'DM Sans', sans-serif";
  }, []);

  // User Growth Chart
  useEffect(() => {
    if (userGrowthChartRef.current) {
      const ctx = userGrowthChartRef.current.getContext('2d');
      
      if (userGrowthChartInstance.current) {
        userGrowthChartInstance.current.destroy();
      }

      userGrowthChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Total Users',
              data: [8400, 10200, 12800, 15200, 17100, 18900, 20200, 21500, 22800, 23600, 24100, 24847],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Premium Users',
              data: [2100, 2800, 3600, 4200, 4900, 5400, 6100, 6700, 7200, 7700, 8100, 8392],
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Free Users',
              data: [6300, 7400, 9200, 11000, 12200, 13500, 14100, 14800, 15600, 15900, 16000, 16455],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 3,
              pointRadius: 4,
              pointHoverRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                  size: 12,
                  weight: '500'
                }
              }
            },
            tooltip: {
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 12,
              displayColors: true,
              titleFont: {
                size: 13,
                weight: '600'
              },
              bodyFont: {
                size: 12
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(51, 65, 85, 0.3)',
                drawBorder: false
              },
              ticks: {
                callback: function(value) {
                  return (value / 1000) + 'K';
                }
              }
            },
            x: {
              grid: {
                display: false,
                drawBorder: false
              }
            }
          }
        }
      });
    }

    return () => {
      if (userGrowthChartInstance.current) {
        userGrowthChartInstance.current.destroy();
      }
    };
  }, []);

  // Subscription Chart
  useEffect(() => {
    if (subscriptionChartRef.current) {
      const ctx = subscriptionChartRef.current.getContext('2d');
      
      if (subscriptionChartInstance.current) {
        subscriptionChartInstance.current.destroy();
      }

      subscriptionChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Premium Annual', 'Premium Monthly', 'Free Plan'],
          datasets: [{
            data: [5240, 3152, 16455],
            backgroundColor: [
              '#f97316',
              '#fb923c',
              '#3b82f6'
            ],
            borderWidth: 0,
            spacing: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                font: {
                  size: 12,
                  weight: '500'
                },
                usePointStyle: true
              }
            },
            tooltip: {
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  let label = context.label || '';
                  let value = context.parsed || 0;
                  let total = context.dataset.data.reduce((a, b) => a + b, 0);
                  let percentage = ((value / total) * 100).toFixed(1);
                  return label + ': ' + value.toLocaleString() + ' (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
    }

    return () => {
      if (subscriptionChartInstance.current) {
        subscriptionChartInstance.current.destroy();
      }
    };
  }, []);

  // Exam Distribution Chart
  useEffect(() => {
    if (examDistChartRef.current) {
      const ctx = examDistChartRef.current.getContext('2d');
      
      if (examDistChartInstance.current) {
        examDistChartInstance.current.destroy();
      }

      examDistChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['JEE', 'NEET', 'UPSC', 'GATE', 'SSC', 'Banking', 'CAT', 'Others'],
          datasets: [{
            label: 'Notes Uploaded',
            data: [12458, 9847, 8234, 7621, 5892, 4732, 4156, 6892],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(168, 85, 247, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)',
              'rgba(148, 163, 184, 0.8)'
            ],
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  return 'Notes: ' + context.parsed.y.toLocaleString();
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(51, 65, 85, 0.3)',
                drawBorder: false
              },
              ticks: {
                callback: function(value) {
                  return (value / 1000) + 'K';
                }
              }
            },
            x: {
              grid: {
                display: false,
                drawBorder: false
              }
            }
          }
        }
      });
    }

    return () => {
      if (examDistChartInstance.current) {
        examDistChartInstance.current.destroy();
      }
    };
  }, []);

  // Subscriber Growth Chart
  useEffect(() => {
    if (subscriberGrowthChartRef.current) {
      const ctx = subscriberGrowthChartRef.current.getContext('2d');
      
      if (subscriberGrowthChartInstance.current) {
        subscriberGrowthChartInstance.current.destroy();
      }

      subscriberGrowthChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
          datasets: [{
            label: 'New Subscribers',
            data: [287, 342, 418, 389, 467, 523, 612],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#1e293b',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  return 'Subscribers: ' + context.parsed.y;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(51, 65, 85, 0.3)',
                drawBorder: false
              }
            },
            x: {
              grid: {
                display: false,
                drawBorder: false
              }
            }
          }
        }
      });
    }

    return () => {
      if (subscriberGrowthChartInstance.current) {
        subscriberGrowthChartInstance.current.destroy();
      }
    };
  }, []);

  const handleFilterChange = (chartType, period) => {
    setActiveFilter(prev => ({
      ...prev,
      [chartType]: period
    }));
    // Here you would typically update the chart data based on the selected period
    console.log(`Filter changed for ${chartType} to:`, period);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>NotesAI Pro</h1>
          <p>Admin Dashboard</p>
        </div>
        
        <nav>
          <div className="nav-section">
            <div className="nav-section-title">Overview</div>
            <a href="#" className="nav-item active">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              Dashboard
            </a>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Analytics
            </a>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
              Users
            </a>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Notes
            </a>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Exams
            </a>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              Mock Tests
            </a>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-title">Revenue</div>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              Subscriptions
            </a>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Revenue
            </a>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-title">System</div>
            <a href="#" className="nav-item">
              <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Settings
            </a>
          </div>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <h2 className="page-title">Dashboard Overview</h2>
          <div className="page-subtitle">
            <span>Welcome back, Admin</span>
            <span className="live-indicator">
              <span className="live-dot"></span>
              Live
            </span>
          </div>
        </header>
        
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-header">
              <div>
                <div className="stat-label">Total Users</div>
                <div className="stat-value">24,847</div>
                <div className="stat-change positive">
                  <span>↑ 12.5%</span>
                  <span className="stat-trend">vs last month</span>
                </div>
              </div>
              <div className="stat-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '68%' }}></div>
            </div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-header">
              <div>
                <div className="stat-label">Premium Subscribers</div>
                <div className="stat-value">8,392</div>
                <div className="stat-change positive">
                  <span>↑ 18.2%</span>
                  <span className="stat-trend">vs last month</span>
                </div>
              </div>
              <div className="stat-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '82%' }}></div>
            </div>
          </div>
          
          <div className="stat-card warning">
            <div className="stat-header">
              <div>
                <div className="stat-label">Notes Uploaded (Today)</div>
                <div className="stat-value">1,247</div>
                <div className="stat-change positive">
                  <span>↑ 8.7%</span>
                  <span className="stat-trend">vs yesterday</span>
                </div>
              </div>
              <div className="stat-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '45%' }}></div>
            </div>
          </div>
          
          <div className="stat-card accent">
            <div className="stat-header">
              <div>
                <div className="stat-label">Monthly Revenue</div>
                <div className="stat-value">$52.4K</div>
                <div className="stat-change positive">
                  <span>↑ 24.3%</span>
                  <span className="stat-trend">vs last month</span>
                </div>
              </div>
              <div className="stat-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '92%' }}></div>
            </div>
          </div>
        </div>
        
        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">User Growth Trends</h3>
              <div className="chart-filters">
                <button 
                  className={`filter-btn ${activeFilter.userGrowth === 'daily' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('userGrowth', 'daily')}
                >
                  Daily
                </button>
                <button 
                  className={`filter-btn ${activeFilter.userGrowth === 'weekly' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('userGrowth', 'weekly')}
                >
                  Weekly
                </button>
                <button 
                  className={`filter-btn ${activeFilter.userGrowth === 'monthly' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('userGrowth', 'monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>
            <div className="chart-container">
              <canvas ref={userGrowthChartRef}></canvas>
            </div>
          </div>
          
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Subscription Split</h3>
            </div>
            <div className="chart-container">
              <canvas ref={subscriptionChartRef}></canvas>
            </div>
          </div>
        </div>
        
        {/* Two Column Grid */}
        <div className="two-col-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Exam-wise Note Distribution</h3>
            </div>
            <div className="chart-container">
              <canvas ref={examDistChartRef}></canvas>
            </div>
          </div>
          
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Subscriber Growth</h3>
              <div className="chart-filters">
                <button 
                  className={`filter-btn ${activeFilter.subscriberGrowth === '7d' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('subscriberGrowth', '7d')}
                >
                  7D
                </button>
                <button 
                  className={`filter-btn ${activeFilter.subscriberGrowth === '30d' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('subscriberGrowth', '30d')}
                >
                  30D
                </button>
                <button 
                  className={`filter-btn ${activeFilter.subscriberGrowth === '90d' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('subscriberGrowth', '90d')}
                >
                  90D
                </button>
              </div>
            </div>
            <div className="chart-container">
              <canvas ref={subscriberGrowthChartRef}></canvas>
            </div>
          </div>
        </div>
        
        {/* Tables */}
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Top Performing Exams</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Total Notes</th>
                <th>Active Users</th>
                <th>Trend (7d)</th>
                <th>Avg. Engagement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="exam-badge jee">JEE</span></td>
                <td>12,458</td>
                <td>4,892</td>
                <td><span className="trend-indicator up">↑ 23%</span></td>
                <td>87%</td>
              </tr>
              <tr>
                <td><span className="exam-badge neet">NEET</span></td>
                <td>9,847</td>
                <td>3,756</td>
                <td><span className="trend-indicator up">↑ 18%</span></td>
                <td>82%</td>
              </tr>
              <tr>
                <td><span className="exam-badge upsc">UPSC</span></td>
                <td>8,234</td>
                <td>2,943</td>
                <td><span className="trend-indicator up">↑ 15%</span></td>
                <td>79%</td>
              </tr>
              <tr>
                <td><span className="exam-badge gate">GATE</span></td>
                <td>7,621</td>
                <td>2,687</td>
                <td><span className="trend-indicator up">↑ 12%</span></td>
                <td>75%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;