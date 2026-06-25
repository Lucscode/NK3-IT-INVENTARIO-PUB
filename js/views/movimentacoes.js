// ===================== MOVIMENTAÇÕES (ENTRADAS E SAÍDAS) =====================

async function renderMovimentacoes() {
  const [ativos, colabs] = await Promise.all([dbGetAtivos(), dbGetColabs()]);
  _cacheAtivos = ativos; // atualiza cache global
  
  const dlAtivos = document.getElementById('movAtivosList');
  if (dlAtivos) {
    dlAtivos.innerHTML = ativos.map(a => `<option value="${a.patrimonio || a.serie || a.nome}">${a.nome} ${a.modelo ? '['+a.modelo+']' : ''} - Status: ${a.status} ${a.serie ? '- S/N: ' + a.serie : ''}</option>`).join('');
  }

  const dlColabs = document.getElementById('movColabsList');
  if (dlColabs) {
    dlColabs.innerHTML = colabs.map(c => `<option value="${c.nome}">${c.dept || ''} ${c.cargo || ''}</option>`).join('');
  }

  // Preenche a data com hoje
  const dEl = document.getElementById('movData');
  if (dEl && !dEl.value) {
    dEl.value = new Date().toISOString().split('T')[0];
  }

  toggleMovimentacaoTipo();
  await renderMovimentacoesHistory();
}

function toggleMovimentacaoTipo() {
  const type = document.querySelector('input[name="movTipo"]:checked')?.value;
  const colabContainer = document.getElementById('movColabContainer');
  
  if (colabContainer) {
    if (type === 'entrada') {
      colabContainer.style.display = 'none';
      document.getElementById('movColab').value = '';
    } else {
      colabContainer.style.display = '';
    }
  }
}

async function registrarMovimentacao() {
  const type = document.querySelector('input[name="movTipo"]:checked')?.value;
  const patrimonioInput = document.getElementById('movPatrimonio').value.trim();
  const colab = document.getElementById('movColab').value.trim();
  const data = document.getElementById('movData').value || new Date().toISOString().split('T')[0];
  const obs = document.getElementById('movObs').value.trim();
  const btn = document.getElementById('btnRegistrarMov');

  if (!patrimonioInput) {
    notify('Por favor, informe a máquina ou patrimônio.', 'error');
    return;
  }

  if (type === 'saida' && !colab) {
    notify('Para uma Saída, é obrigatório informar o Colaborador.', 'error');
    return;
  }

  // Localiza o ativo no cache
  const ativo = _cacheAtivos.find(a => 
    (a.patrimonio && a.patrimonio.toLowerCase() === patrimonioInput.toLowerCase()) || 
    (a.nome && a.nome.toLowerCase() === patrimonioInput.toLowerCase()) ||
    (a.serie && a.serie.toLowerCase() === patrimonioInput.toLowerCase())
  );

  if (!ativo) {
    notify('Máquina não encontrada com este patrimônio, nome ou S/N.', 'error');
    return;
  }

  try {
    if (btn) btn.disabled = true;
    notify('Registrando movimentação...', 'info');

    let updatePayload = {};
    const movId = '#' + Math.floor(1000 + Math.random() * 9000);
    let histPayload = {
      ativo_id: ativo.id,
      ativo_nome: `${ativo.nome} (${ativo.patrimonio})`,
      obs: obs
    };

    if (type === 'saida') {
      // Saída (Atribuição)
      updatePayload = {
        colab: colab,
        status: 'em uso'
      };
      histPayload.colab = colab;
      histPayload.atribuido = new Date(data).toISOString();
      histPayload.obs = histPayload.obs ? `${movId} - ${histPayload.obs}` : `${movId} - Atribuição registrada`;

    } else if (type === 'entrada') {
      // Entrada (Devolução)
      updatePayload = {
        colab: '',
        status: 'estoque' // Conforme aprovação do usuário
      };
      // No histórico, registramos quem era o colaborador que está devolvendo
      histPayload.colab = ativo.colab || 'Sistema';
      histPayload.devolvido = new Date(data).toISOString();
      histPayload.obs = histPayload.obs ? `${movId} - ${histPayload.obs}` : `${movId} - Devolução registrada`;
    }

    // 1. Atualizar o ativo
    await dbUpdateAtivo(ativo.id, updatePayload);
    
    // 2. Registrar no histórico
    await dbAddHistorico(histPayload);

    notify('Movimentação registrada com sucesso!', 'success');

    // Limpar form
    document.getElementById('movPatrimonio').value = '';
    document.getElementById('movColab').value = '';
    document.getElementById('movObs').value = '';
    
    // Recarregar os dados para manter o cache atualizado
    await renderMovimentacoes();
    await renderMovimentacoesHistory();

  } catch (error) {
    notify(`Erro ao registrar movimentação: ${error.message || error}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function renderMovimentacoesHistory() {
  const container = document.getElementById('movimentacoesHistoryTable');
  if (!container) return;
  container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);">Carregando histórico...</div>';

  try {
    const fullHistory = await dbGetHistorico();
    
    // Filtra apenas registros de movimentação (atribuído, devolvido, ou com a tag # de movimentação)
    const movs = fullHistory.filter(h => h.atribuido || h.devolvido || (h.obs && h.obs.match(/^#[0-9]{4}/)));

    if (!movs.length) {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text2);">Nenhuma movimentação registrada ainda.</div>';
      return;
    }

    const html = `
      <div class="table-wrap" style="max-height: 400px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ação</th>
              <th>Máquina</th>
              <th>Colaborador</th>
              <th>Observação</th>
              <th style="width: 50px;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${movs.slice(0, 50).map(h => {
              const isEntrada = !!h.devolvido || (h.obs && h.obs.toLowerCase().includes('devoluç'));
              const dateStr = h.atribuido || h.devolvido || h.created_at;
              const badge = isEntrada 
                ? '<span class="badge" style="background:var(--accent-bg,#3a3e26);color:var(--accent,#a3e635);"><i class="bi bi-box-arrow-in-left"></i> Entrada</span>'
                : '<span class="badge" style="background:var(--primary-bg,#1d3557);color:var(--primary,#60a5fa);"><i class="bi bi-box-arrow-right"></i> Saída</span>';
              
              return `<tr>
                <td style="font-size:12px;color:var(--text2);">${new Date(dateStr).toLocaleDateString('pt-BR')}</td>
                <td>${badge}</td>
                <td style="font-weight:600;font-size:13px;">${h.ativo_nome}</td>
                <td style="font-size:13px;">${h.colab || '—'}</td>
                <td style="font-size:12px;color:var(--text2);">${h.obs || '—'}</td>
                <td>
                  <button class="icon-btn" onclick="excluirMovimentacao('${h.id}')" title="Excluir movimentação">
                    <i class="bi bi-trash" style="color: var(--danger, #ef4444);"></i>
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div style="padding:24px;text-align:center;color:#f87171;">Erro ao carregar histórico.</div>';
  }
}

window.excluirMovimentacao = async function(id) {
  if (!confirm('Tem certeza que deseja excluir esta movimentação? Essa ação removerá o registro do histórico.')) return;
  
  try {
    notify('Excluindo movimentação...', 'info');
    await dbDeleteHistorico(id);
    notify('Movimentação excluída com sucesso!', 'success');
    await renderMovimentacoesHistory();
  } catch (error) {
    notify(`Erro ao excluir movimentação: ${error.message || error}`, 'error');
  }
}
