const fs = require('fs');
let text = fs.readFileSync('frontend/src/AdminPage.tsx', 'utf8');

const oldMobileHeader = \      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {React.createElement('ion-icon', { name: 'menu-outline' })}
        </button>
        <div style={{ fontWeight: 'bold' }}>Automation Audio System</div>
        <div style={{ width: '24px' }}></div>
      </div>\;

const newMobileHeader = \      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {React.createElement('ion-icon', { name: 'menu-outline' })}
        </button>
        <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
          {logoUrl ? (
             <img src={logoUrl} alt="logo" style={{ maxHeight: '32px', maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Automation Audio System</div>
          )}
        </div>
        <div style={{ width: '32px' }}></div>
      </div>\;

text = text.replace(oldMobileHeader, newMobileHeader);
fs.writeFileSync('frontend/src/AdminPage.tsx', text, 'utf8');