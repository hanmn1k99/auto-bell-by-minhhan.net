const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/YoutubeTab.tsx', 'utf8');

// 1. Inject state
const stateCode = \
  const [ytSuggests, setYtSuggests] = useState<string[]>([]);
  const [showYtSuggests, setShowYtSuggests] = useState(false);
  const suggestTimeout = useRef<any>(null);

  const fetchSuggestions = async (q: string) => {
    if (!q.trim() || q.includes('youtube.com') || q.includes('youtu.be')) {
      setYtSuggests([]);
      return;
    }
    try {
      const res = await api.get(\\\/api/youtube/suggest?q=\\\\\\);
      setYtSuggests(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const onYtUrlChange = (val: string) => {
    setYtUrl(val);
    setShowYtSuggests(true);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    suggestTimeout.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };
\;

text = text.replace('return (', stateCode + '\n  return (');

// 2. Inject onChange, onFocus, onBlur to input
text = text.replace(
  'onChange={e => setYtUrl(e.target.value)}',
  'onChange={e => onYtUrlChange(e.target.value)}\n              onFocus={() => setShowYtSuggests(true)}\n              onBlur={() => setTimeout(() => setShowYtSuggests(false), 200)}'
);

// 3. Inject autocomplete dropdown
const dropdownCode = \
            {showYtSuggests && ytSuggests.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 50, overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                {ytSuggests.map((sugg, i) => (
                  <div key={i} style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.9rem', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => {
                      setYtUrl(sugg);
                      setShowYtSuggests(false);
                      setTimeout(() => handleYtInputKeyDown({ key: 'Enter' } as any), 50);
                    }}
                  >
                    {React.createElement('ion-icon', { name: 'search-outline', style: { color: 'var(--text-muted)' } })}
                    {sugg}
                  </div>
                ))}
              </div>
            )}
\;

text = text.replace(
  '{ytSearching && (',
  dropdownCode + '\n            {ytSearching && ('
);

// 4. Inject empty state "Gợi ý cho bạn"
const emptyStateCode = \
        {ytSearchResults.length === 0 && !ytSearching && (
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gợi ý tìm kiếm cho trường học</h4>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {['Nhạc chuông trường học', 'Nhạc không lời thư giãn', 'Nhạc tập thể dục buổi sáng', 'Nhạc giao hưởng Mozart', 'Nhạc báo thức sôi động', 'Lofi chill không lời', 'Nhạc chờ thông báo'].map((tag, i) => (
                <button key={i} className="btn btn-outline btn-sm" style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)' }}
                  onClick={() => {
                    setYtUrl(tag);
                    setTimeout(() => handleYtInputKeyDown({ key: 'Enter' } as any), 50);
                  }}
                >
                  {React.createElement('ion-icon', { name: 'trending-up-outline', style: { marginRight: '6px' } })}
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
\;

text = text.replace(
  '{/* Search Results Grid */}',
  emptyStateCode + '\n\n        {/* Search Results Grid */}'
);

fs.writeFileSync('frontend/src/components/admin/YoutubeTab.tsx', text, 'utf8');