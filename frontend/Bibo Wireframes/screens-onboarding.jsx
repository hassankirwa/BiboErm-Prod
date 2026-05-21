/* Onboarding screens: Profile (3 variants) + Pending HR (3 variants) */

// ============================================================
// PROFILE — WIZARD (3 sub-steps)
// ============================================================
const ProfileWizard = () => (
  <div className="auth-bg">
    <div className="auth-card wide" style={{ width: 520, padding: 32 }}>
      <div className="auth-logo" style={{ marginBottom: 0 }}>
        <BiboLogoLockup scale={0.85} />
      </div>
      <div className="stepper">
        <div className="step done"><span className="dot">✓</span>Accept Invite</div>
        <div className="step-bar done" />
        <div className="step active"><span className="dot">2</span>Your Profile</div>
        <div className="step-bar" />
        <div className="step"><span className="dot">3</span>HR Review</div>
      </div>
      <div>
        <h1 className="auth-h" style={{ textAlign: 'left', fontSize: 22 }}>Tell us about you</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '4px 0 0' }}>Step 2 of 3 · Personal information</p>
      </div>

      {/* Avatar uploader */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed var(--bibo-red)', position: 'relative'
        }}>
          <Icon name="camera" size={26} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-900)' }}>Add a profile photo</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>JPG or PNG · max 5 MB · optional</div>
          <Btn kind="secondary" size="sm" style={{ marginTop: 8 }}>Choose file</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Input label="Phone number *" value="+254 712 345 678" focused trail={<Icon name="phone" size={14} />} />
        <Input label="Gender (optional)" value="" placeholder="Select…" trail={<Icon name="chevron-down" size={14} />} />
      </div>
      <Input label="Home address (optional)" value="" placeholder="Street, city, postal code" />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 8 }}>
        Emergency contact
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Input label="Full name *" value="Mary Mwangi" />
        <Input label="Relationship" value="Sister" />
      </div>
      <Input label="Phone *" value="+254 723 998 211" trail={<Icon name="phone" size={14} />} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <Btn kind="ghost">Save draft</Btn>
        <Btn kind="primary">Save &amp; continue <Icon name="arrow-right" size={16} /></Btn>
      </div>
    </div>
  </div>
);

const ProfileWizardMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '20px 20px 60px', overflowY: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <BiboLogoMark size={28} />
        <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>Step 2 of 3</div>
      </div>
      <div className="stepper">
        <div className="step done"><span className="dot">✓</span></div>
        <div className="step-bar done" />
        <div className="step active"><span className="dot">2</span></div>
        <div className="step-bar" />
        <div className="step"><span className="dot">3</span></div>
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '6px 0 4px', letterSpacing: '-0.01em' }}>Your profile</h1>
      <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: '0 0 18px' }}>Personal information</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed var(--bibo-red)',
        }}>
          <Icon name="camera" size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>Add photo</div>
          <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>JPG/PNG · 5 MB max</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Phone *" value="+254 712 345 678" focused trail={<Icon name="phone" size={14} />} />
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 4 }}>
          Emergency contact
        </div>
        <Input label="Name *" value="Mary Mwangi" />
        <Input label="Phone *" value="+254 723 998 211" trail={<Icon name="phone" size={14} />} />
      </div>
    </div>
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--ink-100)',
      padding: 16, display: 'flex', gap: 10
    }}>
      <Btn kind="ghost" style={{ flex: 1 }}>Save draft</Btn>
      <Btn kind="primary" style={{ flex: 2 }}>Continue</Btn>
    </div>
  </div>
);

// ============================================================
// PROFILE — LONG FORM (single page, scrollable)
// ============================================================
const ProfileLongForm = () => (
  <div className="auth-bg" style={{ alignItems: 'flex-start', paddingTop: 30 }}>
    <div style={{ width: 720, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
      {/* Header strip */}
      <div style={{ padding: '20px 28px', background: 'var(--bibo-red-tint)', borderBottom: '1px solid var(--bibo-red-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BiboLogoMark size={32} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Complete your profile</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>2 of 3 — fill required fields to continue</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 100, height: 6, background: 'var(--ink-200)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '66%', height: '100%', background: 'var(--bibo-red)' }}/>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bibo-red)' }}>66%</div>
        </div>
      </div>

      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22, maxHeight: 580, overflowY: 'hidden' }}>
        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--bibo-red)'
          }}>
            <Icon name="camera" size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Profile photo <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>(optional)</span></div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>This appears in your workspace and on emails to clients.</div>
          </div>
          <Btn kind="secondary" size="sm"><Icon name="plus" size={14}/>Upload</Btn>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>Personal information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Phone number *" value="+254 712 345 678" focused trail={<Icon name="phone" size={14} />} />
            <Input label="Gender" value="" placeholder="Select..." trail={<Icon name="chevron-down" size={14} />} />
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Home address" value="" placeholder="Street, city, postal code" />
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>Emergency contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Full name *" value="Mary Mwangi" />
            <Input label="Relationship" value="Sister" />
            <Input label="Phone *" value="+254 723 998 211" trail={<Icon name="phone" size={14} />} />
            <Input label="Alternate phone" value="" placeholder="Optional" />
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 28px', borderTop: '1px solid var(--ink-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink-50)' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
          <Icon name="check" size={12} stroke="var(--status-green)" strokeWidth={2.5} /> Draft auto-saved 2s ago
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn kind="ghost">Save &amp; finish later</Btn>
          <Btn kind="primary">Submit profile <Icon name="arrow-right" size={16} /></Btn>
        </div>
      </div>
    </div>
  </div>
);

const ProfileLongFormMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '12px 0 0' }}>
      <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="chevron-left" size={20} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Your profile</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--bibo-red)', fontWeight: 600 }}>66%</div>
      </div>
      <div style={{ height: 3, background: 'var(--ink-100)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '66%', background: 'var(--bibo-red)' }}/>
      </div>
    </div>
    <div style={{ padding: '18px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--bibo-red)' }}>
          <Icon name="camera" size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>Add photo</div>
          <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>Optional</div>
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Personal</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
        <Input label="Phone *" value="+254 712 345 678" focused trail={<Icon name="phone" size={14} />} />
        <Input label="Address" value="" placeholder="Optional" />
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Emergency contact</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Name *" value="Mary Mwangi" />
        <Input label="Phone *" value="+254 723 998 211" trail={<Icon name="phone" size={14} />} />
      </div>
    </div>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--ink-100)', padding: 14 }}>
      <Btn kind="primary" full>Submit profile</Btn>
    </div>
  </div>
);

// ============================================================
// PROFILE — CHAT-STYLE
// ============================================================
const Bubble = ({ side = 'left', children, time }) => (
  <div style={{
    display: 'flex',
    flexDirection: side === 'left' ? 'row' : 'row-reverse',
    gap: 10, alignItems: 'flex-end', marginBottom: 14
  }}>
    {side === 'left' && (
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bibo-red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BiboLogoMark size={20} />
      </div>
    )}
    <div style={{ maxWidth: '78%' }}>
      <div style={{
        background: side === 'left' ? 'var(--ink-100)' : 'var(--bibo-red)',
        color: side === 'left' ? 'var(--ink-900)' : 'white',
        padding: '12px 16px',
        borderRadius: side === 'left' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
        fontSize: 14, lineHeight: 1.4,
      }}>{children}</div>
      {time && <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4, textAlign: side === 'right' ? 'right' : 'left' }}>{time}</div>}
    </div>
  </div>
);

const ChipButton = ({ children, primary = false }) => (
  <button style={{
    background: primary ? 'var(--bibo-red)' : 'var(--surface)',
    border: primary ? 'none' : '1px solid var(--ink-200)',
    color: primary ? 'white' : 'var(--ink-700)',
    padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
    cursor: 'pointer'
  }}>{children}</button>
);

const ProfileChat = () => (
  <div className="auth-bg">
    <div style={{ width: 560, height: 680, background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--ink-100)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--ink-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BiboLogoMark size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Bibo Assistant</div>
          <div style={{ fontSize: 11, color: 'var(--status-green)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, background: 'var(--status-green)', borderRadius: 3 }} /> Setting up your profile
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--status-green)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
            Step 2 / 3
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, padding: '20px 22px', overflowY: 'hidden', background: 'var(--ink-50)' }}>
        <Bubble side="left" time="just now">Hi Aisha! 👋 I'm here to help you finish setting up your Bibo account. It'll take about 2 minutes.</Bubble>
        <Bubble side="left">First, what's the best phone number to reach you on?</Bubble>
        <Bubble side="right" time="just now">+254 712 345 678</Bubble>
        <Bubble side="left">Got it. Now who should we contact in case of an emergency?</Bubble>
        <Bubble side="right">Mary Mwangi — my sister</Bubble>
        <Bubble side="left">Perfect. And her phone number?</Bubble>

        {/* Active prompt */}
        <div style={{ display: 'flex', flexDirection: 'row-reverse', marginTop: 6 }}>
          <div style={{
            background: 'var(--surface)', border: '2px solid var(--bibo-red)',
            padding: '10px 16px', borderRadius: '16px 16px 4px 16px',
            fontSize: 14, color: 'var(--ink-500)', minWidth: 220
          }}>+254 723 998 211<span style={{ display: 'inline-block', width: 1.5, height: 16, background: 'var(--bibo-red)', marginLeft: 4, verticalAlign: 'middle' }} /></div>
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: 16, borderTop: '1px solid var(--ink-100)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <ChipButton>Skip for now</ChipButton>
          <ChipButton>Use my number</ChipButton>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input" style={{ flex: 1, height: 44 }}><span className="placeholder">Type your answer...</span></div>
          <button style={{ width: 44, height: 44, background: 'var(--bibo-red)', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={18} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ProfileChatMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ padding: '8px 20px 12px', borderBottom: '1px solid var(--ink-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon name="chevron-left" size={18} />
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bibo-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BiboLogoMark size={20} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Bibo Assistant</div>
        <div style={{ fontSize: 10, color: 'var(--status-green)' }}>● Step 2 of 3</div>
      </div>
    </div>
    <div style={{ flex: 1, padding: '14px 16px', overflowY: 'hidden', background: 'var(--ink-50)', height: 'calc(100% - 168px)' }}>
      <Bubble side="left" time="now">Hi Aisha 👋 Let's finish setup — should take 2 minutes.</Bubble>
      <Bubble side="left">Best phone to reach you?</Bubble>
      <Bubble side="right">+254 712 345 678</Bubble>
      <Bubble side="left">Emergency contact name?</Bubble>
      <Bubble side="right">Mary Mwangi</Bubble>
      <Bubble side="left">And her phone?</Bubble>
    </div>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, background: 'var(--surface)', borderTop: '1px solid var(--ink-100)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
        <ChipButton>Skip</ChipButton>
        <ChipButton>Use my number</ChipButton>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="input" style={{ flex: 1, height: 40, fontSize: 13 }}><span className="placeholder">Type answer...</span></div>
        <button style={{ width: 40, height: 40, background: 'var(--bibo-red)', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  </div>
);

// ============================================================
// PENDING HR — ILLUSTRATION
// ============================================================
const PendingHRIllustration = () => (
  <div className="auth-bg">
    <div className="auth-card wide" style={{ width: 520, padding: '36px 36px 32px', alignItems: 'center', textAlign: 'center' }}>
      <div className="stepper" style={{ alignSelf: 'stretch' }}>
        <div className="step done"><span className="dot">✓</span>Accept Invite</div>
        <div className="step-bar done" />
        <div className="step done"><span className="dot">✓</span>Your Profile</div>
        <div className="step-bar done" />
        <div className="step active"><span className="dot">3</span>HR Review</div>
      </div>

      {/* Illustration */}
      <div style={{ marginTop: 8 }}>
        <svg width="200" height="160" viewBox="0 0 200 160">
          {/* Document */}
          <rect x="40" y="35" width="100" height="120" rx="8" fill="var(--ink-50)" stroke="var(--ink-200)" strokeWidth="2"/>
          <line x1="55" y1="60" x2="125" y2="60" stroke="var(--ink-300)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="55" y1="75" x2="115" y2="75" stroke="var(--ink-300)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="55" y1="90" x2="125" y2="90" stroke="var(--ink-300)" strokeWidth="3" strokeLinecap="round"/>
          <rect x="55" y="105" width="50" height="20" rx="4" fill="var(--bibo-red-soft)" stroke="var(--bibo-red)" strokeWidth="1.5"/>
          {/* Magnifier */}
          <circle cx="125" cy="105" r="22" fill="white" stroke="var(--bibo-red)" strokeWidth="3"/>
          <circle cx="125" cy="105" r="14" fill="var(--bibo-red-soft)"/>
          <line x1="142" y1="122" x2="158" y2="138" stroke="var(--bibo-red)" strokeWidth="4" strokeLinecap="round"/>
          {/* Check inside magnifier */}
          <polyline points="118,105 123,110 132,100" fill="none" stroke="var(--bibo-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="auth-h" style={{ marginTop: 4 }}>Almost there!</h1>
      <p className="auth-sub" style={{ margin: 0, maxWidth: 380 }}>
        Your profile is complete. HR is now setting up your employment record. You'll receive an email the moment your account is ready.
      </p>

      <div style={{
        width: '100%', padding: '14px 16px',
        background: 'var(--status-amber-bg)',
        color: 'var(--status-amber)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13, fontWeight: 500
      }}>
        <Icon name="clock" size={18} />
        <div>Average review time: <strong>under 24 hours</strong></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, background: 'var(--status-amber)', borderRadius: 3, animation: 'none' }}/>
          Checking...
        </div>
      </div>

      <a href="#" style={{ fontSize: 13, color: 'var(--bibo-red)', fontWeight: 500 }}>Contact support@bibo.com</a>
    </div>
  </div>
);

const PendingHRIllustrationMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 30 }}>
      <div className="stepper" style={{ alignSelf: 'stretch', justifyContent: 'center' }}>
        <div className="step done"><span className="dot">✓</span></div>
        <div className="step-bar done" />
        <div className="step done"><span className="dot">✓</span></div>
        <div className="step-bar done" />
        <div className="step active"><span className="dot">3</span></div>
      </div>
      <svg width="160" height="130" viewBox="0 0 200 160" style={{ margin: '20px 0 12px' }}>
        <rect x="40" y="35" width="100" height="120" rx="8" fill="var(--ink-50)" stroke="var(--ink-200)" strokeWidth="2"/>
        <line x1="55" y1="60" x2="125" y2="60" stroke="var(--ink-300)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="55" y1="75" x2="115" y2="75" stroke="var(--ink-300)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="55" y1="90" x2="125" y2="90" stroke="var(--ink-300)" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="125" cy="105" r="22" fill="white" stroke="var(--bibo-red)" strokeWidth="3"/>
        <polyline points="118,105 123,110 132,100" fill="none" stroke="var(--bibo-red)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <h1 className="m-auth-h">Almost there!</h1>
      <p className="m-auth-sub" style={{ maxWidth: 280 }}>HR is setting up your employment record. You'll get an email when ready.</p>
      <div style={{ width: '100%', padding: 12, background: 'var(--status-amber-bg)', color: 'var(--status-amber)', borderRadius: 8, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon name="clock" size={16} /> Avg review: <strong>under 24h</strong>
      </div>
      <a href="#" style={{ fontSize: 12, color: 'var(--bibo-red)', fontWeight: 500 }}>support@bibo.com</a>
    </div>
  </div>
);

// ============================================================
// PENDING HR — TIMELINE
// ============================================================
const TimelineEvent = ({ state, title, sub, time }) => {
  const colors = {
    done: { dot: 'var(--status-green)', text: 'var(--ink-900)', sub: 'var(--ink-500)' },
    active: { dot: 'var(--bibo-red)', text: 'var(--ink-900)', sub: 'var(--bibo-red)' },
    pending: { dot: 'var(--ink-200)', text: 'var(--ink-400)', sub: 'var(--ink-400)' },
  };
  const c = colors[state];
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 24, position: 'relative' }}>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: state === 'pending' ? 'transparent' : c.dot,
          border: '2px solid ' + c.dot,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0
        }}>
          {state === 'done' && <Icon name="check" size={12} strokeWidth={3} />}
          {state === 'active' && <div style={{ width: 8, height: 8, background: 'white', borderRadius: 4 }} />}
        </div>
      </div>
      <div style={{ flex: 1, paddingTop: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: c.sub, marginTop: 3 }}>{sub}</div>}
        {time && <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>{time}</div>}
      </div>
    </div>
  );
};

const PendingHRTimeline = () => (
  <div className="auth-bg">
    <div className="auth-card wide" style={{ width: 560, padding: 32 }}>
      <div className="auth-logo"><BiboLogoLockup scale={0.85} /></div>
      <div>
        <h1 className="auth-h" style={{ textAlign: 'left' }}>Your account is being prepared</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: '6px 0 0' }}>You're on the home stretch. Here's where you are in the process.</p>
      </div>

      <div style={{ position: 'relative', paddingLeft: 12, marginTop: 8 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 23, top: 12, bottom: 30,
          width: 2, background: 'linear-gradient(180deg, var(--status-green) 0%, var(--status-green) 60%, var(--bibo-red) 60%, var(--bibo-red) 75%, var(--ink-200) 75%, var(--ink-200) 100%)'
        }}/>
        <TimelineEvent state="done" title="Invitation accepted" sub="Welcome aboard, Aisha." time="Yesterday, 2:14 PM" />
        <TimelineEvent state="done" title="Profile completed" sub="Personal details + emergency contact saved." time="Today, 9:02 AM" />
        <TimelineEvent state="active" title="HR review in progress" sub="Sarah from HR is filling in your employment record." time="Started 18 minutes ago" />
        <TimelineEvent state="pending" title="Account activated" sub="You'll get an email and can start working." />
      </div>

      <div style={{ padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 8, border: '1px solid var(--ink-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>SM</div>
        <div style={{ flex: 1, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>Sarah Mutua — HR Manager</div>
          <div style={{ color: 'var(--ink-500)' }}>Reviewing now · usually done in under 24h</div>
        </div>
        <Btn kind="secondary" size="sm"><Icon name="mail" size={14} />Message</Btn>
      </div>
    </div>
  </div>
);

const PendingHRTimelineMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div className="m-auth" style={{ padding: '50px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}><BiboLogoMark size={32} /></div>
      <h1 className="m-auth-h" style={{ textAlign: 'left' }}>Your account is being prepared</h1>
      <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: '6px 0 22px' }}>Here's where you are.</p>
      <div style={{ position: 'relative', paddingLeft: 10 }}>
        <div style={{ position: 'absolute', left: 21, top: 12, bottom: 30, width: 2, background: 'linear-gradient(180deg, var(--status-green) 60%, var(--bibo-red) 60% 75%, var(--ink-200) 75%)' }}/>
        <TimelineEvent state="done" title="Invitation accepted" time="Yesterday" />
        <TimelineEvent state="done" title="Profile completed" time="Today, 9:02 AM" />
        <TimelineEvent state="active" title="HR review in progress" sub="Sarah is reviewing" time="18 min ago" />
        <TimelineEvent state="pending" title="Account activated" />
      </div>
      <div style={{ padding: 10, background: 'var(--ink-50)', borderRadius: 8, border: '1px solid var(--ink-100)', display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bibo-red-soft)', color: 'var(--bibo-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>SM</div>
        <div style={{ flex: 1, fontSize: 11 }}>
          <div style={{ fontWeight: 600 }}>Sarah Mutua</div>
          <div style={{ color: 'var(--ink-500)' }}>HR Manager · under 24h</div>
        </div>
        <Btn kind="secondary" size="sm" style={{ height: 28 }}><Icon name="mail" size={12} /></Btn>
      </div>
    </div>
  </div>
);

// ============================================================
// PENDING HR — MINIMAL
// ============================================================
const PendingHRMinimal = () => (
  <div className="auth-bg" style={{ flexDirection: 'column' }}>
    <div style={{ position: 'absolute', top: 36, left: 56 }}><BiboLogoLockup scale={0.85} /></div>
    <div style={{ width: 460, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Pulsing dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: 6,
            background: i === 1 ? 'var(--bibo-red)' : 'var(--bibo-red-soft)',
          }}/>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--ink-900)' }}>
        We're nearly<br/>ready for you.
      </div>
      <div style={{ fontSize: 15, color: 'var(--ink-500)', maxWidth: 380, marginTop: 18, lineHeight: 1.5 }}>
        HR is finishing your employment record. We'll email you the second your workspace is live.
      </div>

      <div style={{
        marginTop: 36, padding: '10px 16px',
        border: '1px solid var(--ink-200)', borderRadius: 999,
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13, color: 'var(--ink-700)', fontWeight: 500
      }}>
        <span style={{ width: 8, height: 8, background: 'var(--status-green)', borderRadius: 4 }}/>
        Auto-refreshing every 30 seconds
      </div>

      <a href="#" style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 24, textDecoration: 'underline' }}>
        Need help? Contact support@bibo.com
      </a>
    </div>
  </div>
);

const PendingHRMinimalMobile = () => (
  <div className="phone-screen">
    <PhoneStatusBar />
    <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><BiboLogoMark size={32} /></div>
    <div style={{ padding: '60px 28px 0', textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: i === 1 ? 'var(--bibo-red)' : 'var(--bibo-red-soft)' }}/>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
        We're nearly<br/>ready for you.
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 14, lineHeight: 1.5 }}>
        HR is finishing your record. We'll email you the moment you're set.
      </div>
      <div style={{
        marginTop: 32, padding: '8px 14px', border: '1px solid var(--ink-200)', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500
      }}>
        <span style={{ width: 6, height: 6, background: 'var(--status-green)', borderRadius: 3 }}/>
        Auto-refreshing
      </div>
    </div>
  </div>
);

Object.assign(window, {
  ProfileWizard, ProfileWizardMobile,
  ProfileLongForm, ProfileLongFormMobile,
  ProfileChat, ProfileChatMobile,
  PendingHRIllustration, PendingHRIllustrationMobile,
  PendingHRTimeline, PendingHRTimelineMobile,
  PendingHRMinimal, PendingHRMinimalMobile,
});
