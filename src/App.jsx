import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [iconCache, setIconCache] = useState(() => {
    try {
      const raw = localStorage.getItem("dstIconCache");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("dstIconCache", JSON.stringify(iconCache));
    } catch {}
  }, [iconCache]);

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      try {
        const title = encodeURIComponent("Crock Pot/Recipe Table");
        const url = `https://dontstarve.wiki.gg/api.php?action=parse&page=${title}&prop=text&format=json&origin=*`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const html = data?.parse?.text?.["*"] || "";
        const doc = new DOMParser().parseFromString(html, "text/html");
        const table = doc.querySelector("table.wikitable");
        if (!table) throw new Error("Recipe table not found");

        const headers = Array.from(table.querySelectorAll("thead th, tbody tr:first-child th"))
          .map(h => h.textContent.trim().toLowerCase());
        const rows = Array.from(table.querySelectorAll("tbody tr")).slice(1);

        const toText = el => el ? el.textContent.trim().replace(/\s+/g, " ") : "";

        const parsed = rows.map(tr => {
          const cells = Array.from(tr.children);
          if (!cells.length) return null;
          const getCell = label => {
            const idx = headers.findIndex(h => h.includes(label));
            return idx >= 0 ? cells[idx] : null;
          };
          const name = toText(getCell("dish"));
          if (!name) return null;

          const hunger = parseFloat(toText(getCell("hunger"))) || 0;
          const sanity = parseFloat(toText(getCell("sanity"))) || 0;
          const health = parseFloat(toText(getCell("health"))) || 0;
          const perish_days = parseFloat((toText(getCell("perish")) || "").replace(/[^0-9.]/g, "")) || null;
          const cook_time_sec = parseFloat((toText(getCell("cook time")) || "").replace(/[^0-9.]/g, "")) || null;
          const priority = parseFloat((toText(getCell("priority")) || "").replace(/[^0-9.-]/g, "")) || null;
          const recipe_rule = toText(getCell("recipe"));
          const ingredients_text = toText(getCell("ingredients"));
          const notes = toText(getCell("notes"));

          return {
            name,
            stats: { hunger, sanity, health },
            perish_days,
            cook_time_sec,
            priority,
            recipe_rule,
            ingredients_text,
            notes
          };
        }).filter(Boolean);

        setRecipes(parsed);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    fetchRecipes();
  }, []);

  async function resolveIcon(name) {
    const key = name.toLowerCase();
    if (iconCache[key]) return iconCache[key];
    const fileTitle = encodeURIComponent(`File:${name}.png`);
    const url = `https://dontstarve.fandom.com/api.php?action=query&titles=${fileTitle}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const pages = json?.query?.pages || {};
      const first = Object.values(pages)[0];
      const direct = first?.imageinfo?.[0]?.url;
      if (direct) {
        setIconCache(prev => ({ ...prev, [key]: direct }));
        return direct;
      }
    } catch {}
    return null;
  }

  function useIcon(name) {
    const [src, setSrc] = useState(() => iconCache[name?.toLowerCase?.()] || null);
    useEffect(() => {
      let abort = false;
      if (!name) return;
      resolveIcon(name).then(url => { if (!abort) setSrc(url || null); });
      return () => { abort = true; };
    }, [name]);
    return src;
  }

  const matchingRecipes = useMemo(() => {
    const term = (selected || query).trim().toLowerCase();
    if (!term) return [];
    return recipes.filter(r =>
      r.name.toLowerCase().includes(term) ||
      (r.ingredients_text && r.ingredients_text.toLowerCase().includes(term)) ||
      (r.recipe_rule && r.recipe_rule.toLowerCase().includes(term)) ||
      (r.notes && r.notes.toLowerCase().includes(term))
    );
  }, [recipes, query, selected]);

  return (
    <div style={{minHeight:'100vh', background:'#0b0e13', color:'#fff', padding:'24px'}}>
      <div style={{maxWidth: '960px', margin: '0 auto'}}>
        <header style={{marginBottom:'24px'}}>
          <h1 style={{fontSize:'28px', fontWeight:700}}>DST Ingredient → Recipes Finder</h1>
          <p style={{opacity:.8, marginTop: '4px'}}>Live data from the Crock Pot Recipe Table on the DST wiki.</p>
        </header>

        <div style={{background:'#121622', borderRadius:'16px', padding:'16px', boxShadow:'0 6px 20px rgba(0,0,0,.25)', marginBottom:'16px'}}>
          <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Type ingredient..."
              style={{flex:1, background:'#0e1220', border:'1px solid #23263a', borderRadius:'12px', padding:'12px'}}
            />
            <button onClick={() => setSelected(query.trim())} style={{padding:'12px 16px', borderRadius:'12px', background:'#4f46e5', color:'#fff'}}>Search</button>
          </div>
          {loading && <div style={{marginTop:'8px', opacity:.8}}>Loading recipes…</div>}
          {error && <div style={{marginTop:'8px', color:'#f87171'}}>Failed to load recipe table: {error}</div>}
        </div>

        <section style={{display:'grid', gap:'12px'}}>
          {matchingRecipes.length === 0 && (selected || query) && !loading && (
            <div style={{opacity:.8}}>No matching recipes found.</div>
          )}
          {matchingRecipes.map(rec => (
            <div key={rec.name} style={{background:'#121622', borderRadius:'16px', padding:'16px', border:'1px solid #23263a', boxShadow:'0 6px 20px rgba(0,0,0,.25)'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap'}}>
                <h2 style={{fontSize:'18px', fontWeight:600}}>{rec.name}</h2>
                <div style={{fontSize:'12px', opacity:.75}}>
                  Hunger {rec.stats.hunger} · Health {rec.stats.health} · Sanity {rec.stats.sanity}
                </div>
              </div>
              {rec.recipe_rule && <div style={{marginTop:'8px', fontSize:'14px', opacity:.8}}><b>Rule:</b> {rec.recipe_rule}</div>}
              {rec.ingredients_text && <div style={{marginTop:'4px', fontSize:'14px', opacity:.8}}><b>Ingredients:</b> {rec.ingredients_text}</div>}
              {rec.notes && <div style={{marginTop:'4px', fontSize:'14px', opacity:.7}}><b>Notes:</b> {rec.notes}</div>}
            </div>
          ))}
        </section>

        <footer style={{opacity:.7, fontSize:'12px', marginTop:'24px'}}>
          Data from DST wiki (wiki.gg). Ingredient icons fetched from the DST Fandom wiki via its MediaWiki API.
        </footer>
      </div>
    </div>
  );
}