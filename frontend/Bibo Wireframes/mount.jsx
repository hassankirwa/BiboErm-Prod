/* Mount React screens into each slide's slot + Tweaks panel */

const { useState, useEffect } = React;

// ---- Shared layout: Desktop + Mobile side-by-side with annotations ----
const SideBySide = ({
  num, total = 31, eyebrow, title, sub, route,
  desktop, mobile,
  desktopLabel = 'DESKTOP', mobileLabel = 'MOBILE',
  desktopWidth = 1180, desktopHeight = 720,
  phoneWidth = 350, phoneHeight = 740,
  device = 'both', // 'both' | 'desktop' | 'mobile'
}) => {
  return (
    <>
      <SlideHeader eyebrow={eyebrow} title={title} sub={sub} num={num} total={total} route={route} />
      <div className="stage" style={{ gap: 40 }}>
        {(device === 'both' || device === 'desktop') && desktop && (
          <DesktopFrame width={desktopWidth} height={desktopHeight} label={desktopLabel}>
            {desktop}
          </DesktopFrame>
        )}
        {(device === 'both' || device === 'mobile') && mobile && (
          <PhoneFrame width={phoneWidth} height={phoneHeight} label={mobileLabel}>
            {mobile}
          </PhoneFrame>
        )}
      </div>
    </>
  );
};

// ---- Mobile-only triple layout ----
const TripleMobile = ({ num, eyebrow, title, sub, items }) => (
  <>
    <SlideHeader eyebrow={eyebrow} title={title} sub={sub} num={num} />
    <div className="stage" style={{ gap: 56, justifyContent: 'center' }}>
      {items.map((it, i) => (
        <PhoneFrame key={i} width={340} height={720} label={it.label}>
          {it.screen}
        </PhoneFrame>
      ))}
    </div>
  </>
);

// ---- Three-up auth variants ----
const ThreeUpDesktopMobile = ({ num, eyebrow, title, sub, items, route }) => (
  <>
    <SlideHeader eyebrow={eyebrow} title={title} sub={sub} num={num} route={route} />
    <div className="stage" style={{ gap: 24, alignItems: 'center', justifyContent: 'center' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <DesktopFrame width={520} height={640} label={null}>{it.desktop}</DesktopFrame>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 600 }}>{it.label}</div>
        </div>
      ))}
    </div>
  </>
);

// ============================================================
// SLIDE BUILDERS — wrap content for each #slide-N
// ============================================================

// 01 Cover
const Slide01 = () => <CoverSlide />;

// 02 Flow map
const Slide02 = () => <FlowMap />;

// 03 Login centered
const Slide03 = () => (
  <SideBySide num={3} eyebrow="Epic 1 · Authentication" title="Login — Centered card"
    sub="Default Bibo login. Brand logo above, ⌘K-friendly inputs, error+lockout states covered next."
    route="/login · POST /auth/login"
    desktop={<div style={{ width: '100%', height: '100%' }}><LoginCentered /></div>}
    mobile={<LoginMobile />}
  />
);

// 04 Login split-screen
const Slide04 = () => (
  <SideBySide num={4} eyebrow="Epic 1 · Authentication" title="Login — Split-screen brand"
    sub="Heavier brand presence — useful for sign-on alongside a marketing pitch."
    route="/login"
    desktop={<LoginSplit />}
    mobile={<LoginSplitMobile />}
  />
);

// 05 Login minimal
const Slide05 = () => (
  <SideBySide num={5} eyebrow="Epic 1 · Authentication" title="Login — Minimal / editorial"
    sub="No card, no chrome — type-led. Treats sign-in like a single conversation."
    route="/login"
    desktop={<LoginMinimal />}
    mobile={<LoginMinimalMobile />}
  />
);

// 06 Login states (error + lockout)
const Slide06 = () => (
  <>
    <SlideHeader num={6} eyebrow="Epic 1 · Authentication" title="Login — Error & lockout states"
      sub="Generic copy (no user enumeration) + 60-second countdown after 5 failed attempts." />
    <div className="stage" style={{ gap: 60, justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <DesktopFrame width={520} height={640}><LoginCentered state="error" /></DesktopFrame>
        <div style={{ fontSize: 14, color: 'var(--ink-500)', fontWeight: 600 }}>Invalid credentials</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <DesktopFrame width={520} height={640}><LoginCentered state="lockout" /></DesktopFrame>
        <div style={{ fontSize: 14, color: 'var(--ink-500)', fontWeight: 600 }}>Account locked · 0:45</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PhoneFrame width={300} height={620}><LoginMobile state="error" /></PhoneFrame>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', fontWeight: 600, textAlign: 'center' }}>Mobile error</div>
      </div>
    </div>
  </>
);

// 07 Accept Invite
const Slide07 = () => (
  <SideBySide num={7} eyebrow="Epic 2 · Invitation" title="Accept Invitation"
    sub="Token-validated. Step 1 of 3 stepper, password strength + live rule checklist."
    route="/accept-invite?token= · POST /auth/accept-invite"
    desktop={<AcceptInvite />}
    mobile={<AcceptInviteMobile />}
    desktopWidth={1100} desktopHeight={760}
  />
);

// 08 Invite expired / revoked
const Slide08 = () => (
  <>
    <SlideHeader num={8} eyebrow="Epic 2 · Invitation · Edge cases" title="Expired & revoked invite states"
      sub="Friendly error patterns — no security-leaking copy. Includes a path back to action." />
    <div className="stage" style={{ gap: 48, justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <DesktopFrame width={520} height={640}><AcceptInvite state="expired" /></DesktopFrame>
        <div style={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 600 }}>Expired (72h elapsed)</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <DesktopFrame width={520} height={640}><AcceptInvite state="revoked" /></DesktopFrame>
        <div style={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 600 }}>Revoked by admin</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <PhoneFrame width={300} height={620}><AcceptInviteMobile state="expired" /></PhoneFrame>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', fontWeight: 600 }}>Mobile expired</div>
      </div>
    </div>
  </>
);

// 09 Profile wizard
const Slide09 = () => (
  <SideBySide num={9} eyebrow="Epic 3 · Profile Onboarding" title="Profile — Multi-step wizard"
    sub="Default: 3-step stepper, grouped fields, draft auto-save, sticky CTA on mobile."
    route="/onboarding/profile · PUT /profile"
    desktop={<ProfileWizard />}
    mobile={<ProfileWizardMobile />}
    desktopWidth={1100} desktopHeight={760}
  />
);

// 10 Profile long form
const Slide10 = () => (
  <SideBySide num={10} eyebrow="Epic 3 · Profile Onboarding · Variation" title="Profile — Single long form"
    sub="One page, scrollable, progress bar shows percent. Power-user friendly."
    route="/onboarding/profile"
    desktop={<ProfileLongForm />}
    mobile={<ProfileLongFormMobile />}
    desktopWidth={1100} desktopHeight={780}
  />
);

// 11 Profile chat
const Slide11 = () => (
  <SideBySide num={11} eyebrow="Epic 3 · Profile Onboarding · Variation" title="Profile — Conversational"
    sub="Bibo Assistant collects answers one question at a time. Quick chip-replies + free text."
    route="/onboarding/profile"
    desktop={<ProfileChat />}
    mobile={<ProfileChatMobile />}
    desktopWidth={1100} desktopHeight={760}
  />
);

// 12 Pending HR illustration
const Slide12 = () => (
  <SideBySide num={12} eyebrow="Epic 3 · Pending HR · Variation" title="Pending HR — Illustration"
    sub="Friendly waiting screen. Inline SLA, support email, silent auto-poll."
    route="/onboarding/pending-hr · GET /auth/me (poll)"
    desktop={<PendingHRIllustration />}
    mobile={<PendingHRIllustrationMobile />}
  />
);

// 13 Pending HR timeline
const Slide13 = () => (
  <SideBySide num={13} eyebrow="Epic 3 · Pending HR · Variation" title="Pending HR — Timeline"
    sub="Shows the whole journey + who is reviewing right now. Adds reassurance through transparency."
    route="/onboarding/pending-hr"
    desktop={<PendingHRTimeline />}
    mobile={<PendingHRTimelineMobile />}
  />
);

// 14 Pending HR minimal
const Slide14 = () => (
  <SideBySide num={14} eyebrow="Epic 3 · Pending HR · Variation" title="Pending HR — Minimal"
    sub="Quiet, typographic treatment. Best when the workspace itself is highly visual."
    route="/onboarding/pending-hr"
    desktop={<PendingHRMinimal />}
    mobile={<PendingHRMinimalMobile />}
  />
);

// 15 Workspace — System Admin
const Slide15 = () => (
  <SideBySide num={15} eyebrow="Epic 1 · Workspace" title="Workspace — System Admin"
    sub="Full module access for John Kamau. Mirrors the supplied reference exactly."
    route="/workspace · GET /auth/me"
    desktop={<WorkspaceDesktop user={{ initials: 'JK', name: 'John Kamau', role: 'System Admin' }} role="admin" />}
    mobile={<MobileWorkspace3Col user={{ initials: 'JK', name: 'John' }} />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 16 Workspace — HR Manager
const Slide16 = () => (
  <SideBySide num={16} eyebrow="Epic 1 · Workspace · Role" title="Workspace — HR Manager"
    sub="Modules outside HR access are visually de-emphasized + tagged 'No access'. Sarah sees HR, Reports, Contacts."
    route="/workspace"
    desktop={<WorkspaceDesktop user={{ initials: 'SM', name: 'Sarah Mutua', role: 'HR Manager' }} role="hr" greeting="Welcome back, Sarah" />}
    mobile={<MobileWorkspace3Col user={{ initials: 'SM', name: 'Sarah' }} />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 17 Workspace — Sales/CRM role
const Slide17 = () => (
  <SideBySide num={17} eyebrow="Epic 1 · Workspace · Role" title="Workspace — Sales Lead"
    sub="Aisha sees CRM, Quotes, Projects, Client Portal. Production / Finance / IT modules locked."
    route="/workspace"
    desktop={<WorkspaceDesktop user={{ initials: 'AM', name: 'Aisha Mwangi', role: 'Sales Lead' }} role="sales" greeting="Welcome back, Aisha" />}
    mobile={<MobileWorkspace3Col user={{ initials: 'AM', name: 'Aisha' }} />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 18 Workspace search overlay
const Slide18 = () => (
  <SideBySide num={18} eyebrow="Epic 1 · Workspace" title="Workspace — Command palette (⌘K)"
    sub="Universal search across modules, projects, clients, documents + quick actions."
    route="/workspace"
    desktop={<WorkspaceDesktop user={{ initials: 'JK', name: 'John Kamau', role: 'System Admin' }} role="admin" showSearch />}
    mobile={<MobileWorkspace3Col user={{ initials: 'JK', name: 'John' }} />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 19 Mobile Workspace 3-col
const Slide19 = () => (
  <>
    <SlideHeader num={19} eyebrow="Mobile · Workspace · Variation" title="Mobile Workspace — 3-column grid"
      sub="Default. Larger tiles, badge counts visible, single-handed reachable, named &lsquo;Your Apps&rsquo;." />
    <div className="stage" style={{ gap: 80, justifyContent: 'center' }}>
      <PhoneFrame width={380} height={820}><MobileWorkspace3Col user={{ initials: 'JK', name: 'John' }} /></PhoneFrame>
      <div style={{ width: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[
          ['Tile size', 'Aspect-ratio 1:1, ~110px wide on a 6.1" device. Hits Apple HIG min target (44pt × 44pt).'],
          ['Badges', 'Numeric counts mirror the desktop tile metadata — &ldquo;12&rdquo;, &ldquo;3&rdquo;, &ldquo;4&rdquo;.'],
          ['Bottom tab', 'Workspace / Favorites / Recent / Profile — same hierarchy as the desktop sidebar.'],
          ['Pull-to-refresh', 'Subtle elastic stretch at top of grid syncs latest counts.'],
          ['Section header', '&ldquo;Your Apps&rdquo; with &ldquo;Edit&rdquo; affordance for reorder mode.'],
        ].map(([h, t], i) => (
          <div key={i} style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bibo-red)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{h}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: t }} />
          </div>
        ))}
      </div>
    </div>
  </>
);

// 20 Mobile Workspace 4-col
const Slide20 = () => (
  <>
    <SlideHeader num={20} eyebrow="Mobile · Workspace · Variation" title="Mobile Workspace — 4-column dense"
      sub="More modules above the fold. Trades label space for surface — best for power users." />
    <div className="stage" style={{ gap: 80, justifyContent: 'center' }}>
      <PhoneFrame width={380} height={820}><MobileWorkspace4Col user={{ initials: 'JK', name: 'John' }} /></PhoneFrame>
      <div style={{ width: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[
          ['Density', '16 tiles above the fold vs 9 in 3-col. Closer to an iOS Home Screen mental model.'],
          ['Label length', 'Short names work; &ldquo;Project Management&rdquo; truncates — see Folders variant.'],
          ['Trade-off', 'Badges become harder to scan. Recommend reserving for &le; 3 modules at a time.'],
          ['When to use', 'Roles with broad access (Admin, Ops Manager) where breadth matters more than tap accuracy.'],
        ].map(([h, t], i) => (
          <div key={i} style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bibo-red)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{h}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: t }} />
          </div>
        ))}
      </div>
    </div>
  </>
);

// 21 Mobile Workspace folders
const Slide21 = () => (
  <>
    <SlideHeader num={21} eyebrow="Mobile · Workspace · Variation" title="Mobile Workspace — Grouped folders"
      sub="Department-led organization. 3 hero shortcuts + 4 folders covering all 20 modules." />
    <div className="stage" style={{ gap: 80, justifyContent: 'center' }}>
      <PhoneFrame width={380} height={820}><MobileWorkspaceFolders user={{ initials: 'JK', name: 'John' }} /></PhoneFrame>
      <div style={{ width: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[
          ['Hero shortcuts', 'Top row pinned by user — most-used 3 tiles, always visible.'],
          ['Folders', 'Sales / Production / Operations / Back office. Each opens to a sub-grid.'],
          ['Discoverability', 'Best when org has many seldom-used modules but each user has a clear daily routine.'],
          ['Customization', 'Users can drag tiles between folders + rename. Falls back to defaults per role.'],
        ].map(([h, t], i) => (
          <div key={i} style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--ink-100)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bibo-red)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{h}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: t }} />
          </div>
        ))}
      </div>
    </div>
  </>
);

// 22 Forgot Password
const Slide22 = () => (
  <SideBySide num={22} eyebrow="Epic 5 · Recovery" title="Forgot Password"
    sub="Generic response (no email enumeration). 60-min reset token expiry."
    route="/forgot-password · POST /auth/forgot-password"
    desktop={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', height: '100%' }}>
      <ForgotPassword /><ForgotPassword submitted />
    </div>}
    mobile={<ForgotPasswordMobile />}
  />
);

// 23 Reset Password
const Slide23 = () => (
  <SideBySide num={23} eyebrow="Epic 5 · Recovery" title="Reset Password"
    sub="Token-validated link. Strength meter + per-rule checklist. Token rotates on success."
    route="/reset-password?token= · POST /auth/reset-password"
    desktop={<ResetPassword />}
    mobile={<ResetPasswordMobile />}
  />
);

// 24 Recover Email
const Slide24 = () => (
  <SideBySide num={24} eyebrow="Epic 5 · Recovery" title="Recover Email"
    sub="Employee number → email sent to the registered address. Generic confirmation."
    route="/recover-email · POST /auth/recover-email"
    desktop={<RecoverEmail />}
    mobile={<RecoverEmailMobile />}
  />
);

// 25 Admin User List
const Slide25 = () => (
  <SideBySide num={25} eyebrow="Epic 6 · Admin" title="Admin — User list"
    sub="Status-coded rows. Filter + search. Actions adapt to status (Resend/Revoke for invited, etc)."
    route="/admin/users · GET /admin/users"
    desktop={<AdminUserList />}
    mobile={<AdminUserListMobile />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 26 Admin Invite Drawer
const Slide26 = () => (
  <SideBySide num={26} eyebrow="Epic 2 · Admin" title="Admin — Invite user"
    sub="Right-slide drawer. Dept-filtered roles. Explicit no-password notice. Logged to Owen audit."
    route="/admin/users/invite · POST /admin/users/invite"
    desktop={<AdminInviteDrawer />}
    mobile={<AdminInviteMobile />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 27 Admin Suspend dialog
const Slide27 = () => (
  <SideBySide num={27} eyebrow="Epic 6 · Admin" title="Admin — Suspend & reinstate"
    sub="Confirmation dialog with affected scope. Clears refresh tokens immediately. Reversible."
    route="POST /admin/users/:id/suspend"
    desktop={<AdminSuspendDialog />}
    mobile={<AdminSuspendMobile />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 28 HR Pending Queue
const Slide28 = () => (
  <SideBySide num={28} eyebrow="Epic 4 · HR" title="HR — Pending activation queue"
    sub="HR-only view. Cards prioritize by waiting time. Side stat strip shows team velocity + SLA."
    route="/hr/pending-activation · GET /hr/employees?status=pending_hr_review"
    desktop={<HRPendingQueue />}
    mobile={<HRPendingQueueMobile />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 29 HR Employee Profile
const Slide29 = () => (
  <SideBySide num={29} eyebrow="Epic 4 · HR" title="HR — Employee profile form"
    sub="Split: read-only personal (left) + editable employment (right). Approve & activate is the gate to active status."
    route="/hr/employees/:userId · PUT /hr/employees/:userId"
    desktop={<HREmployeeProfile />}
    mobile={<HREmployeeProfileMobile />}
    desktopWidth={1380} desktopHeight={820}
    phoneWidth={310} phoneHeight={680}
  />
);

// 30 Access Denied
const Slide30 = () => (
  <SideBySide num={30} eyebrow="Edge case · Suspended / Inactive" title="Access denied — suspended / inactive"
    sub="Terminal screen for blocked users. Surfaces account context + direct support path. No retry."
    route="/access-denied"
    desktop={<AccessDenied />}
    mobile={<AccessDeniedMobile />}
  />
);

// 31 Summary
const Slide31 = () => <SummarySlide />;

// ============================================================
// MOUNTING
// ============================================================
const SLIDES = [
  Slide01, Slide02, Slide03, Slide04, Slide05, Slide06, Slide07, Slide08, Slide09, Slide10,
  Slide11, Slide12, Slide13, Slide14, Slide15, Slide16, Slide17, Slide18, Slide19, Slide20,
  Slide21, Slide22, Slide23, Slide24, Slide25, Slide26, Slide27, Slide28, Slide29, Slide30, Slide31,
];

SLIDES.forEach((Slide, i) => {
  const idx = String(i + 1).padStart(2, '0');
  const el = document.getElementById('slide-' + idx);
  if (el) {
    const root = ReactDOM.createRoot(el);
    root.render(<Slide />);
  }
});

// ============================================================
// TWEAKS PANEL
// ============================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkMode": false
}/*EDITMODE-END*/;

const Tweaks = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.darkMode ? 'dark' : 'light');
  }, [tweaks.darkMode]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Appearance">
        <TweakToggle label="Dark mode" value={tweaks.darkMode} onChange={v => setTweak('darkMode', v)} />
      </TweakSection>
      <TweakSection title="Navigate">
        <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
          Use the slide-rail at the right edge of the screen to jump between screens, or use ← / → arrow keys.
        </div>
      </TweakSection>
      <TweakSection title="Print">
        <TweakButton onClick={() => window.print()}>Save deck as PDF</TweakButton>
      </TweakSection>
    </TweaksPanel>
  );
};

const tweaksRoot = ReactDOM.createRoot(document.getElementById('tweaks-root'));
tweaksRoot.render(<Tweaks />);
