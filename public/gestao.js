/* ============================================================
   FALA PRODUÇÃO — gestao.js
   Central de Gestão (área administrativa)
   Consome a API pública exposta pelo script.js (window.FP).
   ============================================================ */
(function () {
  "use strict";

  if (!window.FP) { return; }

  var toast = window.FP.toast;
  var esc = window.FP.esc;
  var store = window.FP.store;
  var session = window.FP.session;
  var CATS = window.FP.cats;
  var SETORES = window.FP.setores;
  var STATUS_META = window.FP.statusMeta;
  var normalizar = window.FP.normalizar;

  /* ------------------------------------------------------------
     Proteção: sem sessão, volta para o login
  ------------------------------------------------------------ */
  if (!session.get("fp-user", null)) {
    window.location.replace("login.html");
    return;
  }

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------
     Helpers de data
  ------------------------------------------------------------ */
  function diasAtras(n) {
    return new Date(Date.now() - n * 86400000).toISOString();
  }
  function fmtData(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return "—"; }
    var dd = ("0" + d.getDate()).slice(-2);
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    return dd + "/" + mm + "/" + d.getFullYear();
  }
  function tempoRelativo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var min = Math.floor(diff / 60000);
    if (min < 1) { return "agora"; }
    if (min < 60) { return "há " + min + " min"; }
    var h = Math.floor(min / 60);
    if (h < 24) { return "há " + h + " h"; }
    var dias = Math.floor(h / 24);
    return dias === 1 ? "ontem" : "há " + dias + " dias";
  }
  function fmtHist(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return "—"; }
    var dd = ("0" + d.getDate()).slice(-2);
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2);
    var mi = ("0" + d.getMinutes()).slice(-2);
    return dd + "/" + mm + " " + hh + ":" + mi;
  }

  /* ------------------------------------------------------------
     Dados mock + envios reais dos colaboradores
     INTEGRAÇÃO: substituir por supabase.from("manifestacoes").select()
  ------------------------------------------------------------ */
  function grupoDe(categoria) {
    if (categoria === "seguranca") { return "risco"; }
    if (categoria === "sugestao") { return "sugestao"; }
    if (categoria === "reconhecimento") { return "reconhecimento"; }
    return "problema"; /* equipamento, material, processo, ambiente, outro */
  }

  var GRUPO_LABEL = {
    problema: "Problema",
    sugestao: "Sugestão",
    risco: "Risco de segurança",
    reconhecimento: "Reconhecimento"
  };

  var MOCK = [
    { protocolo: "FALA #000184", categoria: "equipamento", setor: "feed", status: "tratamento", prioridade: "alta", responsavel: "Marcos", dias: 0.1, autor: "", anonimo: true, atualizado: "há 2 h", desc: "Misturador da linha 2 apresentando vibração excessiva e ruído anormal. Já foi aberto chamado de manutenção, mas sem previsão." },
    { protocolo: "FALA #000183", categoria: "processo", setor: "food", status: "analise", prioridade: "media", responsavel: "Marina", dias: 0.3, autor: "Carlos Mendes", anonimo: false, contato: "carlos.mendes@empresa.com", atualizado: "há 5 h", desc: "O retrabalho na etapa de embalagem aumentou após a mudança de fornecedor. Sugiro revisar o padrão de corte." },
    { protocolo: "FALA #000182", categoria: "material", setor: "logistica", status: "recebido", prioridade: "media", responsavel: "", dias: 0.5, autor: "", anonimo: true, atualizado: "há 8 h", desc: "Paletes chegando com madeira solta, risco de acidente na descarga e atraso na conferência." },
    { protocolo: "FALA #000181", categoria: "seguranca", setor: "feed", status: "resolvido", prioridade: "critica", responsavel: "Renata", dias: 1, autor: "Ana Souza", anonimo: false, contato: "10234", atualizado: "ontem", resolvidoDias: 1, desc: "Corrimão da escada da caldeira solto. Risco de queda para quem acessa a plataforma superior." },
    { protocolo: "FALA #000180", categoria: "sugestao", setor: "food", status: "analise", prioridade: "baixa", responsavel: "Paulo", dias: 1.2, autor: "", anonimo: true, atualizado: "ontem", desc: "Criar um quadro visual de metas diárias no refeitório para aumentar o engajamento das equipes." },
    { protocolo: "FALA #000179", categoria: "seguranca", setor: "logistica", status: "tratamento", prioridade: "alta", responsavel: "Renata", dias: 2, autor: "Rafael Lima", anonimo: false, contato: "rafael.lima@empresa.com", atualizado: "há 2 dias", desc: "Empilhadeira circulando em área de pedestres sem sinalização sonora. Necessário demarcar rota exclusiva." },
    { protocolo: "FALA #000178", categoria: "reconhecimento", setor: "feed", status: "resolvido", prioridade: "baixa", responsavel: "Marina", dias: 2.2, autor: "Equipe Turno B", anonimo: false, contato: "turnob@empresa.com", atualizado: "há 2 dias", resolvidoDias: 1, desc: "Reconhecer a equipe do turno B que bateu o recorde de produção com zero acidentes neste mês." },
    { protocolo: "FALA #000177", categoria: "equipamento", setor: "outros", status: "recebido", prioridade: "media", responsavel: "", dias: 3, autor: "", anonimo: true, atualizado: "há 3 dias", desc: "Ar-condicionado da sala de controle com goteira sobre o painel elétrico." },
    { protocolo: "FALA #000176", categoria: "processo", setor: "food", status: "tratamento", prioridade: "media", responsavel: "Marcos", dias: 3.4, autor: "Juliana Alves", anonimo: false, contato: "juliana.alves@empresa.com", atualizado: "há 3 dias", desc: "A ordem de produção chega com atraso e gera parada de linha no início do turno." },
    { protocolo: "FALA #000175", categoria: "ambiente", setor: "feed", status: "analise", prioridade: "baixa", responsavel: "Paulo", dias: 4, autor: "", anonimo: true, atualizado: "há 4 dias", desc: "Vestiário do turno noturno com iluminação insuficiente e armários danificados." },
    { protocolo: "FALA #000174", categoria: "material", setor: "logistica", status: "resolvido", prioridade: "media", responsavel: "Marcos", dias: 4.2, autor: "Pedro Rocha", anonimo: false, contato: "pedro.rocha@empresa.com", atualizado: "há 4 dias", resolvidoDias: 2, desc: "Etiquetas de rastreabilidade borrando com umidade, dificultando a leitura no WMS." },
    { protocolo: "FALA #000173", categoria: "outro", setor: "food", status: "recebido", prioridade: "baixa", responsavel: "", dias: 5, autor: "", anonimo: true, atualizado: "há 5 dias", desc: "Sugestão de horário flexível para o café da manhã no refeitório." },
    { protocolo: "FALA #000172", categoria: "seguranca", setor: "feed", status: "resolvido", prioridade: "critica", responsavel: "Renata", dias: 5.3, autor: "Marcos Vieira", anonimo: false, contato: "marcos.vieira@empresa.com", atualizado: "há 5 dias", resolvidoDias: 2, desc: "Vazamento de óleo hidráulico próximo à prensa, piso escorregadio." },
    { protocolo: "FALA #000171", categoria: "sugestao", setor: "logistica", status: "analise", prioridade: "media", responsavel: "Marina", dias: 6, autor: "", anonimo: true, atualizado: "há 6 dias", desc: "Implantar checklist digital de expedição para reduzir erros de separação." },
    { protocolo: "FALA #000170", categoria: "equipamento", setor: "food", status: "tratamento", prioridade: "alta", responsavel: "Marcos", dias: 6.4, autor: "Tereza Nunes", anonimo: false, contato: "tereza.nunes@empresa.com", atualizado: "há 6 dias", desc: "Forno 3 com variação de temperatura fora da especificação, afetando a qualidade do produto." },
    { protocolo: "FALA #000169", categoria: "processo", setor: "feed", status: "resolvido", prioridade: "media", responsavel: "Marina", dias: 7, autor: "", anonimo: true, atualizado: "há 7 dias", resolvidoDias: 3, desc: "Falta de padrão na passagem de turno está gerando retrabalho e perda de informação." },
    { protocolo: "FALA #000168", categoria: "ambiente", setor: "outros", status: "encerrado", prioridade: "baixa", responsavel: "Paulo", dias: 8, autor: "Diego Farias", anonimo: false, contato: "diego.farias@empresa.com", atualizado: "há 8 dias", resolvidoDias: 4, desc: "Solicitação de melhoria na acústica da sala de reuniões atendida e encerrada." },
    { protocolo: "FALA #000167", categoria: "material", setor: "logistica", status: "encerrado", prioridade: "media", responsavel: "Marcos", dias: 9, autor: "", anonimo: true, atualizado: "há 9 dias", resolvidoDias: 5, desc: "Reposição de filme stretch normalizada após acordo com fornecedor." }
  ];

  var registros = [];

  function carregarRegistros() {
    registros = MOCK.map(function (m) {
      return {
        id: m.protocolo,
        protocolo: m.protocolo,
        data: diasAtras(m.dias),
        categoria: m.categoria,
        categoriaLabel: CATS[m.categoria] || "Outro",
        grupo: grupoDe(m.categoria),
        setor: m.setor,
        setorLabel: SETORES[m.setor] || "Prefiro não informar",
        status: m.status,
        prioridade: m.prioridade,
        responsavel: m.responsavel,
        autor: m.autor,
        anonimo: m.anonimo,
        contato: m.contato || "",
        descricao: m.desc,
        atualizado: m.atualizado,
        resolvidoDias: m.resolvidoDias || 0,
        obs: [],
        retorno: "",
        hist: [
          { d: diasAtras(m.dias), t: "Manifestação recebida" },
          (m.status !== "recebido" ? { d: diasAtras(m.dias - 0.2), t: "Alterado para \u201CEm análise\u201D" } : null),
          (m.status === "tratamento" || m.status === "resolvido" || m.status === "encerrado" ? { d: diasAtras(m.dias - 0.5), t: "Alterado para \u201CEm tratamento\u201D" } : null),
          (m.responsavel ? { d: diasAtras(m.dias - 0.6), t: "Responsável definido: " + m.responsavel } : null),
          (m.status === "resolvido" ? { d: diasAtras(m.dias - (m.resolvidoDias || 1)), t: "Alterado para \u201CResolvido\u201D" } : null),
          (m.status === "encerrado" ? { d: diasAtras(m.dias - (m.resolvidoDias || 1)), t: "Protocolo encerrado" } : null)
        ].filter(Boolean),
        nova: false
      };
    });

    /* envios reais dos colaboradores (mesmo navegador) */
    var reais = store.get("fp-submissions", []);
    if (Array.isArray(reais)) {
      reais.forEach(function (s) {
        registros.unshift({
          id: s.protocolo,
          protocolo: s.protocolo,
          data: s.data,
          categoria: s.categoria,
          categoriaLabel: s.categoriaLabel || CATS[s.categoria] || "Outro",
          grupo: grupoDe(s.categoria),
          setor: s.setor,
          setorLabel: s.setorLabel || SETORES[s.setor] || "Prefiro não informar",
          status: s.status || "recebido",
          prioridade: "media",
          responsavel: "",
          autor: s.anonimo ? "" : (s.nome || ""),
          anonimo: !!s.anonimo,
          contato: s.contato || "",
          descricao: s.descricao || "",
          atualizado: tempoRelativo(s.data),
          resolvidoDias: 0,
          obs: [],
          retorno: "",
          hist: [{ d: s.data, t: "Manifestação recebida" }],
          nova: true
        });
      });
    }
  }

  function persistir(r) {
    /* INTEGRAÇÃO: supabase.from("manifestacoes").update(r).eq("id", r.id) */
    var subs = store.get("fp-submissions", []);
    if (!Array.isArray(subs)) { subs = []; }
    for (var i = 0; i < subs.length; i++) {
      if (subs[i].protocolo === r.protocolo) {
        subs[i].status = r.status;
        store.set("fp-submissions", subs);
        return;
      }
    }
  }

  /* ------------------------------------------------------------
     Navegação entre views + topbar
  ------------------------------------------------------------ */
  var TITULOS = {
    dashboard: "Dashboard",
    manifestacoes: "Manifestações",
    tratamento: "Em tratamento",
    resolvidas: "Resolvidas",
    relatorios: "Relatórios",
    usuarios: "Usuários",
    config: "Configurações"
  };

  function atualizarCounts() {
    var total = registros.length;
    var tratamento = registros.filter(function (r) { return r.status === "tratamento"; }).length;
    var resolvidas = registros.filter(function (r) { return r.status === "resolvido"; }).length;
    var elTotal = $("#nav-count-total");
    var elTrat = $("#nav-count-tratamento");
    var elRes = $("#nav-count-resolvidas");
    if (elTotal) { elTotal.textContent = String(total); }
    if (elTrat) { elTrat.textContent = String(tratamento); }
    if (elRes) { elRes.textContent = String(resolvidas); }
  }

  function irParaView(nome, presetStatus) {
    $$(".g-view").forEach(function (v) { v.classList.remove("active"); });
    var alvo = $("#view-" + nome);
    if (alvo) { alvo.classList.add("active"); }

    $$(".g-nav-item").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === nome);
    });

    var titulo = $("#g-view-title");
    if (titulo) { titulo.textContent = TITULOS[nome] || nome; }

    if (nome === "manifestacoes" && presetStatus) {
      var sel = $("#f-status");
      if (sel) { sel.value = presetStatus; aplicarFiltros(); }
    }
    if (nome === "tratamento" || nome === "resolvidas") { renderListaFixa(nome); }

    /* fecha o menu mobile */
    var shell = $("#g-shell");
    if (shell) { shell.classList.remove("nav-open"); }

    var main = $(".g-main");
    if (main) { main.scrollTop = 0; }
  }

  /* ------------------------------------------------------------
     Dashboard
  ------------------------------------------------------------ */
  function renderBars(container, dados) {
    if (!container) { return; }
    var max = 1;
    dados.forEach(function (d) { if (d.valor > max) { max = d.valor; } });
    container.innerHTML = dados.map(function (d) {
      var pct = Math.round((d.valor / max) * 100);
      return "<div class=\"g-bar-row\">" +
        "<span class=\"g-bar-label\">" + esc(d.rotulo) + "</span>" +
        "<span class=\"g-bar-track\"><span class=\"g-bar-fill\" style=\"width:0;background:" + d.cor + "\"></span></span>" +
        "<span class=\"g-bar-num\">" + d.valor + "</span>" +
        "</div>";
    }).join("");
    /* anima a largura */
    window.setTimeout(function () {
      $$(".g-bar-fill", container).forEach(function (el, i) {
        el.style.width = Math.round((dados[i].valor / max) * 100) + "%";
      });
    }, 60);
  }

  var COR_STATUS = {
    recebido: "#8A93A6",
    analise: "#E8A200",
    tratamento: "#F26419",
    resolvido: "#22A45D",
    encerrado: "#A9977F"
  };

  function renderDashboard() {
    var total = registros.length;
    var analise = registros.filter(function (r) { return r.status === "analise"; }).length;
    var tratamento = registros.filter(function (r) { return r.status === "tratamento"; }).length;
    var resolvidas = registros.filter(function (r) { return r.status === "resolvido"; }).length;

    var elTotal = $("#stat-total");
    var elAnalise = $("#stat-analise");
    var elTrat = $("#stat-tratamento");
    var elRes = $("#stat-resolvidas");
    if (elTotal) { elTotal.textContent = String(total); }
    if (elAnalise) { elAnalise.textContent = String(analise); }
    if (elTrat) { elTrat.textContent = String(tratamento); }
    if (elRes) { elRes.textContent = String(resolvidas); }

    renderBars($("#chart-status"), [
      { rotulo: "Recebidas", valor: registros.filter(function (r) { return r.status === "recebido"; }).length, cor: COR_STATUS.recebido },
      { rotulo: "Em análise", valor: analise, cor: COR_STATUS.analise },
      { rotulo: "Em tratamento", valor: tratamento, cor: COR_STATUS.tratamento },
      { rotulo: "Resolvidas", valor: resolvidas, cor: COR_STATUS.resolvido }
    ]);

    renderBars($("#chart-categoria"), [
      { rotulo: "Problemas", valor: registros.filter(function (r) { return r.grupo === "problema"; }).length, cor: "#F26419" },
      { rotulo: "Sugestões", valor: registros.filter(function (r) { return r.grupo === "sugestao"; }).length, cor: "#FFB627" },
      { rotulo: "Riscos", valor: registros.filter(function (r) { return r.grupo === "risco"; }).length, cor: "#C6403C" },
      { rotulo: "Reconhecimentos", valor: registros.filter(function (r) { return r.grupo === "reconhecimento"; }).length, cor: "#22A45D" }
    ]);

    var recentes = registros.slice().sort(function (a, b) { return new Date(b.data) - new Date(a.data); }).slice(0, 6);
    var lista = $("#recentes-list");
    if (lista) {
      lista.innerHTML = recentes.map(function (r) {
        var meta = STATUS_META[r.status] || STATUS_META.recebido;
        return "<button type=\"button\" class=\"g-recente\" data-protocolo=\"" + esc(r.protocolo) + "\">" +
          "<span class=\"g-recente-dot\" style=\"background:" + (COR_STATUS[r.status] || "#ccc") + "\"></span>" +
          "<span class=\"g-recente-main\"><strong>" + esc(r.protocolo) + "</strong><small>" + esc(r.categoriaLabel) + " · " + esc(r.setorLabel) + "</small></span>" +
          "<span class=\"gb " + meta.badge.replace("badge-", "gb-") + "\">" + meta.label + "</span>" +
          "<span class=\"g-recente-hora\">" + esc(r.atualizado) + "</span>" +
          "</button>";
      }).join("");
    }
  }

  /* ------------------------------------------------------------
     Tabelas
  ------------------------------------------------------------ */
  function linhaTabela(r) {
    var meta = STATUS_META[r.status] || STATUS_META.recebido;
    var gp = { baixa: "gp-baixa", media: "gp-media", alta: "gp-alta", critica: "gp-critica" }[r.prioridade] || "gp-media";
    var gpLabel = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" }[r.prioridade] || "Média";
    return "<tr data-protocolo=\"" + esc(r.protocolo) + "\" class=\"" + (r.nova ? "g-row-new" : "") + "\">" +
      "<td data-label=\"Protocolo\" class=\"g-td-protocol\"><strong>" + esc(r.protocolo) + "</strong>" + (r.nova ? "<span class=\"g-new-tag\">nova</span>" : "") + "</td>" +
      "<td data-label=\"Data\">" + fmtData(r.data) + "</td>" +
      "<td data-label=\"Categoria\">" + esc(GRUPO_LABEL[r.grupo] || r.categoriaLabel) + "</td>" +
      "<td data-label=\"Setor\">" + esc(r.setorLabel) + "</td>" +
      "<td data-label=\"Status\"><span class=\"gb " + meta.badge.replace("badge-", "gb-") + "\">" + meta.label + "</span></td>" +
      "<td data-label=\"Prioridade\"><span class=\"gp " + gp + "\">" + gpLabel + "</span></td>" +
      "<td data-label=\"Responsável\">" + (r.responsavel ? esc(r.responsavel) : "<span class=\"g-muted\">—</span>") + "</td>" +
      "<td data-label=\"Atualização\">" + esc(r.atualizado) + "</td>" +
      "<td data-label=\"Ações\"><button type=\"button\" class=\"g-btn-acao\">Abrir</button></td>" +
      "</tr>";
  }

  function estadoFiltros() {
    return {
      busca: $("#f-busca") ? $("#f-busca").value : "",
      status: $("#f-status") ? $("#f-status").value : "todos",
      categoria: $("#f-categoria") ? $("#f-categoria").value : "todos",
      setor: $("#f-setor") ? $("#f-setor").value : "todos",
      de: $("#f-de") ? $("#f-de").value : "",
      ate: $("#f-ate") ? $("#f-ate").value : ""
    };
  }

  function filtrar() {
    var f = estadoFiltros();
    var termo = normalizar(f.busca);
    return registros.filter(function (r) {
      if (f.status !== "todos" && r.status !== f.status) { return false; }
      if (f.categoria !== "todos" && r.grupo !== f.categoria) { return false; }
      if (f.setor !== "todos" && r.setor !== f.setor) { return false; }
      if (f.de && new Date(r.data) < new Date(f.de + "T00:00:00")) { return false; }
      if (f.ate && new Date(r.data) > new Date(f.ate + "T23:59:59")) { return false; }
      if (termo) {
        var alvo = normalizar(r.protocolo + " " + r.categoriaLabel + " " + r.setorLabel + " " + (r.responsavel || "") + " " + (r.autor || ""));
        if (alvo.indexOf(termo) === -1) { return false; }
      }
      return true;
    });
  }

  function renderTabela() {
    var lista = filtrar();
    var tbody = $("#tabela-manifestacoes");
    var cont = $("#tabela-contagem");
    if (tbody) {
      if (!lista.length) {
        tbody.innerHTML = "<tr class=\"g-empty\"><td colspan=\"9\"><strong>Nenhuma manifestação encontrada</strong><small>Ajuste os filtros ou o termo de busca.</small></td></tr>";
      } else {
        tbody.innerHTML = lista.map(linhaTabela).join("");
      }
    }
    if (cont) {
      cont.textContent = lista.length === 1 ? "1 manifestação exibida" : lista.length + " manifestações exibidas";
    }
    return lista;
  }

  function renderListaFixa(nome) {
    var statusAlvo = nome === "tratamento" ? "tratamento" : "resolvido";
    var lista = registros.filter(function (r) { return r.status === statusAlvo; });
    var tbody = $("#tabela-" + nome);
    if (!tbody) { return; }
    if (!lista.length) {
      tbody.innerHTML = "<tr class=\"g-empty\"><td colspan=\"9\"><strong>Nada por aqui</strong><small>Nenhuma manifestação neste status.</small></td></tr>";
    } else {
      tbody.innerHTML = lista.map(linhaTabela).join("");
    }
  }

  /* ------------------------------------------------------------
     Exportação CSV
  ------------------------------------------------------------ */
  function exportarCSV(lista) {
    var cabecalho = ["Protocolo", "Data", "Categoria", "Setor", "Status", "Prioridade", "Responsável", "Atualizado"];
    var linhas = lista.map(function (r) {
      return [
        r.protocolo, fmtData(r.data), GRUPO_LABEL[r.grupo] || r.categoriaLabel, r.setorLabel,
        (STATUS_META[r.status] || {}).label || r.status, r.prioridade, r.responsavel || "", r.atualizado
      ].map(function (c) { return "\"" + String(c).replace(/"/g, "\"\"") + "\""; }).join(";");
    });
    var csv = "\uFEFF" + cabecalho.join(";") + "\n" + linhas.join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "manifestacoes-fala-producao.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("CSV exportado com " + lista.length + " registro(s).", "ok");
  }

  /* ------------------------------------------------------------
     Modal de detalhes
  ------------------------------------------------------------ */
  var modalDetalhe = null;
  var registroAtual = null;

  function acharRegistro(protocolo) {
    for (var i = 0; i < registros.length; i++) {
      if (registros[i].protocolo === protocolo) { return registros[i]; }
    }
    return null;
  }

  function abrirDetalhe(protocolo) {
    var r = acharRegistro(protocolo);
    if (!r) { return; }
    registroAtual = r;
    modalDetalhe = modalDetalhe || $("#modal-detalhe");

    $("#gm-protocolo").textContent = r.protocolo;
    $("#gm-sub").textContent = "aberto em " + fmtData(r.data) + " · " + r.atualizado;

    var meta = STATUS_META[r.status] || STATUS_META.recebido;
    $("#gm-badges").innerHTML =
      "<span class=\"gb " + meta.badge.replace("badge-", "gb-") + "\">" + meta.label + "</span>" +
      (r.nova ? "<span class=\"gb gb-tratamento\">nova</span>" : "");

    $("#gm-data").textContent = fmtData(r.data);
    $("#gm-categoria").textContent = GRUPO_LABEL[r.grupo] || r.categoriaLabel;
    $("#gm-setor").textContent = r.setorLabel;
    $("#gm-descricao").textContent = r.descricao || "Sem descrição.";

    var ident = $("#gm-identificacao");
    if (r.anonimo) {
      ident.innerHTML = "<div class=\"gm-anon\">" +
        "<svg viewBox=\"0 0 24 24\" width=\"22\" height=\"22\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 11a5 5 0 1 0-10 0M5 11v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6M12 15v2\"/></svg>" +
        "<div><strong>Manifestação anônima</strong><small>O colaborador optou por não se identificar.</small></div></div>";
    } else {
      ident.innerHTML = "<div class=\"gm-id\">" +
        "<div><small>Nome</small><strong>" + esc(r.autor || "Colaborador") + "</strong></div>" +
        "<div><small>Contato</small><strong>" + esc(r.contato || "—") + "</strong></div></div>";
    }

    $("#gm-status").value = r.status;
    $("#gm-prioridade").value = r.prioridade || "media";
    $("#gm-responsavel").value = r.responsavel || "";
    $("#gm-obs").value = "";
    $("#gm-retorno").value = "";

    renderObs();
    renderRetorno();
    renderHist();

    modalDetalhe.hidden = false;
    void modalDetalhe.offsetWidth;
    modalDetalhe.classList.add("open");
    document.body.classList.add("g-lock");
  }

  function fecharDetalhe() {
    if (!modalDetalhe) { return; }
    modalDetalhe.classList.remove("open");
    window.setTimeout(function () {
      modalDetalhe.hidden = true;
      document.body.classList.remove("g-lock");
    }, 240);
  }

  function renderObs() {
    var el = $("#gm-obs-list");
    if (!el || !registroAtual) { return; }
    el.innerHTML = registroAtual.obs.map(function (o) {
      return "<div class=\"gm-obs\"><small>" + esc(o.d) + " · " + esc(o.autor) + "</small><p>" + esc(o.t) + "</p></div>";
    }).join("");
  }

  function renderRetorno() {
    var el = $("#gm-retorno-enviado");
    if (!el || !registroAtual) { return; }
    if (registroAtual.retorno) {
      el.innerHTML = "<div class=\"gm-retorno-enviado\"><small>Retorno enviado ao colaborador</small><p>" + esc(registroAtual.retorno) + "</p></div>";
    } else {
      el.innerHTML = "";
    }
  }

  function renderHist() {
    var el = $("#gm-hist");
    if (!el || !registroAtual) { return; }
    var itens = registroAtual.hist.slice().reverse();
    el.innerHTML = itens.map(function (h) {
      return "<div class=\"gm-hist-item\"><span class=\"gm-hist-dot\"></span><small>" + esc(fmtHist(h.d)) + "</small><p>" + esc(h.t) + "</p></div>";
    }).join("");
  }

  function atualizarTudo() {
    atualizarCounts();
    renderDashboard();
    renderTabela();
  }

  /* ============================================================
     USUÁRIOS — cadastro de quem pode acessar e ver o canal
     Demonstração: persistido em localStorage (fp-users).
     INTEGRAÇÃO: supabase.auth.admin.createUser + profiles (RLS).
  ------------------------------------------------------------ */
  var USUARIOS_SEED = [
    { id: "u-admin", nome: "Administrador", email: "admin@empresa.com", perfil: "Admin", acessar: true, ver: true, fixo: true },
    { id: "u-gestao", nome: "Marina Costa", email: "gestao@empresa.com", perfil: "Gestão", acessar: true, ver: true },
    { id: "u-rh", nome: "Paulo Ribeiro", email: "rh@empresa.com", perfil: "RH", acessar: true, ver: true },
    { id: "u-seg", nome: "Renata Farias", email: "seguranca@empresa.com", perfil: "Segurança", acessar: false, ver: true }
  ];

  function initUsuarios() {
    var tbody = $("#tabela-usuarios");
    var form = $("#form-usuario");
    if (!tbody || !form) { return; }

    var usuarios = store.get("fp-users", null);
    if (!Array.isArray(usuarios)) {
      usuarios = USUARIOS_SEED.slice();
      store.set("fp-users", usuarios);
    }

    var editandoId = null;
    var fNome = $("#u-nome");
    var fEmail = $("#u-email");
    var fPerfil = $("#u-perfil");
    var pAcessar = $("#u-perm-acessar");
    var pVer = $("#u-perm-ver");
    var permErro = $("#u-perm-erro");
    var titulo = $("#usuarios-form-titulo");
    var btnSubmit = $("#u-submit");
    var btnCancel = $("#u-cancelar");
    var contagem = $("#usuarios-contagem");
    var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var PERFIL_BADGE = {
      "Admin": "gb-tratamento",
      "Gestão": "gb-analise",
      "RH": "gb-recebido",
      "Segurança": "gb-encerrado",
      "Visualização": "gb-recebido"
    };

    function render() {
      tbody.innerHTML = usuarios.map(function (u) {
        var perms = "";
        if (u.acessar) { perms += "<i>Acessar</i>"; }
        if (u.ver) { perms += '<i class="perm-ver">Ver</i>'; }
        if (!perms) { perms = '<span class="g-muted">—</span>'; }
        return "<tr>" +
          '<td data-label="Nome"><strong>' + esc(u.nome) + "</strong></td>" +
          '<td data-label="E-mail">' + esc(u.email) + "</td>" +
          '<td data-label="Perfil"><span class="gb ' + (PERFIL_BADGE[u.perfil] || "gb-recebido") + '">' + esc(u.perfil) + "</span></td>" +
          '<td data-label="Permissões"><span class="perm-mini">' + perms + "</span></td>" +
          '<td data-label="Ações" style="text-align:right;white-space:nowrap">' +
          '<button type="button" class="g-btn-acao u-editar" data-id="' + esc(u.id) + '">Editar</button> ' +
          '<button type="button" class="g-btn-acao u-remover" data-id="' + esc(u.id) + '">Remover</button>' +
          "</td></tr>";
      }).join("");
      if (contagem) {
        var comAcesso = usuarios.filter(function (u) { return u.acessar; }).length;
        contagem.textContent = usuarios.length + " cadastrado(s) · " + comAcesso + " com acesso à gestão";
      }
    }

    function resetForm() {
      editandoId = null;
      form.reset();
      if (pAcessar) { pAcessar.checked = true; }
      if (pVer) { pVer.checked = true; }
      if (permErro) { permErro.textContent = ""; }
      if (titulo) { titulo.textContent = "Adicionar usuário"; }
      if (btnSubmit) { btnSubmit.querySelector(".btn-label").textContent = "Cadastrar usuário"; }
      if (btnCancel) { btnCancel.hidden = true; }
      [fNome, fEmail].forEach(function (el) { if (el) { window.FP.clearInvalid(el); } });
    }

    function modoEdicao(u) {
      editandoId = u.id;
      if (fNome) { fNome.value = u.nome; window.FP.clearInvalid(fNome); }
      if (fEmail) { fEmail.value = u.email; window.FP.clearInvalid(fEmail); }
      if (fPerfil) { fPerfil.value = u.perfil; }
      if (pAcessar) { pAcessar.checked = !!u.acessar; }
      if (pVer) { pVer.checked = !!u.ver; }
      if (permErro) { permErro.textContent = ""; }
      if (titulo) { titulo.textContent = "Editar usuário"; }
      if (btnSubmit) { btnSubmit.querySelector(".btn-label").textContent = "Salvar alterações"; }
      if (btnCancel) { btnCancel.hidden = false; }
      if (fNome) { fNome.focus(); }
    }

    tbody.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-id]");
      if (!btn) { return; }
      var id = btn.getAttribute("data-id");
      var alvo = usuarios.filter(function (x) { return x.id === id; })[0];
      if (!alvo) { return; }

      if (btn.classList.contains("u-editar")) {
        modoEdicao(alvo);
        return;
      }
      if (btn.classList.contains("u-remover")) {
        if (alvo.fixo) {
          toast("O administrador principal não pode ser removido.", "erro");
          return;
        }
        usuarios = usuarios.filter(function (x) { return x.id !== id; });
        store.set("fp-users", usuarios);
        if (editandoId === id) { resetForm(); }
        render();
        toast("Acesso removido: " + alvo.nome + ".", "info");
      }
    });

    if (btnCancel) { btnCancel.addEventListener("click", resetForm); }
    [fNome, fEmail].forEach(function (el) {
      if (el) { el.addEventListener("input", function () { window.FP.clearInvalid(el); }); }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var nome = fNome ? fNome.value.trim() : "";
      var email = fEmail ? fEmail.value.trim().toLowerCase() : "";
      var valido = true;

      if (nome.length < 2) { window.FP.setInvalid(fNome, "Informe o nome."); valido = false; }
      if (!REGEX_EMAIL.test(email)) { window.FP.setInvalid(fEmail, "Informe um e-mail válido."); valido = false; }
      if (!pAcessar.checked && !pVer.checked) {
        if (permErro) { permErro.textContent = "Selecione ao menos uma permissão."; }
        valido = false;
      } else if (permErro) {
        permErro.textContent = "";
      }

      var duplicado = usuarios.filter(function (x) { return x.email === email && x.id !== editandoId; })[0];
      if (duplicado) {
        window.FP.setInvalid(fEmail, "Este e-mail já está cadastrado.");
        valido = false;
      }
      if (!valido) { toast("Revise os campos destacados.", "erro"); return; }

      if (btnSubmit) { window.FP.setLoading(btnSubmit, true); }
      window.setTimeout(function () {
        if (editandoId) {
          usuarios = usuarios.map(function (x) {
            if (x.id !== editandoId) { return x; }
            return { id: x.id, nome: nome, email: email, perfil: fPerfil.value, acessar: pAcessar.checked, ver: pVer.checked, fixo: x.fixo };
          });
          toast("Usuário atualizado: " + nome + ".", "ok");
        } else {
          usuarios.push({
            id: "u-" + Date.now().toString(36),
            nome: nome,
            email: email,
            perfil: fPerfil.value,
            acessar: pAcessar.checked,
            ver: pVer.checked
          });
          toast("Acesso cadastrado para " + email + ".", "ok");
        }
        store.set("fp-users", usuarios);
        if (btnSubmit) { window.FP.setLoading(btnSubmit, false); }
        resetForm();
        render();
      }, 450);
    });

    render();
  }

  function initGestao() {
    /* usuário logado */
    var user = session.get("fp-user", {});
    var avatar = $("#g-user-avatar");
    var nomeEl = $("#g-user-nome");
    var perfilEl = $("#g-user-perfil");
    if (avatar) { avatar.textContent = String(user.nome || "A").trim().charAt(0).toUpperCase(); }
    if (nomeEl) { nomeEl.textContent = user.nome || "Administrador"; }
    if (perfilEl) { perfilEl.textContent = user.usuario || user.email || "admin"; }

    /* relógio */
    var clock = $("#g-clock");
    function tick() {
      if (!clock) { return; }
      var d = new Date();
      clock.textContent = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2) + " · " + fmtData(d.toISOString());
    }
    tick();
    window.setInterval(tick, 1000);

    /* navegação */
    $$(".g-nav-item").forEach(function (b) {
      b.addEventListener("click", function () {
        var view = b.getAttribute("data-view");
        var preset = null;
        if (view === "manifestacoes") { preset = "todos"; }
        irParaView(view, preset);
      });
    });

    var burger = $("#g-burger");
    var shell = $("#g-shell");
    var overlay = $("#g-overlay");
    if (burger && shell) {
      burger.addEventListener("click", function () { shell.classList.toggle("nav-open"); });
    }
    if (overlay && shell) {
      overlay.addEventListener("click", function () { shell.classList.remove("nav-open"); });
    }

    var sair = $("#g-sair");
    if (sair) {
      sair.addEventListener("click", function () {
        session.remove("fp-user");
        toast("Sessão encerrada.", "info");
        window.setTimeout(function () { window.location.href = "login.html"; }, 450);
      });
    }

    var verTodas = $("#btn-ver-todas");
    if (verTodas) { verTodas.addEventListener("click", function () { irParaView("manifestacoes", "todos"); }); }

    /* filtros */
    ["f-busca", "f-status", "f-categoria", "f-setor", "f-de", "f-ate"].forEach(function (id) {
      var el = $("#" + id);
      if (el) {
        el.addEventListener(id === "f-busca" ? "input" : "change", function () { renderTabela(); });
      }
    });

    var limpar = $("#btn-limpar");
    if (limpar) {
      limpar.addEventListener("click", function () {
        ["f-busca", "f-status", "f-categoria", "f-setor", "f-de", "f-ate"].forEach(function (id) {
          var el = $("#" + id);
          if (el) { el.value = id === "f-status" || id === "f-categoria" || id === "f-setor" ? "todos" : ""; }
        });
        renderTabela();
        toast("Filtros limpos.", "info");
      });
    }

    var exp = $("#btn-exportar");
    if (exp) { exp.addEventListener("click", function () { exportarCSV(filtrar()); }); }
    var expRel = $("#btn-exportar-rel");
    if (expRel) { expRel.addEventListener("click", function () { exportarCSV(registros); }); }

    /* clique em linha abre o detalhe */
    ["tabela-manifestacoes", "tabela-tratamento", "tabela-resolvidas", "recentes-list"].forEach(function (id) {
      var el = $("#" + id);
      if (el) {
        el.addEventListener("click", function (event) {
          var alvo = event.target.closest("[data-protocolo]");
          if (alvo) { abrirDetalhe(alvo.getAttribute("data-protocolo")); }
        });
      }
    });

    /* relatórios */
    renderBars($("#rel-status"), [
      { rotulo: "Recebidas", valor: registros.filter(function (r) { return r.status === "recebido"; }).length, cor: COR_STATUS.recebido },
      { rotulo: "Em análise", valor: registros.filter(function (r) { return r.status === "analise"; }).length, cor: COR_STATUS.analise },
      { rotulo: "Em tratamento", valor: registros.filter(function (r) { return r.status === "tratamento"; }).length, cor: COR_STATUS.tratamento },
      { rotulo: "Resolvidas", valor: registros.filter(function (r) { return r.status === "resolvido"; }).length, cor: COR_STATUS.resolvido },
      { rotulo: "Encerradas", valor: registros.filter(function (r) { return r.status === "encerrado"; }).length, cor: COR_STATUS.encerrado }
    ]);
    renderBars($("#rel-setor"), Object.keys(SETORES).map(function (k) {
      return { rotulo: SETORES[k], valor: registros.filter(function (r) { return r.setor === k; }).length, cor: "#F26419" };
    }));

    /* modal — fechar */
    var fechar = $("#gm-fechar");
    if (fechar) { fechar.addEventListener("click", fecharDetalhe); }
    var backdrop = $("#modal-detalhe");
    if (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) { fecharDetalhe(); }
      });
    }

    /* modal — adicionar observação */
    var addObs = $("#gm-add-obs");
    if (addObs) {
      addObs.addEventListener("click", function () {
        var txt = $("#gm-obs").value.trim();
        if (!txt) { toast("Escreva a observação antes de adicionar.", "erro"); return; }
        registroAtual.obs.push({ d: fmtHist(new Date().toISOString()), autor: user.nome || "Gestão", t: txt });
        registroAtual.hist.push({ d: new Date().toISOString(), t: "Observação interna adicionada" });
        $("#gm-obs").value = "";
        renderObs();
        renderHist();
        toast("Observação interna registrada.", "ok");
      });
    }

    /* modal — salvar alterações */
    var salvar = $("#gm-salvar");
    if (salvar) {
      salvar.addEventListener("click", function () {
        var novoStatus = $("#gm-status").value;
        var novaPrioridade = $("#gm-prioridade").value;
        var novoResp = $("#gm-responsavel").value;
        var retorno = $("#gm-retorno").value.trim();

        var mudou = false;
        if (novoStatus !== registroAtual.status) {
          registroAtual.hist.push({ d: new Date().toISOString(), t: "Alterado para \u201C" + (STATUS_META[novoStatus] || {}).label + "\u201D" });
          registroAtual.status = novoStatus;
          mudou = true;
        }
        if (novaPrioridade !== registroAtual.prioridade) {
          registroAtual.prioridade = novaPrioridade;
          mudou = true;
        }
        if (novoResp !== registroAtual.responsavel) {
          registroAtual.responsavel = novoResp;
          if (novoResp) { registroAtual.hist.push({ d: new Date().toISOString(), t: "Responsável definido: " + novoResp }); }
          mudou = true;
        }
        if (retorno) {
          registroAtual.retorno = retorno;
          registroAtual.hist.push({ d: new Date().toISOString(), t: "Retorno enviado ao colaborador" });
          mudou = true;
        }

        registroAtual.atualizado = "agora";
        persistir(registroAtual);
        atualizarTudo();
        renderRetorno();
        renderHist();
        toast(mudou ? registroAtual.protocolo + " atualizado com sucesso." : "Nenhuma alteração detectada.", mudou ? "ok" : "info");
      });
    }

    /* usuários — cadastro de e-mails com acesso/visualização */
    initUsuarios();

    /* configurações — alterar senha */
    var formSenha = $("#form-senha");
    if (formSenha) {
      formSenha.addEventListener("submit", function (event) {
        event.preventDefault();
        var atual = $("#senha-atual").value;
        var nova = $("#senha-nova").value;
        var conf = $("#senha-confirma").value;
        var valido = true;
        if (!atual) { window.FP.setInvalid($("#senha-atual"), "Informe a senha atual."); valido = false; }
        if (nova.length < 8) { window.FP.setInvalid($("#senha-nova"), "A nova senha precisa de pelo menos 8 caracteres."); valido = false; }
        if (conf !== nova) { window.FP.setInvalid($("#senha-confirma"), "A confirmação não confere com a nova senha."); valido = false; }
        if (!valido) { toast("Revise os campos destacados.", "erro"); return; }

        var btn = $("#btn-salvar-senha");
        window.FP.setLoading(btn, true);
        window.FP.hashSenha(atual).then(function (h) {
          if (h !== window.FP.hashEfetivo()) {
            window.FP.setLoading(btn, false);
            window.FP.setInvalid($("#senha-atual"), "Senha atual incorreta.");
            toast("Senha atual incorreta.", "erro");
            return;
          }
          return window.FP.hashSenha(nova).then(function (novoHash) {
            store.set("fp-admin-hash", novoHash);
            window.FP.setLoading(btn, false);
            formSenha.reset();
            toast("Senha alterada com sucesso. Use a nova senha no próximo acesso.", "ok");
          });
        });
      });
    }

    /* render inicial */
    atualizarCounts();
    renderDashboard();
    renderTabela();
  }

  initGestao();
})();
