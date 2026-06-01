// ===================== MOVIMENTAÇÕES (ENTRADAS E SAÍDAS) =====================

async function renderMovimentacoes() {
  const [ativos, colabs] = await Promise.all([dbGetAtivos(), dbGetColabs()]);
  _cacheAtivos = ativos; // atualiza cache global
  
  const dlAtivos = document.getElementById('movAtivosList');
  if (dlAtivos) {
    dlAtivos.innerHTML = ativos.map(a => `<option value="${a.patrimonio}">${a.nome} (${a.tipo || 'Equipamento'}) - Status atual: ${a.status}</option>`).join('');
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
    (a.nome && a.nome.toLowerCase() === patrimonioInput.toLowerCase())
  );

  if (!ativo) {
    notify('Máquina não encontrada com este patrimônio ou nome.', 'error');
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

  } catch (error) {
    notify(`Erro ao registrar movimentação: ${error.message || error}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
