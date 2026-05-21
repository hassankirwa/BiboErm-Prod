/* Bibo shared components - icons, logos, frames */

// ---------- Bibo logo mark (SVG door icon) ----------
const BiboLogoMark = ({ size = 38 }) => (
  <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true">
    {/* Door frame red */}
    <rect x="3" y="6" width="22" height="48" rx="1.5" fill="#E63946" />
    {/* Door inner */}
    <rect x="6" y="9" width="16" height="42" rx="0.5" fill="#FFFFFF" />
    {/* Open door swung */}
    <path d="M22 9 L42 14 L42 51 L22 51 Z" fill="#E63946" />
    <path d="M24 12 L40 16 L40 49 L24 49 Z" fill="#BFE3F4" />
    {/* Glass divider */}
    <line x1="32" y1="14" x2="32" y2="50" stroke="#FFFFFF" strokeWidth="1.2" />
    <line x1="24" y1="32" x2="40" y2="32" stroke="#FFFFFF" strokeWidth="1.2" />
    {/* Handle */}
    <circle cx="25" cy="32" r="1.5" fill="#1F2937" />
  </svg>
);

const BiboLogoLockup = ({ scale = 1, dark = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 * scale }}>
    <BiboLogoMark size={36 * scale} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 24 * scale,
        letterSpacing: '-0.01em',
        color: 'var(--ink-900)'
      }}>BIBO</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 8 * scale,
        letterSpacing: '0.18em',
        color: 'var(--ink-700)',
        marginTop: 3 * scale
      }}>WINDOWS &amp; DOORS</div>
    </div>
  </div>
);

// ---------- Icon set (line, 22px) ----------
const Icon = ({ name, size = 20, stroke = 'currentColor', strokeWidth = 1.7, fill = 'none' }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>;
    case 'bell': return <svg {...props}><path d="M6 8a6 6 0 1112 0c0 5 2 7 2 7H4s2-2 2-7z"/><path d="M10 19a2 2 0 004 0"/></svg>;
    case 'chat': return <svg {...props}><path d="M21 12a8 8 0 11-3-6.2L21 5l-1 3.5A8 8 0 0121 12z"/></svg>;
    case 'help': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>;
    case 'chevron-down': return <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>;
    case 'chevron-right': return <svg {...props}><polyline points="9 6 15 12 9 18"/></svg>;
    case 'chevron-left': return <svg {...props}><polyline points="15 6 9 12 15 18"/></svg>;
    case 'grid': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'star': return <svg {...props}><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>;
    case 'clock': return <svg {...props}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>;
    case 'pin': return <svg {...props}><path d="M12 2l3 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z"/></svg>;
    case 'gear': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.4 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.4 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.4l-.1.1A2 2 0 113.1 17l.1-.1a1.7 1.7 0 00.4-1.9 1.7 1.7 0 00-1.5-1H2a2 2 0 010-4h.1A1.7 1.7 0 003.6 9a1.7 1.7 0 00-.4-1.9l-.1-.1A2 2 0 117 4.2l.1.1a1.7 1.7 0 001.9.4H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.4l.1-.1A2 2 0 1119.8 7l-.1.1a1.7 1.7 0 00-.4 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
    case 'life-ring': return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><line x1="5.5" y1="5.5" x2="9.5" y2="9.5"/><line x1="14.5" y1="14.5" x2="18.5" y2="18.5"/><line x1="14.5" y1="9.5" x2="18.5" y2="5.5"/><line x1="5.5" y1="18.5" x2="9.5" y2="14.5"/></svg>;
    case 'eye': return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off': return <svg {...props}><path d="M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18 18 0 014.3-5.1"/><path d="M9.9 5a10 10 0 012.1-.2c7 0 11 8 11 8a18 18 0 01-2.6 3.6"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
    case 'mail': return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>;
    case 'lock': return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>;
    case 'user': return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>;
    case 'users': return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0114 0"/><path d="M16 4a3.5 3.5 0 010 7"/><path d="M22 20a7 7 0 00-5-6.7"/></svg>;
    case 'phone': return <svg {...props}><path d="M22 16.92V20a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3.08a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>;
    case 'building': return <svg {...props}><rect x="4" y="3" width="16" height="18" rx="1"/><line x1="8" y1="7" x2="10" y2="7"/><line x1="14" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="10" y2="11"/><line x1="14" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="16" y2="15"/><path d="M10 21v-4h4v4"/></svg>;
    case 'briefcase': return <svg {...props}><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
    case 'folder': return <svg {...props}><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>;
    case 'calc': return <svg {...props}><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="7" y="5" width="10" height="3" rx="0.5"/><circle cx="8.5" cy="12" r=".7" fill="currentColor"/><circle cx="12" cy="12" r=".7" fill="currentColor"/><circle cx="15.5" cy="12" r=".7" fill="currentColor"/><circle cx="8.5" cy="15.5" r=".7" fill="currentColor"/><circle cx="12" cy="15.5" r=".7" fill="currentColor"/><circle cx="15.5" cy="15.5" r=".7" fill="currentColor"/><circle cx="8.5" cy="18.5" r=".7" fill="currentColor"/></svg>;
    case 'cube': return <svg {...props}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5"/><path d="M12 12l-8-4.5"/><path d="M12 12v9"/></svg>;
    case 'truck': return <svg {...props}><rect x="2" y="7" width="12" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case 'doc': return <svg {...props}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>;
    case 'cal': return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>;
    case 'shield': return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><polyline points="9 12 11 14 15 10"/></svg>;
    case 'shield-x': return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>;
    case 'tag': return <svg {...props}><path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V5a2 2 0 012-2h8l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>;
    case 'pie': return <svg {...props}><path d="M12 2v10l8.5 4.5A10 10 0 1112 2z"/></svg>;
    case 'chart': return <svg {...props}><line x1="4" y1="20" x2="20" y2="20"/><polyline points="6 16 10 12 14 14 18 8"/></svg>;
    case 'scissors': return <svg {...props}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.5" y2="15.5"/><line x1="14" y1="14" x2="20" y2="20"/><line x1="8.5" y1="8.5" x2="11" y2="11"/></svg>;
    case 'factory': return <svg {...props}><path d="M3 21V11l5 3V11l5 3V8l8 5v8z"/><line x1="7" y1="17" x2="7" y2="17.5"/><line x1="12" y1="17" x2="12" y2="17.5"/><line x1="17" y1="17" x2="17" y2="17.5"/></svg>;
    case 'wrench': return <svg {...props}><path d="M14 7a4 4 0 015 5l-9 9-5-1-1-5 9-9a4 4 0 011 1z"/></svg>;
    case 'money': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 00-3-1.5c-1.7 0-3 1-3 2.3 0 1.4 1.3 2 3 2.4 1.7.4 3 1 3 2.4 0 1.3-1.3 2.3-3 2.3a3 3 0 01-3-1.5"/><line x1="12" y1="7" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="17"/></svg>;
    case 'hr': return <svg {...props}><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20a6 6 0 0112 0"/><path d="M12 20a6 6 0 0110 0"/></svg>;
    case 'globe': return <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>;
    case 'warehouse': return <svg {...props}><path d="M3 21V9l9-5 9 5v12"/><rect x="7" y="13" width="10" height="8"/><line x1="7" y1="17" x2="17" y2="17"/></svg>;
    case 'plus': return <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'check': return <svg {...props}><polyline points="5 12 10 17 19 7"/></svg>;
    case 'x': return <svg {...props}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>;
    case 'arrow-right': return <svg {...props}><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></svg>;
    case 'arrow-left': return <svg {...props}><line x1="20" y1="12" x2="4" y2="12"/><polyline points="10 6 4 12 10 18"/></svg>;
    case 'camera': return <svg {...props}><path d="M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>;
    case 'filter': return <svg {...props}><polygon points="3 4 21 4 14 13 14 20 10 20 10 13"/></svg>;
    case 'more': return <svg {...props}><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></svg>;
    case 'pause': return <svg {...props}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>;
    case 'refresh': return <svg {...props}><polyline points="4 4 4 10 10 10"/><polyline points="20 20 20 14 14 14"/><path d="M5 14a8 8 0 0014 4M19 10a8 8 0 00-14-4"/></svg>;
    case 'send': return <svg {...props}><polyline points="3 12 21 3 14 21 11 13 3 12"/></svg>;
    case 'wifi': return <svg {...props}><path d="M2 8.5a16 16 0 0120 0"/><path d="M5 12a11 11 0 0114 0"/><path d="M8.5 15.5a6 6 0 017 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
    case 'battery': return <svg {...props}><rect x="2" y="8" width="18" height="8" rx="2"/><rect x="20" y="10" width="2" height="4" rx="0.5" fill="currentColor"/><rect x="4" y="10" width="12" height="4" fill="currentColor" stroke="none"/></svg>;
    case 'signal': return <svg {...props}><rect x="3" y="14" width="3" height="4" rx="0.5" fill="currentColor" stroke="none"/><rect x="9" y="10" width="3" height="8" rx="0.5" fill="currentColor" stroke="none"/><rect x="15" y="6" width="3" height="12" rx="0.5" fill="currentColor" stroke="none"/></svg>;
    case 'menu': return <svg {...props}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
    case 'home': return <svg {...props}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
    case 'list': return <svg {...props}><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>;
    case 'arrow-down': return <svg {...props}><line x1="12" y1="4" x2="12" y2="20"/><polyline points="6 14 12 20 18 14"/></svg>;
    default: return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
  }
};

// ---------- Module list shared between desktop and mobile ----------
const MODULES = [
  { key: 'crm', name: 'CRM', icon: 'users', color: 'blue', meta: { text: '12 New Leads', tone: 'blue' }, roles: ['admin','sales','hr','ops'] },
  { key: 'field', name: 'Field Day', icon: 'cal', color: 'green', roles: ['admin','sales','field','ops'] },
  { key: 'pm', name: 'Project Management', icon: 'folder', color: 'purple', roles: ['admin','ops','sales','field'] },
  { key: 'est', name: 'Estimations', icon: 'calc', color: 'amber', roles: ['admin','sales','ops'] },
  { key: 'wh', name: 'Warehouse', icon: 'warehouse', color: 'orange', meta: { text: '3 Low Stock', tone: 'amber' }, roles: ['admin','wh','ops'] },
  { key: 'cont', name: 'Contacts', icon: 'user', color: 'purple', roles: ['admin','sales','hr','ops'] },
  { key: 'proj', name: 'Projects', icon: 'briefcase', color: 'red', meta: { text: '8 Active Jobs', tone: 'red' }, roles: ['admin','sales','field','ops'] },
  { key: 'bom', name: 'BOM', icon: 'cube', color: 'teal', roles: ['admin','est','prod','ops'] },
  { key: 'quote', name: 'Quotes', icon: 'doc', color: 'red', meta: { text: '5 Pending', tone: 'red' }, roles: ['admin','sales','ops'] },
  { key: 'off', name: 'Offcuts', icon: 'scissors', color: 'orange', roles: ['admin','prod','wh'] },
  { key: 'proc', name: 'Procurement', icon: 'money', color: 'green', meta: { text: '4 Pending', tone: 'red' }, roles: ['admin','ops','wh'] },
  { key: 'prod', name: 'Production', icon: 'factory', color: 'red', meta: { text: '4 Delayed', tone: 'red' }, roles: ['admin','prod','ops'] },
  { key: 'qc', name: 'Quality Control', icon: 'shield', color: 'green', roles: ['admin','prod','ops'] },
  { key: 'disp', name: 'Dispatch', icon: 'truck', color: 'purple', meta: { text: '2 Today', tone: 'blue' }, roles: ['admin','ops','field'] },
  { key: 'inst', name: 'Installation', icon: 'wrench', color: 'blue', meta: { text: '5 Scheduled', tone: 'blue' }, roles: ['admin','field','ops'] },
  { key: 'fin', name: 'Finance', icon: 'money', color: 'green', meta: { text: '2 Overdue', tone: 'red' }, roles: ['admin','fin'] },
  { key: 'hr', name: 'HR', icon: 'hr', color: 'pink', meta: { text: '1 On Leave', tone: 'amber' }, roles: ['admin','hr'] },
  { key: 'rep', name: 'Reports', icon: 'chart', color: 'amber', roles: ['admin','ops','fin','hr'] },
  { key: 'cli', name: 'Client Portal', icon: 'globe', color: 'teal', roles: ['admin','sales','ops'] },
  { key: 'it', name: 'IT Admin', icon: 'shield', color: 'slate', roles: ['admin'] },
];

// Module tile (desktop)
const ModuleTile = ({ m, locked = false }) => (
  <div className={'module-card' + (locked ? ' locked' : '')}>
    <div className="module-icon" style={{ background: `var(--tile-${m.color})`, color: `var(--icon-${m.color})` }}>
      <Icon name={m.icon} size={22} />
    </div>
    <div className="module-text">
      <div className="module-name">{m.name}</div>
      {m.meta && !locked && <div className={'module-meta ' + m.meta.tone}>{m.meta.text}</div>}
    </div>
    {locked && <div className="lock-pill">No access</div>}
  </div>
);

// Mobile tile (square)
const MobileTile = ({ m, locked = false, badge = null }) => (
  <div className={'m-tile' + (locked ? ' locked' : '')}>
    <div className="ic-bg" style={{ background: `var(--tile-${m.color})`, color: `var(--icon-${m.color})` }}>
      <Icon name={m.icon} size={22} />
    </div>
    <div className="name">{m.name}</div>
    {badge && <div className="dot">{badge}</div>}
  </div>
);

// ---------- Bibo desktop chrome (header + sidebar) ----------
const BiboTopbar = ({ user = { name: 'John Kamau', role: 'System Admin', initials: 'JK' }, showSearchOverlay = false }) => (
  <div className="bibo-topbar">
    <BiboLogoLockup scale={0.95} />
    <div className="topbar-search">
      <Icon name="search" size={18} />
      <span>Search projects, clients, documents...</span>
      <span className="kbd">⌘K</span>
    </div>
    <div className="topbar-actions">
      <div className="topbar-icon">
        <Icon name="bell" size={20} />
        <span className="badge">7</span>
      </div>
      <div className="topbar-icon">
        <Icon name="chat" size={20} />
        <span className="badge">3</span>
      </div>
      <div className="topbar-icon">
        <Icon name="help" size={20} />
      </div>
      <div className="topbar-user">
        <div className="avatar">{user.initials}</div>
        <div>
          <div className="name">{user.name}</div>
          <div className="role">{user.role}</div>
        </div>
        <Icon name="chevron-down" size={14} />
      </div>
    </div>
  </div>
);

const BiboSidebar = ({ active = 'workspace' }) => (
  <aside className="bibo-side">
    <div className={'side-item' + (active === 'workspace' ? ' active' : '')}>
      <span className="side-icon"><Icon name="grid" size={18} /></span>
      Workspace
    </div>
    <div className={'side-item' + (active === 'fav' ? ' active' : '')}>
      <span className="side-icon"><Icon name="star" size={18} /></span>
      Favorites
    </div>
    <div className={'side-item' + (active === 'recent' ? ' active' : '')}>
      <span className="side-icon"><Icon name="clock" size={18} /></span>
      Recent
    </div>
    <div className={'side-item' + (active === 'pin' ? ' active' : '')}>
      <span className="side-icon"><Icon name="pin" size={18} /></span>
      Pinned
    </div>
    <div className="side-divider" />
    <div className={'side-item' + (active === 'settings' ? ' active' : '')}>
      <span className="side-icon"><Icon name="gear" size={18} /></span>
      Settings
    </div>
    <div className={'side-item' + (active === 'help' ? ' active' : '')}>
      <span className="side-icon"><Icon name="life-ring" size={18} /></span>
      Help Center
    </div>
    <div className="side-bottom">
      <div className="side-item">
        <span className="side-icon"><Icon name="chevron-left" size={16} /></span>
        Collapse
      </div>
    </div>
  </aside>
);

// ---------- Frames ----------
const DesktopFrame = ({ width = 1280, height = 800, children, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
    <div className="desktop-frame" style={{ width: width + 28 }}>
      <div className="traffic"><span/><span/><span/></div>
      <div className="desktop-screen" style={{ width, height }}>
        {children}
      </div>
    </div>
    {label && <div style={{ fontSize: 20, color: 'var(--ink-500)', fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>}
  </div>
);

const PhoneFrame = ({ width = 360, height = 760, children, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
    <div className="phone-frame" style={{ width: width + 24, height: height + 24 }}>
      <div className="phone-screen" style={{ width, height }}>
        {children}
      </div>
    </div>
    {label && <div style={{ fontSize: 20, color: 'var(--ink-500)', fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>}
  </div>
);

const PhoneStatusBar = () => (
  <div className="phone-statusbar">
    <span>9:41</span>
    <div className="right">
      <Icon name="signal" size={14} />
      <Icon name="wifi" size={14} />
      <Icon name="battery" size={18} />
    </div>
  </div>
);

// Mobile bottom tab bar
const MobileTabBar = ({ active = 'workspace' }) => (
  <div className="m-tabbar">
    {[
      { k: 'workspace', i: 'grid', l: 'Workspace' },
      { k: 'fav', i: 'star', l: 'Favorites' },
      { k: 'recent', i: 'clock', l: 'Recent' },
      { k: 'profile', i: 'user', l: 'Profile' },
    ].map(t => (
      <div key={t.k} className={'m-tab' + (active === t.k ? ' active' : '')}>
        <div className="ic-wrap"><Icon name={t.i} size={20} strokeWidth={active === t.k ? 2 : 1.7} /></div>
        <div>{t.l}</div>
      </div>
    ))}
  </div>
);

// Mobile topbar
const MobileTopBar = ({ name = 'JK', notifBadge = '7', chatBadge = '3' }) => (
  <div className="m-topbar">
    <BiboLogoMark size={32} />
    <div className="actions">
      <div className="ic">
        <Icon name="bell" size={18} />
        {notifBadge && <span className="badge">{notifBadge}</span>}
      </div>
      <div className="ic">
        <Icon name="chat" size={18} />
        {chatBadge && <span className="badge">{chatBadge}</span>}
      </div>
      <div className="ic" style={{ background: 'linear-gradient(135deg,#6B4226,#3B2419)', color: 'white' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{name}</span>
      </div>
    </div>
  </div>
);

// ---------- Slide header ----------
const SlideHeader = ({ eyebrow, title, sub, num, total = 28, route }) => (
  <div className="slide-header">
    <div>
      <div className="slide-eyebrow">{eyebrow}</div>
      <h2 className="slide-title">{title}</h2>
      {sub && <p className="slide-sub">{sub}</p>}
    </div>
    <div className="slide-meta">
      <div className="num">{String(num).padStart(2,'0')} / {String(total).padStart(2,'0')}</div>
      {route && <div className="route">{route}</div>}
    </div>
  </div>
);

// ---------- Buttons & form atoms ----------
const Input = ({ label, value, placeholder, focused, error, trail, type = 'text' }) => (
  <div className="input-group">
    {label && <div className="input-label">{label}</div>}
    <div className="input-wrap">
      <div className={'input' + (focused ? ' focused' : '') + (error ? ' error' : '')}>
        {value ? <span>{value}</span> : <span className="placeholder">{placeholder}</span>}
      </div>
      {trail && <div className="trail">{trail}</div>}
    </div>
  </div>
);

const Btn = ({ kind = 'primary', children, disabled, size, full = false, style = {} }) => (
  <button
    className={['btn', 'btn-' + kind, size ? 'btn-' + size : '', disabled ? 'disabled' : ''].join(' ')}
    style={{ width: full ? '100%' : 'auto', ...style }}
    disabled={disabled}
  >{children}</button>
);

// Expose everything globally for other scripts
Object.assign(window, {
  BiboLogoMark, BiboLogoLockup, Icon, MODULES, ModuleTile, MobileTile,
  BiboTopbar, BiboSidebar, DesktopFrame, PhoneFrame, PhoneStatusBar,
  MobileTabBar, MobileTopBar, SlideHeader, Input, Btn,
});
