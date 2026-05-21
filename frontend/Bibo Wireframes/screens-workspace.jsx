/* Workspace screens: desktop variants by role + search overlay + mobile variants */

// ============================================================
// WORKSPACE DESKTOP — full version (matches uploaded screenshot)
// ============================================================
const WorkspaceDesktop = ({ user, role = 'admin', showSearch = false, greeting = 'Bibo Workspace' }) => {
  // Filter modules by role; for non-admin, show all but lock the ones outside their role
  const visible = MODULES;
  const isAllowed = m => m.roles.includes(role);

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--surface)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <BiboTopbar user={user} />
      <div className="bibo-body">
        <BiboSidebar active="workspace" />
        <div className="bibo-main">
          <h1 className="workspace-title">{greeting}</h1>
          <p className="workspace-sub">Manage projects, production and operations in one place.</p>

          <div className="your-apps">Your Apps</div>
          <div className="module-grid">
            {visible.map(m => (
              <ModuleTile key={m.key} m={m} locked={!isAllowed(m)} />
            ))}
          </div>

          {role === 'admin' && (
            <div className="overview-row">
              <div className="overview-card">
                <div className="overview-head"><span className="title">Today's Overview</span><span className="link">View report</span></div>
                <div className="overview-stats">
                  <div className="overview-stat"><div className="v">8</div><div className="l">Active Jobs</div></div>
                  <div className="overview-stat"><div className="v">4</div><div className="l">Due Today</div></div>
                  <div className="overview-stat"><div className="v" style={{ color: 'var(--bibo-red)' }}>2</div><div className="l">Delays</div></div>
                  <div className="overview-stat"><div className="v" style={{ color: 'var(--status-green)' }}>92%</div><div className="l">On-Time</div></div>
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-head"><span className="title">Production Status</span><span className="link">View shop floor</span></div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <svg width="60" height="60" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--ink-100)" strokeWidth="4"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--bibo-red)" strokeWidth="4" strokeDasharray="62 88" strokeDashoffset="0" transform="rotate(-90 18 18)" strokeLinecap="round"/>
                    <text x="18" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--ink-900)">72%</text>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--status-blue)' }}>● In Progress</span><span style={{ fontWeight: 600 }}>18</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--status-green)' }}>● Completed</span><span style={{ fontWeight: 600 }}>26</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--bibo-red)' }}>● Planned</span><span style={{ fontWeight: 600 }}>11</span></div>
                  </div>
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-head"><span className="title">Inventory Alerts</span><span className="link">View all</span></div>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--status-amber)' }}>3</div><div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Low Stock</div></div>
                  <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--bibo-red)' }}>2</div><div style={{ fontSize: 11, color: 'var(--ink-500)' }}>Critical</div></div>
                </div>
              </div>
              <div className="overview-card">
                <div className="overview-head"><span className="title">Calendar</span><span className="link">View calendar</span></div>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--status-blue-bg)', color: 'var(--status-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="cal" size={20} /></div>
                  </div>
                  <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--status-amber)' }}>5</div><div style={{ fontSize: 10, color: 'var(--ink-500)' }}>Installations<br/>This Week</div></div>
                  <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--status-blue)' }}>2</div><div style={{ fontSize: 10, color: 'var(--ink-500)' }}>Site Surveys<br/>Tomorrow</div></div>
                </div>
              </div>
            </div>
          )}

          {role !== 'admin' && (
            <div style={{ marginTop: 24, padding: 20, background: 'var(--ink-50)', borderRadius: 12, border: '1px solid var(--ink-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Icon name="shield" size={18} stroke="var(--bibo-red)" />
                <div style={{ fontSize: 13, fontWeight: 600 }}>You're seeing modules for the <span style={{ color: 'var(--bibo-red)' }}>{
                  role === 'hr' ? 'HR Manager' : role === 'sales' ? 'Sales Lead' : role === 'field' ? 'Field Installer' : 'Standard'
                }</span> role.</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                Greyed tiles are part of Bibo but not in your access. Ask your IT admin if you need additional permissions.
              </div>
            </div>
          )}
        </div>
      </div>

      {showSearch && <WorkspaceSearchOverlay />}
    </div>
  );
};

// Search overlay (palette)
const WorkspaceSearchOverlay = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,20,25,0.18)', display: 'flex', justifyContent: 'center', paddingTop: 76 + 20 }}>
    <div style={{ width: 640, maxHeight: 540, background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--ink-100)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--ink-100)' }}>
        <Icon name="search" size={18} />
        <div style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--ink-900)' }}>w<span style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--bibo-red)', marginLeft: 1, verticalAlign: 'middle' }}/></div>
        <span style={{ fontSize: 11, padding: '3px 8px', background: 'var(--ink-100)', borderRadius: 4, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>ESC</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 16, gap: 16, maxHeight: 470, overflow: 'hidden' }}>
        {/* Left column */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-500)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Icon name="grid" size={12} />Modules</div>
          {[{ name: 'Warehouse', sub: 'Inventory, stock & warehouse management', icon: 'warehouse', color: 'orange', kbd: '⌘ 1' }, { name: 'Projects', sub: 'Project planning & tracking', icon: 'briefcase', color: 'red', kbd: '⌘ 2' }].map((it, i) => (
            <SearchRow key={i} item={it} />
          ))}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-500)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 16 }}><Icon name="folder" size={12} />Projects</div>
          {[{ name: 'Karen Villa Project', sub: 'Residential Villa — Karen', icon: 'folder', color: 'green', kbd: '⌘ 3' }, { name: 'Westlands Offices', sub: 'Commercial Office Fit-out', icon: 'folder', color: 'green', kbd: '⌘ 4' }].map((it, i) => (
            <SearchRow key={i} item={it} />
          ))}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-500)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 16 }}><Icon name="users" size={12} />Clients</div>
          {[{ name: 'John Mwangi', sub: 'Premium Glazing Solutions Ltd', icon: 'user', color: 'blue', kbd: '⌘ 5' }, { name: 'Window World Ltd', sub: 'Corporate Client', icon: 'user', color: 'blue', kbd: '⌘ 6' }].map((it, i) => (
            <SearchRow key={i} item={it} />
          ))}
        </div>
        {/* Right column */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-500)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Icon name="doc" size={12} />Documents</div>
          {[{ name: 'BOM_Karen_Villa.xlsx', sub: 'Excel Document · 245 KB', icon: 'doc', color: 'green', kbd: '⌘ D' }, { name: 'Quote_WW_0524.pdf', sub: 'PDF Document · 1.4 MB', icon: 'doc', color: 'red', kbd: '⌘ F' }, { name: 'Installation_Guide.pdf', sub: 'PDF Document · 3.1 MB', icon: 'doc', color: 'red', kbd: '⌘ G' }].map((it, i) => (
            <SearchRow key={i} item={it} />
          ))}
          <div style={{ fontSize: 12, color: 'var(--bibo-red)', fontWeight: 500, marginTop: 4 }}>View all documents...</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-500)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 16 }}>⚡ Quick Actions</div>
          {[{ name: 'Create Project', icon: 'plus', kbd: '⌘ N' }, { name: 'Create Quote', icon: 'plus', kbd: '⌘ Q' }, { name: 'Create Purchase Order', icon: 'plus', kbd: '⌘ P' }].map((it, i) => (
            <SearchRow key={i} item={{ ...it, color: 'slate', sub: null }} />
          ))}
          <div style={{ fontSize: 12, color: 'var(--bibo-red)', fontWeight: 500, marginTop: 4 }}>Show all actions...</div>
        </div>
      </div>
    </div>
  </div>
);

const SearchRow = ({ item }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 6, marginBottom: 2 }}>
    <div style={{ width: 28, height: 28, borderRadius: 6, background: `var(--tile-${item.color})`, color: `var(--icon-${item.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={item.icon} size={14} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{item.name}</div>
      {item.sub && <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{item.sub}</div>}
    </div>
    {item.kbd && <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--ink-100)', borderRadius: 4, color: 'var(--ink-500)', fontFamily: 'var(--font-mono)' }}>{item.kbd}</span>}
  </div>
);

// ============================================================
// MOBILE WORKSPACE — 3 column (default)
// ============================================================
const MobileWorkspace3Col = ({ user = { initials: 'JK', name: 'John' } }) => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <MobileTopBar name={user.initials} />
    <div className="m-greeting">
      Hi, {user.name} 👋
      <span className="sub">8 active jobs · 4 due today</span>
    </div>
    <div className="m-search">
      <Icon name="search" size={16} />
      <span>Search projects, clients...</span>
    </div>
    <div className="m-section-head">
      <span>Your Apps</span>
      <span className="right">Edit</span>
    </div>
    <div className="m-grid c3">
      {MODULES.slice(0, 12).map((m, i) => (
        <MobileTile key={m.key} m={m} badge={m.meta?.text?.match(/^\d+/)?.[0] || null} />
      ))}
    </div>
    <MobileTabBar active="workspace" />
  </div>
);

// ============================================================
// MOBILE WORKSPACE — 4 column (compact)
// ============================================================
const MobileWorkspace4Col = ({ user = { initials: 'JK', name: 'John' } }) => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <MobileTopBar name={user.initials} />
    <div className="m-greeting">
      Hi, {user.name} 👋
      <span className="sub">8 active jobs · 4 due today</span>
    </div>
    <div className="m-search">
      <Icon name="search" size={16} />
      <span>Search projects, clients...</span>
    </div>
    <div className="m-section-head">
      <span>Your Apps · 20</span>
      <span className="right">Edit</span>
    </div>
    <div className="m-grid c4">
      {MODULES.slice(0, 16).map((m, i) => (
        <MobileTile key={m.key} m={m} badge={m.meta?.text?.match(/^\d+/)?.[0] || null} />
      ))}
    </div>
    <MobileTabBar active="workspace" />
  </div>
);

// ============================================================
// MOBILE WORKSPACE — Grouped folders
// ============================================================
const MobileWorkspaceFolders = ({ user = { initials: 'JK', name: 'John' } }) => {
  const folders = [
    { name: 'Sales', color: 'blue', modules: ['cont', 'crm', 'quote', 'cli'] },
    { name: 'Production', color: 'red', modules: ['bom', 'prod', 'qc', 'off'] },
    { name: 'Operations', color: 'green', modules: ['proj', 'pm', 'disp', 'inst'] },
    { name: 'Back office', color: 'purple', modules: ['fin', 'hr', 'rep', 'it'] },
  ];
  const findM = k => MODULES.find(m => m.key === k);
  return (
    <div className="phone-screen">
      <PhoneStatusBar />
      <MobileTopBar name={user.initials} />
      <div className="m-greeting">
        Hi, {user.name} 👋
        <span className="sub">Grouped by department</span>
      </div>
      <div className="m-search">
        <Icon name="search" size={16} />
        <span>Search modules...</span>
      </div>

      <div className="m-section-head">
        <span>Quick access</span>
      </div>
      <div className="m-grid c3" style={{ paddingBottom: 4 }}>
        {['proj', 'crm', 'wh'].map(k => <MobileTile key={k} m={findM(k)} badge={findM(k).meta?.text?.match(/^\d+/)?.[0]||null} />)}
      </div>

      <div className="m-section-head">
        <span>Folders</span>
        <span className="right">+ New</span>
      </div>
      <div className="m-grid c3">
        {folders.map(f => (
          <div key={f.name} className="m-folder">
            <div className="mini-grid">
              {f.modules.map(k => {
                const m = findM(k);
                return (
                  <div key={k} className="mini-ic" style={{ background: `var(--tile-${m.color})`, color: `var(--icon-${m.color})` }}>
                    <Icon name={m.icon} size={14} />
                  </div>
                );
              })}
            </div>
            <div className="fname">{f.name}</div>
          </div>
        ))}
      </div>

      <MobileTabBar active="workspace" />
    </div>
  );
};

Object.assign(window, {
  WorkspaceDesktop, WorkspaceSearchOverlay,
  MobileWorkspace3Col, MobileWorkspace4Col, MobileWorkspaceFolders,
});
