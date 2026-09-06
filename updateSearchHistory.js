const fs = require('fs');
let text = fs.readFileSync('frontend/src/components/admin/YouTubeTab.tsx', 'utf8');

// 1. Add state for search history
text = text.replace(
  'const suggestTimeout = useRef<any>(null);',
  'const suggestTimeout = useRef<any>(null);\n  const [searchHistory, setSearchHistory] = useState<string[]>([]);\n  useEffect(() => {\n    try {\n      const hist = JSON.parse(localStorage.getItem("ytSearchHistory") || "[]");\n      if (Array.isArray(hist)) setSearchHistory(hist);\n    } catch (e) {}\n  }, []);'
);

// 2. Save history in executeSearch
text = text.replace(
  'setYtUrl(query);\n    setYtSearching(true);',
  'setYtUrl(query);\n    setYtSearching(true);\n    const newHist = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);\n    setSearchHistory(newHist);\n    localStorage.setItem("ytSearchHistory", JSON.stringify(newHist));'
);

// 3. Update the Empty State UI
const newEmptyState = \
        {ytSearchResults.length === 0 && !ytSearching && searchHistory.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Gợi ý</h4>
              <button className="btn btn-ghost btn-sm" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }} onClick={() => { setSearchHistory([]); localStorage.removeItem("ytSearchHistory"); }}>
                Xóa lịch sử
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {searchHistory.map((tag, i) => (
                <button key={i} className="btn btn-outline btn-sm" style={{ borderRadius: "20px", background: "rgba(255,255,255,0.03)" }}
                  onClick={() => { setShowYtSuggests(false); executeSearch(tag); }}
                >
                  {React.createElement("ion-icon", { name: "time-outline", style: { marginRight: "6px" } })}
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
\;

text = text.replace(
  /\{ytSearchResults\.length === 0 && !ytSearching && \(\s*<div style=\{\{ marginTop: "2rem" \}\}>\s*<h4 style=\{\{ fontSize: "0\.9rem", color: "var\(--text-muted\)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0\.5px" \}\}>Gợi ý tìm kiếm cho trường học<\/h4>\s*<div style=\{\{ display: "flex", gap: "0\.75rem", flexWrap: "wrap" \}\}>\s*\{\["Nhạc chuông trường học", "Nhạc không lời thư giãn", "Nhạc tập thể dục buổi sáng", "Nhạc giao hưởng Mozart", "Nhạc báo thức sôi động", "Lofi chill không lời", "Nhạc chờ thông báo"\]\.map\(\(tag, i\) => \(\s*<button key=\{i\} className="btn btn-outline btn-sm" style=\{\{ borderRadius: "20px", background: "rgba\(255,255,255,0\.03\)" \}\}\s*onClick=\{\(\) => \{\s*setShowYtSuggests\(false\);\s*executeSearch\(tag\);\s*\}\}\s*>\s*\{React\.createElement\("ion-icon", \{ name: "trending-up-outline", style: \{ marginRight: "6px" \} \}\)\}\s*\{tag\}\s*<\/button>\s*\)\)\}\s*<\/div>\s*<\/div>\s*\)\}/m,
  newEmptyState.trim()
);

fs.writeFileSync('frontend/src/components/admin/YouTubeTab.tsx', text, 'utf8');