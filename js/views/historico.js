// ===================== HISTÓRICO =====================
async function renderHistorico() {
  const hist = await dbGetHistorico();
  _cacheHistorico = hist;

  const search = document.getElementById('globalSearch').value.toLowerCase();
  let list = hist;
  if (search) list = list.filter(h =>
    (h.ativo_nome||'').toLowerCase().includes(search) ||
    (h.colab||'').toLowerCase().includes(search)
  );

  // Subtítulo
  const sub = document.getElementById('pageSub');
  if (sub) sub.textContent = 'Registro de movimentações dos ativos';

  // Extrai patrimônio do nome: "Dell XPS (TI-001)" → "TI-001"
  function extractPatri(nome) {
    const m = (nome||'').match(/\(([^)]+)\)/);
    return m ? m[1] : '';
  }

  document.getElementById('histTableBody').innerHTML = list.map(h => {
    // Detect event type from obs field or dates
    let tipo, cor;
    if (h.obs && h.obs.startsWith('Exclusão')) {
      tipo = 'Exclusão'; cor = '#ef4444';
    } else if (h.obs && h.obs.startsWith('Anotação alterada')) {
      tipo = 'Anotação'; cor = '#8b5cf6';
    } else if (h.devolvido) {
      tipo = 'Devolução'; cor = '#10b981';
    } else if (h.atribuido) {
      tipo = 'Atribuição'; cor = '#3b82f6';
    } else {
      tipo = 'Cadastro'; cor = '#6366f1';
    }

    const initials= (h.colab||'S').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const patri   = extractPatri(h.ativo_nome);
    const nomeBase= (h.ativo_nome||'').replace(/\s*\([^)]*\)/,'').trim();
    // For annotation changes show the new text as a note
    const obsExtra = (h.obs && (h.obs.startsWith('Anotação alterada') || h.obs.startsWith('Exclusão')))
      ? `<div style="font-size:11px;color:var(--text3);margin-top:3px;font-style:italic;">${h.obs}</div>` : '';

    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:12px 16px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${cor}1a;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${cor};">
          ${initials}
        </div>
      </td>
      <td style="padding:12px 8px;">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap;">
          <span style="background:${cor}1a;color:${cor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;">${tipo}</span>
          ${patri ? `<span style="font-family:var(--mono);font-size:10px;color:var(--text2);background:var(--bg3);padding:2px 6px;border-radius:4px;">${patri}</span>` : ''}
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text);">${nomeBase||'—'}</div>
        ${h.colab ? `<div style="font-size:11px;color:var(--text2);margin-top:2px;">Colaborador: <span style="color:var(--accent)">${h.colab}</span></div>` : ''}
        ${obsExtra}
      </td>
      <td style="padding:12px 16px;text-align:right;white-space:nowrap;">
        <span style="font-size:11px;color:var(--text2);">${fmtDate(h.atribuido||h.created_at)}</span>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text2);">Nenhum histórico registrado</td></tr>`;
}
