(() => {
  const STORAGE_KEYS = {
    VEICULOS: "cv_veiculos",
    MANUTENCOES: "cv_manutencoes",
  };

  /** @type {Array<{id:string,nome:string,tipo:string,kmAtual:number,criadoEm:string}>} */
  let veiculos = [];
  /** @type {Array<{id:string,veiculoId:string,data:string,descricao:string,tipo:string,km:number,kmGarantia?:number,mesesGarantia?:number,mecanico?:string,valorPeca?:number,valorServico?:number}>} */
  let manutencoes = [];

  let editingVeiculoId = null;
  let editingManutencaoId = null;

  const uuid = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2);

  const loadData = () => {
    try {
      veiculos = JSON.parse(localStorage.getItem(STORAGE_KEYS.VEICULOS)) || [];
      manutencoes =
        JSON.parse(localStorage.getItem(STORAGE_KEYS.MANUTENCOES)) || [];
    } catch (e) {
      console.error("Erro ao carregar dados", e);
      veiculos = [];
      manutencoes = [];
    }
  };

  const saveData = () => {
    localStorage.setItem(STORAGE_KEYS.VEICULOS, JSON.stringify(veiculos));
    localStorage.setItem(
      STORAGE_KEYS.MANUTENCOES,
      JSON.stringify(manutencoes)
    );
  };

  // Navegação
  const setupNavigation = () => {
    const navButtons = document.querySelectorAll(".nav-btn");
    const pageButtons = document.querySelectorAll("[data-goto]");
    const pages = document.querySelectorAll(".page");

    function showPage(id) {
      pages.forEach((p) => p.classList.toggle("active", p.id === id));
      navButtons.forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.goto === id)
      );
    }

    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.goto;
        if (id) showPage(id);
      });
    });

    pageButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.goto;
        if (id) showPage(id);
      });
    });
  };

  const calcularStatusManutencao = (m, veiculo) => {
    const hoje = new Date();
    const dataServico = m.data ? new Date(m.data) : null;

    let statusKm = "ok";
    let statusData = "ok";

    if (m.kmGarantia && veiculo) {
      const kmLimite = m.km + m.kmGarantia;
      const diffKm = veiculo.kmAtual - kmLimite;
      if (diffKm >= 0) statusKm = "vencido";
      else if (diffKm > -0.1 * m.kmGarantia) statusKm = "atencao";
    }

    if (m.mesesGarantia && dataServico) {
      const limite = new Date(dataServico);
      limite.setMonth(limite.getMonth() + m.mesesGarantia);
      const diffDias = (hoje - limite) / (1000 * 60 * 60 * 24);
      if (diffDias >= 0) statusData = "vencido";
      else if (diffDias > -30) statusData = "atencao";
    }

    const pesos = { ok: 0, atencao: 1, vencido: 2 };
    const nivel = Math.max(pesos[statusKm], pesos[statusData]);
    if (nivel === 2) return "vencido";
    if (nivel === 1) return "atencao";
    return "ok";
  };

  const renderVeiculos = () => {
    const lista = document.getElementById("lista-veiculos");
    const selManutencao = document.getElementById("manutencao-veiculo");
    const selFiltroVeiculo = document.getElementById("filtro-veiculo");
    const selKmVeiculo = document.getElementById("km-veiculo");
    const selDashVeiculo = document.getElementById("dashboard-veiculo");
    const listaKmResumo = document.getElementById("lista-km-resumo");

    if (lista) lista.innerHTML = "";
    if (selManutencao) selManutencao.innerHTML = "";
    if (selFiltroVeiculo) selFiltroVeiculo.innerHTML = "";
    if (selKmVeiculo) selKmVeiculo.innerHTML = "";
    if (selDashVeiculo) selDashVeiculo.innerHTML = "";
    if (listaKmResumo) listaKmResumo.innerHTML = "";

    if (!veiculos.length && lista) {
      lista.innerHTML =
        "<li class='list-item'>Nenhum veículo cadastrado ainda.</li>";
      return;
    }

    if (selFiltroVeiculo) {
      const optTodos = document.createElement("option");
      optTodos.value = "";
      optTodos.textContent = "Todos";
      selFiltroVeiculo.appendChild(optTodos);
    }

    veiculos.forEach((v) => {
      // lista
      if (lista) {
        const li = document.createElement("li");
        li.className = "list-item";
        li.innerHTML = `
          <div class="list-item-header">
            <strong>${v.nome}</strong>
            <span class="badge badge-pill">${v.tipo.toUpperCase()}</span>
          </div>
          <div style="font-size:.8rem;color:#9ca3af;margin-top:2px;">
            Km atual: <strong>${v.kmAtual.toLocaleString("pt-BR")}</strong>
          </div>
          <div style="margin-top:6px; display:flex; gap:8px;">
            <button class="btn small edit-veiculo" data-id="${v.id}">Editar</button>
            <button class="btn small delete-veiculo" data-id="${v.id}">Excluir</button>
          </div>
        `;
        lista.appendChild(li);
      }

      // selects
      const opt1 = document.createElement("option");
      opt1.value = v.id;
      opt1.textContent = v.nome;

      const opt2 = opt1.cloneNode(true);
      const opt3 = opt1.cloneNode(true);
      const opt4 = opt1.cloneNode(true);

      if (selManutencao) selManutencao.appendChild(opt1);
      if (selFiltroVeiculo) selFiltroVeiculo.appendChild(opt2);
      if (selKmVeiculo) selKmVeiculo.appendChild(opt3);
      if (selDashVeiculo) selDashVeiculo.appendChild(opt4);

      // resumo km
      if (listaKmResumo) {
        const liKm = document.createElement("li");
        liKm.className = "list-item";
        liKm.innerHTML = `
          <div class="list-item-header">
            <strong>${v.nome}</strong>
            <span>${v.kmAtual.toLocaleString("pt-BR")} km</span>
          </div>
        `;
        listaKmResumo.appendChild(liKm);
      }
    });

    // eventos editar / excluir veículo
    document.querySelectorAll(".edit-veiculo").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const v = veiculos.find((x) => x.id === id);
        if (!v) return;

        editingVeiculoId = id;

        document.getElementById("veiculo-nome").value = v.nome;
        document.getElementById("veiculo-tipo").value = v.tipo;
        document.getElementById("veiculo-km").value = v.kmAtual;

        const navBtn = document.querySelector('[data-goto="page-veiculos"]');
        if (navBtn) navBtn.click();
      };
    });

    document.querySelectorAll(".delete-veiculo").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (!confirm("Excluir este veículo e todas as suas manutenções?")) return;

        veiculos = veiculos.filter((v) => v.id !== id);
        manutencoes = manutencoes.filter((m) => m.veiculoId !== id);

        if (editingVeiculoId === id) editingVeiculoId = null;

        saveData();
        renderVeiculos();
        renderManutencoes();
        atualizarDashboard();
      };
    });
  };

  const renderManutencoes = () => {
    const lista = document.getElementById("lista-manutencoes");
    const filtroVeiculo = document.getElementById("filtro-veiculo");
    const filtroTipo = document.getElementById("filtro-tipo");

    if (!lista) return;
    lista.innerHTML = "";

    if (!manutencoes.length) {
      lista.innerHTML =
        "<li class='list-item'>Nenhuma manutenção registrada ainda.</li>";
      return;
    }

    const filtroVeiculoVal = filtroVeiculo ? filtroVeiculo.value : "";
    const filtroTipoVal = filtroTipo ? filtroTipo.value : "";

    const filtradas = manutencoes
      .filter((m) => {
        if (filtroVeiculoVal && m.veiculoId !== filtroVeiculoVal) return false;
        if (filtroTipoVal && m.tipo !== filtroTipoVal) return false;
        return true;
      })
      .sort(
        (a, b) =>
          ((a.data || "").localeCompare(b.data || "")) * -1 // mais recentes primeiro
      );

    if (!filtradas.length) {
      lista.innerHTML =
        "<li class='list-item'>Nenhuma manutenção com esse filtro.</li>";
      return;
    }

    filtradas.forEach((m) => {
      const v = veiculos.find((x) => x.id === m.veiculoId);
      const status = calcularStatusManutencao(m, v);
      let badgeClass = "badge-success";
      let badgeTexto = "Em dia";
      if (status === "atencao") {
        badgeClass = "badge-warning";
        badgeTexto = "Perto de vencer";
      } else if (status === "vencido") {
        badgeClass = "badge-danger";
        badgeTexto = "Vencido";
      }

      const valorPeca = m.valorPeca || 0;
      const valorServico = m.valorServico || 0;
      const total = valorPeca + valorServico;

      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="list-item-header">
          <strong>${m.descricao}</strong>
          <span class="badge ${badgeClass}">${badgeTexto}</span>
        </div>
        <div style="font-size:.75rem;color:#9ca3af;margin-top:2px;">
          Veículo: <strong>${v ? v.nome : "?"}</strong> • 
          ${m.data || "-"} • ${m.km.toLocaleString("pt-BR")} km
        </div>
        <div style="font-size:.75rem;color:#9ca3af;margin-top:2px;">
          Garantia: ${m.kmGarantia ? m.kmGarantia + " km" : "-"} / 
          ${m.mesesGarantia ? m.mesesGarantia + " meses" : "-"}
        </div>
        <div style="font-size:.75rem;color:#9ca3af;margin-top:2px;">
          Peça: R$ ${valorPeca.toFixed(2)} • Serviço: R$ ${valorServico.toFixed(
        2
      )} • 
          <strong>Total: R$ ${total.toFixed(2)}</strong>
        </div>
        ${
          m.mecanico
            ? `<div style="font-size:.75rem;color:#9ca3af;margin-top:2px;">Mecânico: ${m.mecanico}</div>`
            : ""
        }
        <div style="margin-top:6px; display:flex; gap:8px;">
          <button class="btn small edit-manutencao" data-id="${m.id}">Editar</button>
          <button class="btn small delete-manutencao" data-id="${m.id}">Excluir</button>
        </div>
      `;
      lista.appendChild(li);
    });

    // eventos editar / excluir manutenção
    document.querySelectorAll(".edit-manutencao").forEach((btn) => {
      btn.onclick = () => {
        const m = manutencoes.find((x) => x.id === btn.dataset.id);
        if (!m) return;

        editingManutencaoId = m.id;

        document.getElementById("manutencao-veiculo").value = m.veiculoId;
        document.getElementById("manutencao-data").value = m.data;
        document.getElementById("manutencao-descricao").value = m.descricao;
        document.getElementById("manutencao-tipo").value = m.tipo;
        document.getElementById("manutencao-km").value = m.km;
        document.getElementById("manutencao-km-garantia").value =
          m.kmGarantia || "";
        document.getElementById("manutencao-meses-garantia").value =
          m.mesesGarantia || "";
        document.getElementById("manutencao-mecanico").value =
          m.mecanico || "";
        document.getElementById("manutencao-valor-peca").value =
          m.valorPeca || "";
        document.getElementById("manutencao-valor-servico").value =
          m.valorServico || "";

        const navBtn = document.querySelector(
          '[data-goto="page-manutencoes"]'
        );
        if (navBtn) navBtn.click();
      };
    });

    document.querySelectorAll(".delete-manutencao").forEach((btn) => {
      btn.onclick = () => {
        if (!confirm("Excluir esta manutenção?")) return;
        manutencoes = manutencoes.filter((m) => m.id !== btn.dataset.id);
        if (editingManutencaoId === btn.dataset.id) editingManutencaoId = null;
        saveData();
        renderManutencoes();
        atualizarDashboard();
      };
    });
  };

  const atualizarDashboard = () => {
    const veiculoId = document.getElementById("dashboard-veiculo")?.value;
    const anoInput = document.getElementById("dashboard-ano")?.value;
    const resumoEl = document.getElementById("dashboard-resumo-financeiro");
    const barPecas = document.getElementById("bar-pecas");
    const barServicos = document.getElementById("bar-servicos");
    const barTotal = document.getElementById("bar-total");
    const labelPecas = document.getElementById("label-pecas");
    const labelServicos = document.getElementById("label-servicos");
    const labelTotal = document.getElementById("label-total");
    const listaSituacao = document.getElementById("dashboard-situacao");

    if (!resumoEl || !barPecas || !barServicos || !barTotal) return;

    if (!veiculoId) {
      resumoEl.textContent = "Selecione um veículo.";
      if (listaSituacao) listaSituacao.innerHTML = "";
      barPecas.style.width = "0%";
      barServicos.style.width = "0%";
      barTotal.style.width = "0%";
      if (labelPecas) labelPecas.textContent = "R$ 0,00";
      if (labelServicos) labelServicos.textContent = "R$ 0,00";
      if (labelTotal) labelTotal.textContent = "R$ 0,00";
      return;
    }

    const ano = anoInput || new Date().getFullYear();
    const v = veiculos.find((x) => x.id === veiculoId);

    const doAno = manutencoes.filter((m) => {
      if (m.veiculoId !== veiculoId) return false;
      if (!m.data) return false;
      return new Date(m.data).getFullYear() === Number(ano);
    });

    let totalPecas = 0;
    let totalServicos = 0;

    doAno.forEach((m) => {
      totalPecas += m.valorPeca || 0;
      totalServicos += m.valorServico || 0;
    });

    const total = totalPecas + totalServicos;
    const base = total || 1;

    barPecas.style.width = `${(totalPecas / base) * 100}%`;
    barServicos.style.width = `${(totalServicos / base) * 100}%`;
    barTotal.style.width = "100%";

    if (labelPecas)
      labelPecas.textContent = `R$ ${totalPecas.toFixed(2)}`;
    if (labelServicos)
      labelServicos.textContent = `R$ ${totalServicos.toFixed(2)}`;
    if (labelTotal) labelTotal.textContent = `R$ ${total.toFixed(2)}`;

    resumoEl.textContent = `Em ${ano}, o veículo ${
      v ? v.nome : ""
    } gastou R$ ${total.toFixed(2)} em manutenções (peças + serviços).`;

    if (!listaSituacao) return;
    listaSituacao.innerHTML = "";

    const mantVeiculo = manutencoes.filter((m) => m.veiculoId === veiculoId);
    if (!mantVeiculo.length) {
      listaSituacao.innerHTML =
        "<li class='list-item'>Nenhuma peça/serviço registrado para este veículo.</li>";
      return;
    }

    mantVeiculo.forEach((m) => {
      const status = calcularStatusManutencao(m, v);
      let badgeClass = "badge-success";
      let badgeTexto = "Em dia";
      if (status === "atencao") {
        badgeClass = "badge-warning";
        badgeTexto = "Perto de vencer";
      } else if (status === "vencido") {
        badgeClass = "badge-danger";
        badgeTexto = "Vencido";
      }

      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="list-item-header">
          <strong>${m.descricao}</strong>
          <span class="badge small ${badgeClass}">${badgeTexto}</span>
        </div>
        <div style="font-size:.75rem;color:#9ca3af;margin-top:2px;">
          ${m.km.toLocaleString("pt-BR")} km • Garantia: ${
        m.kmGarantia ? m.kmGarantia + " km" : "-"
      } / ${m.mesesGarantia ? m.mesesGarantia + " meses" : "-"}
        </div>
      `;
      listaSituacao.appendChild(li);
    });
  };

  const setupForms = () => {
    const formVeiculo = document.getElementById("form-veiculo");
    const formManutencao = document.getElementById("form-manutencao");
    const formKm = document.getElementById("form-km");
    const filtroVeiculo = document.getElementById("filtro-veiculo");
    const filtroTipo = document.getElementById("filtro-tipo");
    const btnDash = document.getElementById("btn-atualizar-dashboard");

    if (formVeiculo) {
      formVeiculo.addEventListener("submit", (e) => {
        e.preventDefault();
        const nome = document
          .getElementById("veiculo-nome")
          .value.trim();
        const tipo = document.getElementById("veiculo-tipo").value;
        const km = Number(
          document.getElementById("veiculo-km").value || 0
        );

        if (!nome) return;

        if (editingVeiculoId) {
          const v = veiculos.find((x) => x.id === editingVeiculoId);
          if (v) {
            v.nome = nome;
            v.tipo = tipo;
            v.kmAtual = km;
          }
          editingVeiculoId = null;
        } else {
          veiculos.push({
            id: uuid(),
            nome,
            tipo,
            kmAtual: km,
            criadoEm: new Date().toISOString(),
          });
        }

        saveData();
        formVeiculo.reset();
        renderVeiculos();
        atualizarDashboard();
      });
    }

    if (formManutencao) {
      formManutencao.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!veiculos.length) {
          alert("Cadastre um veículo antes de registrar manutenções.");
          return;
        }

        const dados = {
          veiculoId: document.getElementById("manutencao-veiculo").value,
          data: document.getElementById("manutencao-data").value,
          descricao: document
            .getElementById("manutencao-descricao")
            .value.trim(),
          tipo: document.getElementById("manutencao-tipo").value,
          km: Number(
            document.getElementById("manutencao-km").value || 0
          ),
          kmGarantia:
            Number(
              document.getElementById("manutencao-km-garantia").value || 0
            ) || undefined,
          mesesGarantia:
            Number(
              document.getElementById(
                "manutencao-meses-garantia"
              ).value || 0
            ) || undefined,
          mecanico:
            document
              .getElementById("manutencao-mecanico")
              .value.trim() || undefined,
          valorPeca:
            Number(
              document.getElementById("manutencao-valor-peca").value ||
                0
            ) || undefined,
          valorServico:
            Number(
              document.getElementById(
                "manutencao-valor-servico"
              ).value || 0
            ) || undefined,
        };

        if (editingManutencaoId) {
          const m = manutencoes.find(
            (x) => x.id === editingManutencaoId
          );
          if (m) Object.assign(m, dados);
          editingManutencaoId = null;
        } else {
          manutencoes.push({ id: uuid(), ...dados });
        }

        saveData();
        formManutencao.reset();
        renderManutencoes();
        atualizarDashboard();
      });
    }

    if (formKm) {
      formKm.addEventListener("submit", (e) => {
        e.preventDefault();
        const veiculoId = document.getElementById("km-veiculo").value;
        const km = Number(
          document.getElementById("km-atual").value || 0
        );
        const v = veiculos.find((x) => x.id === veiculoId);
        if (!v) return;
        v.kmAtual = km;
        saveData();
        formKm.reset();
        renderVeiculos();
        renderManutencoes();
        atualizarDashboard();
      });
    }

    if (filtroVeiculo) {
      filtroVeiculo.addEventListener("change", renderManutencoes);
    }
    if (filtroTipo) {
      filtroTipo.addEventListener("change", renderManutencoes);
    }
    if (btnDash) {
      btnDash.addEventListener("click", atualizarDashboard);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadData();
    setupNavigation();
    setupForms();
    renderVeiculos();
    renderManutencoes();
    atualizarDashboard();
  });
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
