/* Auth screens: Login (3 layouts), Accept Invite, error states, recovery, access denied */

// ============================================================
// LOGIN — Centered card (default)
// ============================================================
const LoginCentered = ({ state = 'default' }) => (
  <div className="auth-bg">
    <div className="auth-card">
      <div className="auth-logo">
        <BiboLogoLockup scale={1.1} />
      </div>
      <h1 className="auth-h">Welcome back</h1>
      <p className="auth-sub">Sign in to your Bibo workspace</p>

      {state === 'error' && (
        <div className="banner error">
          <Icon name="x" size={16} />
          <div>
            <div>Invalid email or password.</div>
            <div style={{ fontSize: 11, opacity: .8, marginTop: 2, fontWeight: 400 }}>2 attempts remaining before lockout.</div>
          </div>
        </div>
      )}

      {state === 'lockout' && (
        <div className="banner warning">
          <Icon name="lock" size={16} />
          <div>
            <div>Too many failed attempts.</div>
            <div style={{ fontSize: 11, opacity: .85, marginTop: 2, fontWeight: 400 }}>Try again in <strong>0:45</strong></div>
          </div>
        </div>
      )}

      <Input
        label="Email address"
        value={state === 'error' || state === 'lockout' ? 'john.kamau@bibo.com' : ''}
        placeholder="you@bibo.com"
        focused={state === 'default'}
        error={state === 'error'}
        trail={<Icon name="mail" size={16} />}
      />
      <Input
        label="Password"
        value={state === 'error' ? '••••••••' : ''}
        placeholder="Enter your password"
        type="password"
        error={state === 'error'}
        trail={<Icon name="eye" size={16} />}
      />

      <Btn kind="primary" full disabled={state === 'lockout'}>
        {state === 'lockout' ? 'Locked — 0:45' : 'Sign In'}
        {state !== 'lockout' && <Icon name="arrow-right" size={16} />}
      </Btn>

      <div className="auth-footer-links">
        <a href="#">Forgot password?</a>
        <a href="#">Recover email</a>
      </div>
    </div>
  </div>
);

// LOGIN — mobile
const LoginMobile = ({ state = 'default' }) => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth brand">
      <div className="m-auth-logo">
        <BiboLogoLockup scale={1.1} />
      </div>
      <h1 className="m-auth-h">Welcome back</h1>
      <p className="m-auth-sub">Sign in to your Bibo workspace</p>

      {state === 'error' && (
        <div className="banner error" style={{ marginBottom: 14 }}>
          <Icon name="x" size={14} />
          <div style={{ fontSize: 12 }}>Invalid email or password.</div>
        </div>
      )}
      {state === 'lockout' && (
        <div className="banner warning" style={{ marginBottom: 14 }}>
          <Icon name="lock" size={14} />
          <div style={{ fontSize: 12 }}>Locked. Try again in <strong>0:45</strong></div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Email" value={state !== 'default' ? 'john.kamau@bibo.com' : ''} placeholder="you@bibo.com" focused={state === 'default'} trail={<Icon name="mail" size={16} />} error={state === 'error'} />
        <Input label="Password" value={state === 'error' ? '••••••••' : ''} placeholder="Enter password" trail={<Icon name="eye" size={16} />} error={state === 'error'} />
        <Btn kind="primary" full disabled={state === 'lockout'} style={{ marginTop: 6 }}>
          {state === 'lockout' ? 'Locked — 0:45' : 'Sign In'}
        </Btn>
        <div className="auth-footer-links">
          <a href="#">Forgot password?</a>
          <a href="#">Recover email</a>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// LOGIN — Split-screen brand (left panel)
// ============================================================
const LoginSplit = () => (
  <div className="auth-bg split" style={{ alignItems: 'stretch' }}>
    {/* Left brand panel */}
    <div style={{
      width: '52%',
      background: 'linear-gradient(135deg, var(--bibo-red) 0%, #B81E2C 100%)',
      color: 'white',
      padding: '60px 56px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BiboLogoMark size={40} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'white', letterSpacing: '-0.01em' }}>BIBO</div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: 600 }}>WINDOWS &amp; DOORS</div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          Run every job <br/>from one workspace.
        </div>
        <div style={{ fontSize: 16, opacity: 0.85, marginTop: 18, maxWidth: 420, lineHeight: 1.5 }}>
          CRM, estimates, production, dispatch and installs — all the way through to client handover.
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 36 }}>
          {[['11', 'Departments'], ['20', 'Modules'], ['1×', 'Login']].map(([v, l], i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7 }}>© 2026 Bibo Windows &amp; Doors</div>

      {/* Decorative window grid pattern */}
      <svg style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.18 }} width="380" height="380" viewBox="0 0 200 200">
        <g stroke="white" strokeWidth="0.8" fill="none">
          <rect x="30" y="30" width="140" height="140" rx="2"/>
          <line x1="100" y1="30" x2="100" y2="170"/>
          <line x1="30" y1="100" x2="170" y2="100"/>
          <rect x="40" y="40" width="50" height="50"/>
          <rect x="110" y="40" width="50" height="50"/>
          <rect x="40" y="110" width="50" height="50"/>
          <rect x="110" y="110" width="50" height="50"/>
        </g>
      </svg>
    </div>

    {/* Right form panel */}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 className="auth-h" style={{ textAlign: 'left' }}>Sign in</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '4px 0 0' }}>Use your Bibo work account.</p>
        </div>
        <Input label="Email address" placeholder="you@bibo.com" focused trail={<Icon name="mail" size={16} />} />
        <Input label="Password" placeholder="Enter your password" trail={<Icon name="eye" size={16} />} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-700)' }}>
            <div style={{ width: 14, height: 14, border: '1.5px solid var(--ink-300)', borderRadius: 3 }} />
            Keep me signed in
          </label>
          <a href="#" style={{ color: 'var(--bibo-red)', fontWeight: 500 }}>Forgot password?</a>
        </div>
        <Btn kind="primary" full>Sign In <Icon name="arrow-right" size={16} /></Btn>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-500)' }}>
          Need access? <a href="#" style={{ color: 'var(--bibo-red)', fontWeight: 500 }}>Contact IT Admin</a>
        </div>
      </div>
    </div>
  </div>
);

const LoginSplitMobile = () => (
  <div className="phone-screen">
    <div style={{
      height: '38%', background: 'linear-gradient(135deg, var(--bibo-red), #B81E2C)',
      color: 'white', padding: '48px 24px 0', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BiboLogoMark size={28} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'white' }}>BIBO</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginTop: 28, lineHeight: 1.15 }}>
        Run every job<br/>from one workspace.
      </div>
      <svg style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.2 }} width="120" height="120" viewBox="0 0 100 100">
        <g stroke="white" strokeWidth="0.8" fill="none">
          <rect x="15" y="15" width="70" height="70"/>
          <line x1="50" y1="15" x2="50" y2="85"/>
          <line x1="15" y1="50" x2="85" y2="50"/>
        </g>
      </svg>
    </div>
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 className="m-auth-h" style={{ textAlign: 'left' }}>Sign in</h1>
      <Input label="Email" placeholder="you@bibo.com" focused trail={<Icon name="mail" size={16} />} />
      <Input label="Password" placeholder="Enter password" trail={<Icon name="eye" size={16} />} />
      <Btn kind="primary" full style={{ marginTop: 4 }}>Sign In</Btn>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>
        <a href="#" style={{ color: 'var(--bibo-red)', fontWeight: 500 }}>Forgot password?</a>
      </div>
    </div>
  </div>
);

// ============================================================
// LOGIN — Minimal (no card, big type)
// ============================================================
const LoginMinimal = () => (
  <div className="auth-bg" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 120 }}>
    <div style={{ width: 460 }}>
      <BiboLogoLockup scale={0.95} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 56, lineHeight: 1, color: 'var(--ink-900)' }}>
        Sign in.
      </div>
      <div style={{ fontSize: 16, color: 'var(--ink-500)', margin: '12px 0 40px', maxWidth: 380 }}>
        Use your Bibo work email to access your workspace.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
        <div style={{
          fontSize: 22, fontWeight: 500, color: 'var(--ink-900)',
          borderBottom: '2px solid var(--bibo-red)', padding: '6px 0',
          fontFamily: 'var(--font-body)'
        }}>john.kamau@bibo.com<span style={{ display: 'inline-block', width: 2, height: 24, background: 'var(--bibo-red)', marginLeft: 4, verticalAlign: 'middle', animation: 'none' }} /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 36 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Password</div>
        <div style={{
          fontSize: 22, fontWeight: 500, color: 'var(--ink-400)',
          borderBottom: '2px solid var(--ink-200)', padding: '6px 0',
        }}>•••••••••</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Btn kind="primary" style={{ padding: '0 28px', height: 52, fontSize: 15 }}>Continue <Icon name="arrow-right" size={18} /></Btn>
        <a href="#" style={{ color: 'var(--ink-500)', fontSize: 13, fontWeight: 500 }}>Forgot password?</a>
      </div>
    </div>
  </div>
);

const LoginMinimalMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 48px)' }}>
      <BiboLogoLockup scale={0.85} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 48, lineHeight: 1, color: 'var(--ink-900)' }}>
        Sign in.
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', margin: '10px 0 32px', maxWidth: 260 }}>
        Use your Bibo work email.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-900)', borderBottom: '2px solid var(--bibo-red)', padding: '4px 0' }}>john.kamau@bibo.com</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-500)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Password</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-400)', borderBottom: '2px solid var(--ink-200)', padding: '4px 0' }}>•••••••••</div>
      </div>
      <Btn kind="primary" full style={{ height: 48 }}>Continue</Btn>
      <a href="#" style={{ color: 'var(--ink-500)', fontSize: 12, fontWeight: 500, textAlign: 'center', marginTop: 16 }}>Forgot password?</a>
    </div>
  </div>
);

// ============================================================
// ACCEPT INVITATION
// ============================================================
const AcceptInvite = ({ state = 'default' }) => {
  if (state === 'expired') {
    return (
      <div className="auth-bg">
        <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--status-amber-bg)', color: 'var(--status-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
            <Icon name="clock" size={36} strokeWidth={1.8} />
          </div>
          <h1 className="auth-h">This link has expired</h1>
          <p className="auth-sub" style={{ margin: 0 }}>Invitations are valid for 72 hours. Ask your admin to send you a new one.</p>
          <Btn kind="primary" full>Request new invite</Btn>
          <Btn kind="ghost" full>Back to login</Btn>
        </div>
      </div>
    );
  }
  if (state === 'revoked') {
    return (
      <div className="auth-bg">
        <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
            <Icon name="shield-x" size={36} strokeWidth={1.8} />
          </div>
          <h1 className="auth-h">Invitation no longer valid</h1>
          <p className="auth-sub" style={{ margin: 0 }}>This invitation has been revoked. Contact your administrator if this is unexpected.</p>
          <Btn kind="secondary" full>Contact admin</Btn>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-bg">
      <div className="auth-card wide">
        <div className="auth-logo">
          <BiboLogoLockup scale={0.9} />
        </div>
        <div className="stepper">
          <div className="step active"><span className="dot">1</span>Accept Invite</div>
          <div className="step-bar" />
          <div className="step"><span className="dot">2</span>Your Profile</div>
          <div className="step-bar" />
          <div className="step"><span className="dot">3</span>HR Review</div>
        </div>
        <div>
          <h1 className="auth-h" style={{ textAlign: 'left', fontSize: 24 }}>Welcome, Aisha! 👋</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '4px 0 0' }}>Set your password to activate your Bibo account.</p>
        </div>
        <Input label="Email (verified)" value="aisha.mwangi@bibo.com" trail={<Icon name="check" size={16} stroke="var(--status-green)" />} />
        <Input label="New password" value="••••••••••" focused trail={<Icon name="eye" size={16} />} />
        <div className="pw-strength">
          <div className="seg on-strong"/><div className="seg on-strong"/><div className="seg on-strong"/><div className="seg"/>
        </div>
        <div className="pw-rules" style={{ marginTop: -10 }}>
          <div className="rule met"><span className="check">✓</span>At least 8 characters</div>
          <div className="rule met"><span className="check">✓</span>Uppercase &amp; lowercase</div>
          <div className="rule met"><span className="check">✓</span>One number</div>
          <div className="rule"><span className="check">✓</span>One symbol</div>
        </div>
        <Input label="Confirm password" value="••••••••••" trail={<Icon name="eye-off" size={16} />} />
        <Btn kind="primary" full>Set password &amp; continue <Icon name="arrow-right" size={16} /></Btn>
      </div>
    </div>
  );
};

const AcceptInviteMobile = ({ state = 'default' }) => {
  if (state === 'expired') {
    return (
      <div className="phone-screen">
        <PhoneStatusBar />
        <div className="m-auth" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--status-amber-bg)', color: 'var(--status-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="clock" size={28} strokeWidth={1.8} />
          </div>
          <h1 className="m-auth-h">Link expired</h1>
          <p className="m-auth-sub">Invitations expire after 72 hours.</p>
          <Btn kind="primary" full>Request new invite</Btn>
          <Btn kind="ghost" full style={{ marginTop: 8 }}>Back to login</Btn>
        </div>
      </div>
    );
  }
  if (state === 'revoked') {
    return (
      <div className="phone-screen">
        <PhoneStatusBar />
        <div className="m-auth" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="shield-x" size={28} />
          </div>
          <h1 className="m-auth-h">Invitation revoked</h1>
          <p className="m-auth-sub">Contact your administrator for help.</p>
          <Btn kind="secondary" full>Contact admin</Btn>
        </div>
      </div>
    );
  }
  return (
    <div className="phone-screen">
      <PhoneStatusBar />
      <div className="m-auth">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <BiboLogoMark size={32} />
        </div>
        <div className="stepper" style={{ justifyContent: 'center' }}>
          <div className="step active"><span className="dot">1</span></div>
          <div className="step-bar" />
          <div className="step"><span className="dot">2</span></div>
          <div className="step-bar" />
          <div className="step"><span className="dot">3</span></div>
        </div>
        <h1 className="m-auth-h" style={{ textAlign: 'left' }}>Welcome, Aisha! 👋</h1>
        <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: '6px 0 18px' }}>Set your password to activate.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Email (verified)" value="aisha.mwangi@bibo.com" trail={<Icon name="check" size={14} stroke="var(--status-green)" />} />
          <Input label="New password" value="••••••••••" focused trail={<Icon name="eye" size={14} />} />
          <div className="pw-strength" style={{ marginTop: -4 }}>
            <div className="seg on-strong"/><div className="seg on-strong"/><div className="seg on-strong"/><div className="seg"/>
          </div>
          <Input label="Confirm" value="••••••••••" trail={<Icon name="eye-off" size={14} />} />
          <Btn kind="primary" full style={{ marginTop: 4 }}>Set password</Btn>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// FORGOT / RESET / RECOVER EMAIL
// ============================================================
const ForgotPassword = ({ submitted = false }) => (
  <div className="auth-bg">
    <div className="auth-card">
      <div className="auth-logo"><BiboLogoLockup scale={0.95} /></div>
      <a href="#" style={{ color: 'var(--ink-500)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
        <Icon name="arrow-left" size={14} /> Back to sign in
      </a>
      <h1 className="auth-h">Forgot your password?</h1>
      <p className="auth-sub">Enter the email tied to your account and we'll send a secure reset link.</p>
      {submitted && (
        <div className="banner success">
          <Icon name="check" size={16} />
          <div>
            <div>If that email is registered, we sent a reset link.</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: .8, fontWeight: 400 }}>Check your inbox — the link expires in 60 minutes.</div>
          </div>
        </div>
      )}
      <Input label="Work email" value={submitted ? 'john.kamau@bibo.com' : ''} placeholder="you@bibo.com" focused={!submitted} trail={<Icon name="mail" size={16} />} />
      <Btn kind="primary" full disabled={submitted}>{submitted ? 'Link sent' : 'Send reset link'}</Btn>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-500)' }}>
        Forgot the email instead? <a href="#" style={{ color: 'var(--bibo-red)', fontWeight: 500 }}>Recover email →</a>
      </div>
    </div>
  </div>
);

const ResetPassword = () => (
  <div className="auth-bg">
    <div className="auth-card">
      <div className="auth-logo"><BiboLogoLockup scale={0.95} /></div>
      <h1 className="auth-h">Reset your password</h1>
      <p className="auth-sub">Pick a strong password you'll remember.</p>
      <Input label="New password" value="••••••••••••" focused trail={<Icon name="eye" size={16} />} />
      <div className="pw-strength"><div className="seg on-strong"/><div className="seg on-strong"/><div className="seg on-strong"/><div className="seg on-strong"/></div>
      <div style={{ fontSize: 11, color: 'var(--status-green)', marginTop: -10, fontWeight: 600 }}>Strong password ✓</div>
      <div className="pw-rules">
        <div className="rule met"><span className="check">✓</span>8+ characters</div>
        <div className="rule met"><span className="check">✓</span>Uppercase &amp; lowercase</div>
        <div className="rule met"><span className="check">✓</span>One number</div>
        <div className="rule met"><span className="check">✓</span>One symbol</div>
      </div>
      <Input label="Confirm new password" value="••••••••••••" trail={<Icon name="check" size={16} stroke="var(--status-green)" />} />
      <Btn kind="primary" full>Save password &amp; sign in</Btn>
    </div>
  </div>
);

const RecoverEmail = () => (
  <div className="auth-bg">
    <div className="auth-card">
      <div className="auth-logo"><BiboLogoLockup scale={0.95} /></div>
      <a href="#" style={{ color: 'var(--ink-500)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
        <Icon name="arrow-left" size={14} /> Back to sign in
      </a>
      <h1 className="auth-h">Recover your email</h1>
      <p className="auth-sub">Enter your employee number and we'll email your login address to your registered inbox.</p>
      <Input label="Employee number" value="BIBO-0247" focused trail={<Icon name="user" size={16} />} />
      <Btn kind="primary" full>Send my login email</Btn>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-500)' }}>
        Don't know your number? <a href="#" style={{ color: 'var(--bibo-red)', fontWeight: 500 }}>Contact HR</a>
      </div>
    </div>
  </div>
);

// Mobile versions
const ForgotPasswordMobile = ({ submitted = false }) => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BiboLogoMark size={32} /></div>
      <h1 className="m-auth-h">Forgot password?</h1>
      <p className="m-auth-sub">We'll send a secure reset link.</p>
      {submitted && (
        <div className="banner success" style={{ marginBottom: 14, fontSize: 12 }}>
          <Icon name="check" size={14} /><div>Reset link sent (if email exists).</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Work email" value={submitted ? 'john.kamau@bibo.com' : ''} placeholder="you@bibo.com" focused={!submitted} trail={<Icon name="mail" size={14} />} />
        <Btn kind="primary" full disabled={submitted}>{submitted ? 'Link sent' : 'Send reset link'}</Btn>
        <a href="#" style={{ color: 'var(--bibo-red)', fontSize: 12, fontWeight: 500, textAlign: 'center', marginTop: 4 }}>Recover email →</a>
      </div>
    </div>
  </div>
);

const ResetPasswordMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BiboLogoMark size={32} /></div>
      <h1 className="m-auth-h">Reset password</h1>
      <p className="m-auth-sub">Pick a strong password.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="New password" value="••••••••••••" focused trail={<Icon name="eye" size={14} />} />
        <div className="pw-strength"><div className="seg on-strong"/><div className="seg on-strong"/><div className="seg on-strong"/><div className="seg on-strong"/></div>
        <Input label="Confirm" value="••••••••••••" trail={<Icon name="check" size={14} stroke="var(--status-green)" />} />
        <Btn kind="primary" full style={{ marginTop: 4 }}>Save password</Btn>
      </div>
    </div>
  </div>
);

const RecoverEmailMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BiboLogoMark size={32} /></div>
      <h1 className="m-auth-h">Recover email</h1>
      <p className="m-auth-sub">Enter your employee number.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Employee number" value="BIBO-0247" focused trail={<Icon name="user" size={14} />} />
        <Btn kind="primary" full>Send my email</Btn>
      </div>
    </div>
  </div>
);

// ============================================================
// ACCESS DENIED (suspended / inactive)
// ============================================================
const AccessDenied = () => (
  <div className="auth-bg">
    <div className="auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
        <Icon name="shield-x" size={40} strokeWidth={1.8} />
      </div>
      <h1 className="auth-h">Account suspended</h1>
      <p className="auth-sub" style={{ margin: 0 }}>Your account has been temporarily suspended. Contact your administrator to reinstate access.</p>
      <div style={{
        width: '100%', padding: '14px', background: 'var(--ink-50)',
        borderRadius: 8, border: '1px solid var(--ink-100)', display: 'flex', flexDirection: 'column', gap: 8,
        fontSize: 12, color: 'var(--ink-700)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Account</span><span style={{ fontWeight: 600 }}>john.kamau@bibo.com</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Status</span><span className="status-badge suspended"><span className="dot"/>Suspended</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Since</span><span style={{ fontWeight: 500 }}>May 18, 2026</span></div>
      </div>
      <Btn kind="primary" full><Icon name="mail" size={16} />Contact administrator</Btn>
      <a href="#" style={{ fontSize: 12, color: 'var(--ink-500)' }}>support@bibo.com</a>
    </div>
  </div>
);

const AccessDeniedMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 60 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--status-red-bg)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon name="shield-x" size={32} />
      </div>
      <h1 className="m-auth-h">Account suspended</h1>
      <p className="m-auth-sub">Contact your administrator to reinstate access.</p>
      <div style={{
        width: '100%', padding: '12px 14px', background: 'var(--ink-50)',
        borderRadius: 8, border: '1px solid var(--ink-100)', display: 'flex', flexDirection: 'column', gap: 6,
        fontSize: 11, color: 'var(--ink-700)', marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Account</span><span style={{ fontWeight: 600 }}>john.kamau@bibo.com</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-500)' }}>Status</span><span className="status-badge suspended"><span className="dot"/>Suspended</span></div>
      </div>
      <Btn kind="primary" full><Icon name="mail" size={14} />Contact admin</Btn>
    </div>
  </div>
);

Object.assign(window, {
  LoginCentered, LoginMobile, LoginSplit, LoginSplitMobile, LoginMinimal, LoginMinimalMobile,
  AcceptInvite, AcceptInviteMobile,
  ForgotPassword, ResetPassword, RecoverEmail,
  ForgotPasswordMobile, ResetPasswordMobile, RecoverEmailMobile,
  AccessDenied, AccessDeniedMobile,
});
