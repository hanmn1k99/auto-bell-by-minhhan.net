
const fs = require("fs");
let text = fs.readFileSync("frontend/src/components/admin/YouTubeTab.tsx", "utf8");

const executeSearchCode = `
  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setYtUrl(query);
    setYtSearching(true);
    try {
      const res = await api.post("/api/youtube/search", { q: query.trim() });
      setYtSearchResults(res.data);
    } catch (err: any) {
      notify(err.response?.data?.error || "Lỗi tìm kiếm YouTube", "err");
    } finally {
      setYtSearching(false);
    }
  };
`;

text = text.replace("const fetchSuggestions = async (q: string) => {", executeSearchCode + "\n  const fetchSuggestions = async (q: string) => {");

text = text.replace(
  /onClick=\{\(\) => \{\s*setYtUrl\(sugg\);\s*setShowYtSuggests\(false\);\s*setTimeout\(\(\) => handleYtInputKeyDown\(\{ key: "Enter" \} as any\), 50\);\s*\}\}/g,
  "onMouseDown={(e) => { e.preventDefault(); setShowYtSuggests(false); executeSearch(sugg); }}"
);

text = text.replace(
  /onClick=\{\(\) => \{\s*setYtUrl\(tag\);\s*setTimeout\(\(\) => handleYtInputKeyDown\(\{ key: "Enter" \} as any\), 50\);\s*\}\}/g,
  "onClick={() => { setShowYtSuggests(false); executeSearch(tag); }}"
);

text = text.replace(
  /onClick=\{\(\) => handleYtInputKeyDown\(\{ key: .Enter. \} as any\)\}/g,
  "onClick={() => executeSearch(ytUrl)}"
);

text = text.replace(
  /onKeyDown=\{handleYtInputKeyDown\}/g,
  "onKeyDown={(e) => { if (e.key === \"Enter\") { setShowYtSuggests(false); executeSearch(ytUrl); } }}"
);

fs.writeFileSync("frontend/src/components/admin/YouTubeTab.tsx", text, "utf8");
