// ===================== CSV IMPORT/EXPORT =====================
let csvImportType = '';

function openImportModal(type) {
  csvImportType = type;
  importTarget = type;
  document.getElementById('modalImportTitle').textContent = `Importar ${type === 'ativos' ? 'Ativos' : 'Colaboradores'}`;
  const hints = {
    ativos: 'Colunas esperadas: nome, patrimonio, marca, modelo, tipo, processador, ram, disco, so, status, saude, colab, localizacao, garantia, obs',
    colaboradores: 'Colunas esperadas: nome, email, departamento, cargo, telefone, status'
  };
  document.getElementById('importHint').textContent = hints[type] || '';
  document.getElementById('csvPreview').innerHTML = '';
  document.getElementById('btnImportConfirm').style.display = 'none';
  document.getElementById('csvFile').value = '';
  pendingCSVData = [];
  openModal('modalImport');
}

function handleCSV(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    pendingCSVData = lines.slice(1).map(l => {
      const vals = l.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || l.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, ''));
      return obj;
    }).filter(r => Object.values(r).some(v => v));

    if (pendingCSVData.length === 0) {
      document.getElementById('csvPreview').innerHTML = '<div class="alert alert-warn">⚠ Nenhum dado encontrado no arquivo.</div>';
      return;
    }

    document.getElementById('csvPreview').innerHTML = `
      <div class="alert alert-success">✅ ${pendingCSVData.length} registros encontrados</div>
      <div class="table-wrap" style="max-height:200px;overflow-y:auto;">
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${pendingCSVData.slice(0, 5).map(r => `<tr>${headers.map(h => `<td style="font-size:11px;">${r[h] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>${pendingCSVData.length > 5 ? `<p style="font-size:11px;color:var(--text2);margin-top:8px;">...e mais ${pendingCSVData.length - 5} registros</p>` : ''}`;
    document.getElementById('btnImportConfirm').style.display = 'flex';
  };
  reader.readAsText(file, 'UTF-8');
}

async function confirmImport() {
  if (!pendingCSVData.length) return;

  const btn = document.getElementById('btnImportConfirm');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Importando...';

  try {
    if (csvImportType === 'ativos') {
      const existentes = await dbGetAtivos();
      const patrimoniosExistentes = {};
      existentes.forEach(a => patrimoniosExistentes[a.patrimonio] = a.id);
      let importados = 0, atualizados = 0;

      // estado_saude: 1=Verde/bom, 2=Amarelo/regular, 3=Vermelho/ruim
      function parseSaude(val) {
        const v = String(val || '').trim().toLowerCase();
        if (v === '1' || v === 'verde'   || v === 'bom')     return 'bom';
        if (v === '2' || v === 'amarelo' || v === 'regular') return 'regular';
        if (v === '3' || v === 'vermelho'|| v === 'ruim')    return 'ruim';
        return 'bom';
      }

      // Normaliza status para o padrão do sistema
      function parseStatus(val) {
        const raw = String(val || '').split('-')[0];
        const v = raw.trim().toLowerCase().replace(/_/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (v.includes('disponiv') || v === 'livre')     return 'disponivel';
        if (v.includes('em uso')   || v === 'uso')       return 'em uso';
        if (v.includes('manutenc'))                      return 'manutencao';
        if (v.includes('estoque'))                       return 'estoque';
        if (v.includes('descart') || v.includes('inutiliz') || v.includes('extravi')) return 'descartado';
        if (v.includes('tatical') || v.includes('tactical')) return 'disponivel'; // Ignora "Sem Tatical"
        return 'disponivel'; // fallback seguro
      }

      for (const r of pendingCSVData) {
        const patrimonio = r.patrimonio || r['patrimônio'] || `IMP-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
        const marca  = r.marca  || '';
        const modelo = r.modelo || '';
        const payload = {
          nome:        r.nome || (marca && modelo ? `${marca} ${modelo}` : modelo || marca || 'Sem nome'),
          patrimonio,
          marca,
          modelo,
          serie:       r.numero_serie     || r.serie || r['número de série'] || r['numero de serie'] || '',
          tipo:        r.tipo             || 'Notebook',
          proc:        r.processador      || r.proc  || '',
          ram:         r.memoria_ram      || r.ram   || '',
          disco:       r.disco            || r.armazenamento || '',
          so:          r.sistema_operacional || r.so || r['sistema operacional'] || '',
          status:      parseStatus(r.status || r['situação'] || r.situacao || ''),
          saude:       parseSaude(r.estado_saude || r.saude || r['saúde']),
          colab:       r.colaborador_nome || r.colab || r.colaborador || '',
          localizacao: r.localizacao      || r['localização'] || '',
          garantia:    (() => { 
            let g = r.garantia_ate || r.garantia || '';
            if (g.includes('/')) {
              const p = g.split('/');
              if (p.length === 3) g = `${p[2]}-${p[1]}-${p[0]}`;
            }
            return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(g) ? g.split('T')[0] : null; 
          })(),
          obs:         [
            r.observacoes || r.obs || r['observações'] || '', 
            r.condicao || '',
            (() => {
              let g = r.garantia_ate || r.garantia || '';
              return g && !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(g) && !g.includes('/') ? `Garantia CSV: ${g}` : '';
            })()
          ].filter(Boolean).join(' | ') || '',
          emoji:       '💻',
        };

        if (patrimoniosExistentes[patrimonio]) {
          await dbUpdateAtivo(patrimoniosExistentes[patrimonio], payload);
          atualizados++;
        } else {
          await dbCreateAtivo(payload);
          importados++;
        }
      }

      const msg = [];
      if (importados > 0) msg.push(`${importados} criados`);
      if (atualizados > 0) msg.push(`${atualizados} atualizados`);
      notify(`✅ ${msg.join(', ')}!`);
      closeModal('modalImport');
      renderAtivos();
      updateStats();

    } else if (csvImportType === 'colaboradores') {
      let importados = 0;
      for (const r of pendingCSVData) {
        if (!r.nome) continue;
        await dbCreateColab({
          nome:   r.nome,
          email:  r.email || '',
          dept:   r.departamento || r.dept || '',
          cargo:  r.cargo || '',
          tel:    r.telefone || r.tel || '',
          status: r.status || 'ativo',
        });
        importados++;
      }
      notify(`✅ ${importados} colaboradores importados!`);
      closeModal('modalImport');
      renderColabs();
      refreshColabDatalist();
    }

  } catch (ex) {
    console.error('[CSV Import] Exceção:', ex);
    notify(`Erro inesperado: ${ex.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ===================== EXPORT =====================
async function exportCSV(type) {
  let csv = '', rows = [], headers = [];

  try {
    if (type === 'ativos') {
      const data = await dbGetAtivos();
      headers = ['id','nome','patrimonio','marca','modelo','serie','tipo','processador','ram','disco','so','status','saude','colaborador','localizacao','garantia','observacoes'];
      rows = data.map(a => [a.id, a.nome, a.patrimonio, a.marca||'', a.modelo||'', a.serie||'', a.tipo||'', a.proc||'', a.ram||'', a.disco||'', a.so||'', a.status||'', a.saude||'', a.colab||'', a.localizacao||'', a.garantia||'', a.obs||'']);

    } else if (type === 'colaboradores') {
      const data = await dbGetColabs();
      headers = ['id','nome','email','departamento','cargo','telefone','status'];
      rows = data.map(c => [c.id, c.nome, c.email||'', c.dept||'', c.cargo||'', c.tel||'', c.status||'']);

    } else if (type === 'historico') {
      const data = await dbGetHistorico();
      headers = ['id','ativo','colaborador','atribuido_em','devolvido_em'];
      rows = data.map(h => [h.id, h.ativo_nome||'', h.colab||'', h.atribuido||'', h.devolvido||'']);

    } else if (type === 'kits') {
      const data = await dbGetKitEstoque();
      headers = ['item','quantidade'];
      rows = Object.entries(data).map(([k, v]) => [k, v]);
    }

    csv = [headers.join(','), ...rows.map(r =>
      r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')
    )].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `techstock_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify(`Exportação de ${type} concluída!`);

  } catch (ex) {
    console.error('[Export CSV]', ex);
    notify(`Erro ao exportar: ${ex.message}`, 'error');
  }
}
