/* Admin + HR screens + Cover + Flow map + Summary */

// ============================================================
// COVER
// ============================================================
const CoverSlide = () => (
  <div style={{
    width: '100%', height: '100%',
    background: 'linear-gradient(135deg, var(--bibo-red) 0%, #B81E2C 100%)',
    color: 'white',
    position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '80px 96px'
  }}>
    {/* Pattern */}
    <svg style={{ position: 'absolute', right: -120, bottom: -120, opacity: 0.18 }} width="900" height="900" viewBox="0 0 200 200">
      <g stroke="white" strokeWidth="0.6" fill="none">
        <rect x="20" y="20" width="160" height="160" rx="3"/>
        <line x1="100" y1="20" x2="100" y2="180"/>
        <line x1="20" y1="100" x2="180" y2="100"/>
        <rect x="32" y="32" width="56" height="56"/>
        <rect x="112" y="32" width="56" height="56"/>
        <rect x="32" y="112" width="56" height="56"/>
        <rect x="112" y="112" width="56" height="56"/>
      </g>
    </svg>
    <svg style={{ position: 'absolute', left: -80, top: -80, opacity: 0.08 }} width="500" height="500" viewBox="0 0 200 200">
      <g stroke="white" strokeWidth="0.5" fill="none">
        <rect x="20" y="20" width="160" height="160" rx="3"/>
        <line x1="100" y1="20" x2="100" y2="180"/>
        <line x1="20" y1="100" x2="180" y2="100"/>
      </g>
    </svg>

    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 18 }}>
      <BiboLogoMark size={64} />
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-0.01em' }}>BIBO</div>
        <div style={{ fontSize: 24, letterSpacing: '0.22em', fontWeight: 600, opacity: 0.9, marginTop: 6 }}>WINDOWS &amp; DOORS</div>
      </div>
    </div>

    <div style={{ position: 'relative', zIndex: 2 }}>
      <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.85, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }}>
        ERP Onboarding · Wireframes v1.0
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 140, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, maxWidth: 1500 }}>
        Invite to active <br/>in 48 hours.
      </div>
      <div style={{ fontSize: 26, opacity: 0.9, marginTop: 32, maxWidth: 1100, lineHeight: 1.5 }}>
        Full UX exploration: 10 screens, 3 onboarding directions, role-based workspaces, plus desktop + mobile mocks for every step.
      </div>
    </div>

    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 40 }}>
        {[
          ['10', 'Screens'],
          ['3×', 'Variations / step'],
          ['2', 'Form factors'],
          ['7', 'User statuses'],
        ].map(([v, l], i) => (
          <div key={i}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{v}</div>
            <div style={{ fontSize: 24, opacity: 0.85, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 12, fontWeight: 500 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right', fontSize: 20, opacity: 0.85 }}>
        <div style={{ fontWeight: 600 }}>May 2026</div>
        <div style={{ marginTop: 4 }}>Auth · Users · Profiles · HR · Access Control</div>
      </div>
    </div>
  </div>
);

// ============================================================
// FLOW MAP
// ============================================================
const FlowMap = () => {
  const statuses = [
    { name: 'invited', icon: 'mail', color: 'blue', login: 'No', access: 'None', desc: 'Admin created invitation; user has email + temp password.' },
    { name: 'pending_email_verification', icon: 'check', color: 'amber', login: 'Limited', access: 'Onboarding only', desc: 'Awaiting email verification click after setting password.' },
    { name: 'pending_profile_completion', icon: 'user', color: 'amber', login: 'Limited', access: 'Onboarding', desc: 'Email verified — must complete personal profile.' },
    { name: 'pending_hr_review', icon: 'hr', color: 'amber', login: 'Limited', access: 'Onboarding + home', desc: 'HR must fill employee record + approve.' },
    { name: 'active', icon: 'check', color: 'green', login: 'Yes', access: 'Per role', desc: 'Full workspace access granted.' },
  ];
  const terminal = [
    { name: 'suspended', icon: 'shield-x', color: 'red', desc: 'Blocked by IT/Admin. Reinstatement possible.' },
    { name: 'inactive', icon: 'lock', color: 'slate', desc: 'Offboarded — terminal state.' },
  ];
  return (
    <div className="slide">
      <SlideHeader eyebrow="System Overview" title="User lifecycle & onboarding flow"
        sub="Every account moves linearly through 5 statuses before going active. Two terminal states exit the pipeline." num={2} total={31} />
      <div className="stage" style={{ flexDirection: 'column', justifyContent: 'flex-start', gap: 36, paddingTop: 20 }}>
        {/* Happy path */}
        <div style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'stretch' }}>
          {statuses.map((s, i) => (
            <React.Fragment key={s.name}>
              <div className="flow-card" style={{ flex: 1, paddingTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `var(--tile-${s.color})`, color: `var(--icon-${s.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={16} />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ink-500)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</div>
                </div>
                <div className="flow-title" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{s.name}</div>
                <div className="flow-desc" style={{ marginTop: 6 }}>{s.desc}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, fontSize: 10, color: 'var(--ink-500)' }}>
                  <div><strong style={{ color: 'var(--ink-900)' }}>Login:</strong> {s.login}</div>
                  <div><strong style={{ color: 'var(--ink-900)' }}>Access:</strong> {s.access}</div>
                </div>
              </div>
              {i < statuses.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-300)' }}>
                  <Icon name="arrow-right" size={20} stroke="var(--bibo-red)" strokeWidth={2.5} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Branches: terminal states + the 10 screens */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 12, padding: 22, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Terminal states</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {terminal.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `var(--tile-${s.color})`, color: `var(--icon-${s.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 12, padding: 22, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>10 screens in this deck</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                ['Login', 'blue'], ['Accept Invite', 'purple'], ['Profile', 'green'], ['Pending HR', 'amber'], ['Workspace', 'red'],
                ['Forgot PW', 'teal'], ['Reset PW', 'teal'], ['Recover Email', 'teal'], ['Admin Invite', 'slate'], ['HR Profile', 'pink'],
              ].map(([name, color], i) => (
                <div key={i} style={{ padding: 10, background: `var(--tile-${color})`, color: `var(--icon-${color})`, borderRadius: 8, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.8 }}>{String(i+1).padStart(2,'0')}</div>
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ADMIN — User List
// ============================================================
const AdminUserList = () => {
  const users = [
    { name: 'Aisha Mwangi', email: 'aisha.mwangi@bibo.com', status: 'invited', dept: 'Sales', role: 'Sales Lead', last: '—', av: 'red', initials: 'AM' },
    { name: 'John Kamau', email: 'john.kamau@bibo.com', status: 'active', dept: 'IT', role: 'System Admin', last: '2 min ago', av: 'blue', initials: 'JK' },
    { name: 'Brian Otieno', email: 'brian.o@bibo.com', status: 'active', dept: 'Production', role: 'Floor Manager', last: '1 hr ago', av: 'green', initials: 'BO' },
    { name: 'Faith Wambui', email: 'faith.w@bibo.com', status: 'pending', dept: 'Field Services', role: 'Installer', last: '3 hrs ago', av: 'purple', initials: 'FW' },
    { name: 'Sarah Mutua', email: 'sarah.m@bibo.com', status: 'active', dept: 'HR', role: 'HR Manager', last: '12 min ago', av: 'amber', initials: 'SM' },
    { name: 'Daniel Kiprop', email: 'daniel.k@bibo.com', status: 'suspended', dept: 'Warehouse', role: 'Inventory Lead', last: 'May 12', av: 'teal', initials: 'DK' },
    { name: 'Linda Achieng', email: 'linda.a@bibo.com', status: 'active', dept: 'Finance', role: 'Accounts Lead', last: '5 hrs ago', av: 'red', initials: 'LA' },
    { name: 'Peter Njoroge', email: 'peter.n@bibo.com', status: 'invited', dept: 'Sales', role: 'Estimator', last: '—', av: 'blue', initials: 'PN' },
    { name: 'Grace Wanjiru', email: 'grace.w@bibo.com', status: 'inactive', dept: 'Operations', role: 'Coordinator', last: 'Apr 30', av: 'green', initials: 'GW' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <BiboTopbar user={{ initials: 'JK', name: 'John Kamau', role: 'System Admin' }} />
      <div className="bibo-body">
        <BiboSidebar active="settings" />
        <div className="bibo-main" style={{ padding: '28px 36px' }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: 'var(--ink-500)', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            Settings <Icon name="chevron-right" size={10} /> <span style={{ color: 'var(--ink-900)', fontWeight: 600 }}>Users</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <h1 className="workspace-title" style={{ fontSize: 28 }}>Users</h1>
              <p className="workspace-sub" style={{ margin: '4px 0 0', fontSize: 13 }}>247 total · 12 pending invitations · 2 suspended</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="secondary"><Icon name="filter" size={14} />Filter</Btn>
              <Btn kind="primary"><Icon name="plus" size={14} />Invite user</Btn>
            </div>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, padding: '6px 8px', background: 'var(--ink-50)', borderRadius: 999, border: '1px solid var(--ink-100)' }}>
              <Icon name="search" size={14} stroke="var(--ink-400)" />
              <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Search by name or email...</span>
            </div>
            {[
              { l: 'All · 247', a: true },
              { l: 'Active · 213' },
              { l: 'Pending · 12', tone: 'amber' },
              { l: 'Suspended · 2', tone: 'red' },
              { l: 'Inactive · 20' },
            ].map((c, i) => (
              <div key={i} style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: c.a ? 'var(--ink-900)' : 'var(--surface)',
                color: c.a ? 'white' : 'var(--ink-700)',
                border: c.a ? 'none' : '1px solid var(--ink-200)'
              }}>{c.l}</div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <select style={{ height: 32, fontSize: 12, padding: '0 12px', borderRadius: 8, border: '1px solid var(--ink-200)', background: 'var(--surface)', color: 'var(--ink-700)' }}><option>All departments</option></select>
              <select style={{ height: 32, fontSize: 12, padding: '0 12px', borderRadius: 8, border: '1px solid var(--ink-200)', background: 'var(--surface)', color: 'var(--ink-700)' }}><option>All roles</option></select>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Last login</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={'av ' + u.av}>{u.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={'status-badge ' + u.status}><span className="dot"/>{u.status}</span></td>
                    <td>{u.dept}</td>
                    <td>{u.role}</td>
                    <td style={{ color: 'var(--ink-500)' }}>{u.last}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {u.status === 'invited' && <button style={btnPill}>Resend</button>}
                        {u.status === 'invited' && <button style={{ ...btnPill, color: 'var(--status-red)' }}>Revoke</button>}
                        {u.status === 'active' && <button style={btnPill}><Icon name="more" size={14} /></button>}
                        {u.status === 'suspended' && <button style={{ ...btnPill, background: 'var(--status-green-bg)', color: 'var(--status-green)' }}>Reinstate</button>}
                        {(u.status === 'active' || u.status === 'suspended') && <button style={btnPill}><Icon name="more" size={14} /></button>}
                        {u.status === 'pending' && <button style={btnPill}>View</button>}
                        {u.status === 'inactive' && <button style={btnPill}><Icon name="more" size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const btnPill = {
  height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--ink-200)',
  background: 'var(--surface)', color: 'var(--ink-700)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4
};

// Mobile admin
const AdminUserListMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="chevron-left" size={20} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Users</span>
      </div>
      <Btn kind="primary" size="sm" style={{ padding: '0 10px' }}><Icon name="plus" size={14} />Invite</Btn>
    </div>
    <div style={{ padding: '10px 16px', display: 'flex', gap: 6, overflowX: 'auto' }}>
      {['All 247', 'Active', 'Pending', 'Suspended'].map((c, i) => (
        <div key={i} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: i === 0 ? 'var(--ink-900)' : 'var(--ink-50)', color: i === 0 ? 'white' : 'var(--ink-700)', border: i === 0 ? 'none' : '1px solid var(--ink-100)' }}>{c}</div>
      ))}
    </div>
    <div style={{ padding: '0 16px' }}>
      {[
        { n: 'Aisha Mwangi', e: 'aisha.m@bibo.com', s: 'invited', r: 'Sales Lead', av: 'red', i: 'AM' },
        { n: 'John Kamau', e: 'john.k@bibo.com', s: 'active', r: 'System Admin', av: 'blue', i: 'JK' },
        { n: 'Faith Wambui', e: 'faith.w@bibo.com', s: 'pending', r: 'Installer', av: 'purple', i: 'FW' },
        { n: 'Sarah Mutua', e: 'sarah.m@bibo.com', s: 'active', r: 'HR Manager', av: 'amber', i: 'SM' },
        { n: 'Daniel Kiprop', e: 'daniel.k@bibo.com', s: 'suspended', r: 'Inventory', av: 'teal', i: 'DK' },
      ].map((u, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--ink-100)' }}>
          <div className={'av ' + u.av} style={{ width: 38, height: 38, fontSize: 12 }}>{u.i}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{u.n}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{u.r}</div>
          </div>
          <span className={'status-badge ' + u.s}><span className="dot"/>{u.s}</span>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// ADMIN — Invite User (drawer over user list)
// ============================================================
const AdminInviteDrawer = () => (
  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
    <AdminUserList />
    <div className="drawer-backdrop" />
    <div className="drawer">
      <div className="drawer-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="drawer-title">Invite a new user</h2>
            <p className="drawer-sub">They'll receive an email with a secure link &amp; temporary password.</p>
          </div>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-500)' }}><Icon name="x" size={20} /></button>
        </div>
      </div>
      <div className="drawer-body">
        <Input label="Full name *" value="Aisha Mwangi" focused />
        <Input label="Email address *" value="aisha.mwangi@bibo.com" trail={<Icon name="mail" size={16} />} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Primary department *" value="Sales" trail={<Icon name="chevron-down" size={14} />} />
          <Input label="Primary role *" value="Sales Lead" trail={<Icon name="chevron-down" size={14} />} />
        </div>

        <div>
          <div className="input-label" style={{ marginBottom: 8 }}>Additional assignments <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>(optional)</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input" style={{ flex: 1 }}>Estimations</div>
              <div className="input" style={{ flex: 1 }}>Estimator</div>
              <button style={{ width: 44, height: 44, border: '1px solid var(--ink-200)', borderRadius: 8, background: 'transparent', color: 'var(--ink-500)' }}><Icon name="x" size={16} /></button>
            </div>
            <button style={{ height: 40, border: '1px dashed var(--ink-300)', borderRadius: 8, background: 'transparent', color: 'var(--bibo-red)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="plus" size={14} />Add another department / role
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--status-blue-bg)', color: 'var(--status-blue)', padding: '10px 14px', borderRadius: 8, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="shield" size={16} />
          <div>
            <strong>A secure temporary password will be emailed to the user.</strong> Bibo never displays passwords in this interface.
          </div>
        </div>
      </div>
      <div className="drawer-foot">
        <Btn kind="secondary">Cancel</Btn>
        <Btn kind="primary"><Icon name="send" size={14} />Send invitation</Btn>
      </div>
    </div>
  </div>
);

const AdminInviteMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ink-100)' }}>
      <span style={{ fontWeight: 700, fontSize: 15 }}>Invite user</span>
      <Icon name="x" size={20} />
    </div>
    <div style={{ padding: '18px 20px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="Full name *" value="Aisha Mwangi" focused />
      <Input label="Email *" value="aisha.mwangi@bibo.com" trail={<Icon name="mail" size={14} />} />
      <Input label="Department *" value="Sales" trail={<Icon name="chevron-down" size={14} />} />
      <Input label="Role *" value="Sales Lead" trail={<Icon name="chevron-down" size={14} />} />
      <button style={{ height: 40, border: '1px dashed var(--ink-300)', borderRadius: 8, background: 'transparent', color: 'var(--bibo-red)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
        <Icon name="plus" size={14} />Add assignment
      </button>
      <div style={{ background: 'var(--status-blue-bg)', color: 'var(--status-blue)', padding: '10px 12px', borderRadius: 8, fontSize: 11, display: 'flex', gap: 8 }}>
        <Icon name="shield" size={14} />
        <div>A secure password will be emailed to the user.</div>
      </div>
    </div>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, background: 'var(--surface)', borderTop: '1px solid var(--ink-100)' }}>
      <Btn kind="primary" full><Icon name="send" size={14} />Send invitation</Btn>
    </div>
  </div>
);

// ============================================================
// ADMIN — Suspend confirmation
// ============================================================
const AdminSuspendDialog = () => (
  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
    <AdminUserList />
    <div className="drawer-backdrop" style={{ background: 'rgba(15, 20, 25, 0.5)' }} />
    {/* Modal */}
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480, background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="shield-x" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0 }}>Suspend John Kamau?</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '6px 0 0' }}>
              The account will be immediately blocked from signing in. The user's data is preserved and they can be reinstated at any time.
            </p>
          </div>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-400)' }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: '0 28px 18px' }}>
          <div style={{ background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>User</span><span style={{ fontWeight: 600 }}>John Kamau · john.kamau@bibo.com</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Departments</span><span style={{ fontWeight: 500 }}>IT · Operations</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Active sessions</span><span style={{ fontWeight: 500 }}>2 devices</span></div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--ink-500)' }}>
            <input type="checkbox" defaultChecked style={{ marginTop: 2 }} />
            <div>Terminate all active sessions immediately and clear refresh tokens.</div>
          </div>
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--ink-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink-50)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>This action is logged in audit.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn kind="secondary">Cancel</Btn>
            <Btn kind="danger">Suspend account</Btn>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AdminSuspendMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* dimmed bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 20, 25, 0.55)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: 24 }}>
        <div style={{ width: 36, height: 4, background: 'var(--ink-200)', borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield-x" size={20} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Suspend John Kamau?</div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>Account will be blocked immediately. Data is preserved.</div>
          </div>
        </div>
        <div style={{ background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 8, padding: 10, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Departments</span><span style={{ fontWeight: 500 }}>IT · Operations</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Sessions</span><span style={{ fontWeight: 500 }}>2 devices</span></div>
        </div>
        <Btn kind="danger" full>Suspend account</Btn>
        <Btn kind="ghost" full style={{ marginTop: 8 }}>Cancel</Btn>
      </div>
    </div>
  </div>
);

// ============================================================
// HR — Pending Activation Queue
// ============================================================
const HRPendingQueue = () => {
  const rows = [
    { name: 'Aisha Mwangi', email: 'aisha.m@bibo.com', dept: 'Sales', role: 'Sales Lead', invited: 'May 18', waiting: '2 days', av: 'red', i: 'AM' },
    { name: 'Brian Otieno', email: 'brian.o@bibo.com', dept: 'Production', role: 'Floor Manager', invited: 'May 19', waiting: '1 day', av: 'green', i: 'BO' },
    { name: 'Faith Wambui', email: 'faith.w@bibo.com', dept: 'Field', role: 'Installer', invited: 'May 19', waiting: '1 day', av: 'purple', i: 'FW' },
    { name: 'Peter Njoroge', email: 'peter.n@bibo.com', dept: 'Sales', role: 'Estimator', invited: 'May 20', waiting: '4 hrs', av: 'blue', i: 'PN' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <BiboTopbar user={{ initials: 'SM', name: 'Sarah Mutua', role: 'HR Manager' }} />
      <div className="bibo-body">
        {/* HR-specific sidebar */}
        <aside className="bibo-side">
          <div className="side-item"><span className="side-icon"><Icon name="grid" size={18} /></span>Workspace</div>
          <div className="side-item active"><span className="side-icon"><Icon name="hr" size={18} /></span>HR Center
            <span style={{ marginLeft: 'auto', background: 'var(--bibo-red)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>4</span>
          </div>
          <div className="side-item"><span className="side-icon"><Icon name="users" size={18} /></span>Employees</div>
          <div className="side-item"><span className="side-icon"><Icon name="doc" size={18} /></span>Contracts</div>
          <div className="side-divider" />
          <div className="side-item"><span className="side-icon"><Icon name="gear" size={18} /></span>Settings</div>
        </aside>
        <div className="bibo-main" style={{ padding: '28px 36px' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>HR Center · Activations</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <h1 className="workspace-title" style={{ fontSize: 28 }}>Pending activation</h1>
              <p className="workspace-sub" style={{ margin: '4px 0 0', fontSize: 13 }}>Users awaiting HR review &amp; account approval.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--status-amber-bg)', color: 'var(--status-amber)', borderRadius: 999, fontWeight: 600 }}>
                <Icon name="clock" size={14} /> 4 waiting
              </div>
              <Btn kind="secondary"><Icon name="filter" size={14} />Sort</Btn>
            </div>
          </div>

          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
            {[
              { v: '4', l: 'Awaiting review', c: 'var(--status-amber)' },
              { v: '1.2d', l: 'Avg time to active', c: 'var(--bibo-red)' },
              { v: '12', l: 'Activated this week', c: 'var(--status-green)' },
              { v: '0', l: 'SLA breaches', c: 'var(--ink-700)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 10, padding: 16, boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 10, boxShadow: 'var(--shadow-card)' }}>
                <div className={'av ' + r.av} style={{ width: 44, height: 44, fontSize: 14 }}>{r.i}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
                    <span className="status-badge pending"><span className="dot"/>profile complete</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{r.email} · {r.dept} · {r.role}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink-500)' }}>
                  <div>Invited <strong style={{ color: 'var(--ink-900)' }}>{r.invited}</strong></div>
                  <div style={{ color: 'var(--status-amber)', fontWeight: 600, marginTop: 2 }}>Waiting {r.waiting}</div>
                </div>
                <Btn kind="primary" size="sm">Open record <Icon name="arrow-right" size={14} /></Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const HRPendingQueueMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--ink-100)' }}>
      <Icon name="chevron-left" size={20} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Pending activation</div>
        <div style={{ fontSize: 11, color: 'var(--status-amber)', fontWeight: 600 }}>4 waiting</div>
      </div>
    </div>
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { n: 'Aisha Mwangi', d: 'Sales · Sales Lead', w: '2 days', av: 'red', i: 'AM' },
        { n: 'Brian Otieno', d: 'Production · Floor Mgr', w: '1 day', av: 'green', i: 'BO' },
        { n: 'Faith Wambui', d: 'Field · Installer', w: '1 day', av: 'purple', i: 'FW' },
        { n: 'Peter Njoroge', d: 'Sales · Estimator', w: '4 hrs', av: 'blue', i: 'PN' },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 10 }}>
          <div className={'av ' + r.av} style={{ width: 38, height: 38, fontSize: 12 }}>{r.i}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{r.d}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--status-amber)', fontWeight: 600, textAlign: 'right' }}>{r.w}</div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
// HR — Employee Profile Form
// ============================================================
const HREmployeeProfile = () => (
  <div style={{ width: '100%', height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
    <BiboTopbar user={{ initials: 'SM', name: 'Sarah Mutua', role: 'HR Manager' }} />
    {/* Top sticky banner */}
    <div style={{ background: 'var(--status-amber-bg)', color: 'var(--status-amber)', padding: '10px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="clock" size={16} /> This account is pending HR activation · waiting 2 days
      </div>
      <div style={{ fontSize: 12 }}>Last edited: 12 min ago by Sarah Mutua</div>
    </div>

    <div className="bibo-body" style={{ height: 'calc(100% - 76px - 41px)' }}>
      <div className="bibo-main" style={{ padding: '24px 36px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 28 }}>

        {/* Left — user summary */}
        <div style={{ background: 'var(--ink-50)', border: '1px solid var(--ink-100)', borderRadius: 12, padding: 22, height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, #E63946, #C82A37)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26 }}>AM</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginTop: 12 }}>Aisha Mwangi</div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>aisha.mwangi@bibo.com</div>
            <span className="status-badge pending" style={{ marginTop: 10 }}><span className="dot"/>Pending HR review</span>
          </div>
          <div style={{ borderTop: '1px solid var(--ink-200)', paddingTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-500)', textTransform: 'uppercase', marginBottom: 8 }}>Personal (read-only)</div>
            {[
              ['Phone', '+254 712 345 678'],
              ['Address', 'Karen, Nairobi'],
              ['Gender', 'Female'],
              ['Emergency', 'Mary Mwangi (Sister)'],
              ['Em. phone', '+254 723 998 211'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '6px 0', borderBottom: '1px dashed var(--ink-200)' }}>
                <span style={{ color: 'var(--ink-500)' }}>{k}</span>
                <span style={{ fontWeight: 500, color: 'var(--ink-900)', maxWidth: 180, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — HR form */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h1 className="workspace-title" style={{ fontSize: 24 }}>Employment record</h1>
              <p className="workspace-sub" style={{ margin: '4px 0 0', fontSize: 12 }}>HR-only fields. Fill required items before activating.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="secondary">Save draft</Btn>
              <Btn kind="primary"><Icon name="check" size={14} />Approve &amp; activate</Btn>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 12, padding: 22, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input label="Employee number *" value="BIBO-0247" trail={<Icon name="check" size={14} stroke="var(--status-green)" />} focused />
              <Input label="Job title *" value="Sales Lead" />
              <Input label="Employment type *" value="Permanent" trail={<Icon name="chevron-down" size={14} />} />
              <Input label="Start date *" value="June 1, 2026" trail={<Icon name="cal" size={14} />} />
              <Input label="Salary grade" value="" placeholder="Optional" trail={<Icon name="chevron-down" size={14} />} />
              <Input label="Reporting manager *" value="John Kamau" trail={<Icon name="user" size={14} />} />
              <Input label="Work location *" value="Nairobi HQ" trail={<Icon name="chevron-down" size={14} />} />
              <Input label="Contract type *" value="Full-time" trail={<Icon name="chevron-down" size={14} />} />
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Contract end date" value="" placeholder="N/A for permanent" trail={<Icon name="cal" size={14} />} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="input-group">
                  <div className="input-label">HR notes (internal)</div>
                  <div className="input" style={{ height: 84, alignItems: 'flex-start', paddingTop: 12, color: 'var(--ink-700)', whiteSpace: 'pre-wrap' }}>Joined from Premium Glazing as Sales Lead. Bringing 4 existing client accounts.</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, padding: '12px 14px', background: 'var(--status-green-bg)', color: 'var(--status-green)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="check" size={16} />
              <div>
                <strong>All required fields are valid.</strong> Approving will set status to <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.5)', padding: '1px 5px', borderRadius: 3 }}>active</code>, send the welcome email, and log to Owen audit.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HREmployeeProfileMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--ink-100)' }}>
      <Icon name="chevron-left" size={20} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Aisha Mwangi</div>
        <div style={{ fontSize: 10, color: 'var(--status-amber)', fontWeight: 600 }}>● Pending HR review</div>
      </div>
    </div>
    <div style={{ background: 'var(--status-amber-bg)', color: 'var(--status-amber)', padding: '8px 16px', fontSize: 11, fontWeight: 500 }}>
      Waiting 2 days
    </div>
    <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div className="av" style={{ width: 48, height: 48, fontSize: 14 }}>AM</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Aisha Mwangi</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>aisha.m@bibo.com · Sales</div>
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-900)' }}>Employment</div>
      <Input label="Employee # *" value="BIBO-0247" focused />
      <Input label="Job title *" value="Sales Lead" />
      <Input label="Employment type *" value="Permanent" trail={<Icon name="chevron-down" size={14} />} />
      <Input label="Start date *" value="June 1, 2026" trail={<Icon name="cal" size={14} />} />
      <Input label="Reporting manager *" value="John Kamau" trail={<Icon name="user" size={14} />} />
    </div>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, background: 'var(--surface)', borderTop: '1px solid var(--ink-100)', display: 'flex', gap: 8 }}>
      <Btn kind="ghost" style={{ flex: 1 }}>Save</Btn>
      <Btn kind="primary" style={{ flex: 2 }}><Icon name="check" size={14} />Approve &amp; activate</Btn>
    </div>
  </div>
);

// ============================================================
// SUMMARY / NEXT STEPS
// ============================================================
const SummarySlide = () => (
  <div className="slide">
    <SlideHeader eyebrow="Wrap-up" title="What we covered & what's next"
      sub="31 slides across desktop and mobile for the complete Bibo onboarding pipeline." num={31} total={31} />
    <div className="stage" style={{ alignItems: 'flex-start', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 20 }}>
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
        {/* Coverage map */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-500)', textTransform: 'uppercase', marginBottom: 14 }}>Coverage by epic</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Authentication', count: 4, items: ['Login (centered)', 'Login (split-screen)', 'Login (minimal)', 'Error + Lockout'], color: 'blue' },
              { name: 'Invitation', count: 2, items: ['Accept Invite', 'Expired / Revoked states'], color: 'purple' },
              { name: 'Profile Onboarding', count: 3, items: ['Wizard', 'Long form', 'Chat-style'], color: 'green' },
              { name: 'Pending HR', count: 3, items: ['Illustration', 'Timeline', 'Minimal'], color: 'amber' },
              { name: 'Workspace + roles', count: 4, items: ['Admin', 'HR Manager', 'Sales/CRM', 'Search overlay'], color: 'red' },
              { name: 'Mobile Workspace', count: 3, items: ['3-column', '4-column', 'Folders'], color: 'red' },
              { name: 'Recovery', count: 3, items: ['Forgot PW', 'Reset PW', 'Recover Email'], color: 'teal' },
              { name: 'Admin', count: 3, items: ['User list', 'Invite drawer', 'Suspend dialog'], color: 'slate' },
              { name: 'HR ops', count: 2, items: ['Pending queue', 'Employee profile'], color: 'pink' },
            ].map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: `var(--tile-${e.color})`, color: `var(--icon-${e.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{e.count}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{e.items.join(' · ')}</div>
                </div>
                <Icon name="check" size={16} stroke="var(--status-green)" strokeWidth={2.5} />
              </div>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-500)', textTransform: 'uppercase', marginBottom: 14 }}>Next steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { num: '01', title: 'Pick a direction per screen', desc: 'Vote on Login layout, Profile flow, Pending HR treatment.' },
              { num: '02', title: 'Real copy + Open Questions', desc: 'Email templates, lockout duration, expiry window, mobile bottom-tab labels.' },
              { num: '03', title: 'Component spec', desc: 'Extract tokens, inputs, banners, tiles into Figma library / Tailwind config.' },
              { num: '04', title: 'Add role matrix', desc: 'Detail which of 15 roles see which of 20 modules — feeds workspace filter.' },
              { num: '05', title: 'States we skipped', desc: 'Empty inbox, no-permissions, mid-upload, validation per field.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--bibo-red)', minWidth: 36 }}>{s.num}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, padding: 16, background: 'var(--bibo-red)', color: 'white', borderRadius: 12, fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Tip — toggle <em>Tweaks</em> on</div>
            Use the panel to flip dark mode, swap any screen between desktop &amp; mobile, and cycle Login variations live.
          </div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  CoverSlide, FlowMap,
  AdminUserList, AdminUserListMobile,
  AdminInviteDrawer, AdminInviteMobile,
  AdminSuspendDialog, AdminSuspendMobile,
  HRPendingQueue, HRPendingQueueMobile,
  HREmployeeProfile, HREmployeeProfileMobile,
  SummarySlide,
});
