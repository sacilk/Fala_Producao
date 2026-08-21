/* ============================================================
   FALA PRODUÇÃO — script.js
   Canal interno de escuta · demonstração front-end (sem backend)
   Estrutura preparada para futura integração com API/Supabase.
   ============================================================ */
(function () {
  "use strict";

  /* ------------------------------------------------------------
     Helpers
  ------------------------------------------------------------ */
  function $(selector, ctx) {
    return (ctx || document).querySelector(selector);
  }
  function $$(selector, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(selector));
  }
  function esc(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* noop */ }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (err) { /* noop */ }
    }
  };

  var session = {
    get: function (key, fallback) {
      try {
        var raw = window.sessionStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) { return fallback; }
    },
    set: function (key, value) {
      try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* noop */ }
    },
    remove: function (key) {
      try { window.sessionStorage.removeItem(key); } catch (err) { /* noop */ }
    }
  };

  var CAT_LABELS = {
    equipamento: "Equipamento",
    material: "Material",
    seguranca: "Segurança",
    processo: "Processo",
    sugestao: "Sugestão",
    ambiente: "Ambiente e equipe",
    reconhecimento: "Reconhecimento",
    outro: "Outro"
  };

  var SETOR_LABELS = {
    feed: "FEED",
    food: "FOOD",
    logistica: "LOGISTICA",
    outros: "Outros",
    "nao-informar": "Prefiro não informar"
  };

  var STATUS_META = {
    recebido: { label: "Recebido", badge: "badge-recebido" },
    analise: { label: "Em análise", badge: "badge-analise" },
    tratamento: { label: "Em tratamento", badge: "badge-tratamento" },
    resolvido: { label: "Resolvido", badge: "badge-resolvido" },
    encerrado: { label: "Encerrado", badge: "badge-encerrado" }
  };

  var STATUS_ORDEM = { recebido: 1, analise: 2, tratamento: 3, resolvido: 4, encerrado: 4 };

  /* ------------------------------------------------------------
     Toast global (criado dinamicamente se não existir)
  ------------------------------------------------------------ */
  var TOAST_ICONS = {
    ok: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12l5 5L20 7\"/></svg>",
    erro: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg>",
    info: "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v.5M12 11.5V16\"/></svg>"
  };

  function ensureToastStack() {
    var stack = $("#fp-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "fp-toast-stack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, type, timeout) {
    var stack = ensureToastStack();
    var kind = TOAST_ICONS[type] ? type : "info";
    var toast = document.createElement("div");
    toast.className = "toast toast-" + kind;

    var ico = document.createElement("span");
    ico.className = "toast-ico";
    ico.innerHTML = TOAST_ICONS[kind];

    var msg = document.createElement("span");
    msg.className = "toast-msg";
    msg.textContent = message;

    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "Fechar aviso");
    close.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg>";

    toast.appendChild(ico);
    toast.appendChild(msg);
    toast.appendChild(close);
    stack.appendChild(toast);

    var removido = false;
    function remover() {
      if (removido) { return; }
      removido = true;
      toast.classList.add("out");
      window.setTimeout(function () { if (toast.parentNode) { toast.parentNode.removeChild(toast); } }, 280);
    }
    close.addEventListener("click", remover);
    window.setTimeout(remover, timeout || 4200);
  }

  /* ------------------------------------------------------------
     Modais (abrir / fechar / clique fora / Escape)
  ------------------------------------------------------------ */
  function openModalEl(backdrop) {
    if (!backdrop) { return; }
    backdrop.hidden = false;
    void backdrop.offsetWidth;
    backdrop.classList.add("open");
    document.body.classList.add("g-lock");
  }

  function closeModalEl(backdrop) {
    if (!backdrop) { return; }
    backdrop.classList.remove("open");
    window.setTimeout(function () {
      backdrop.hidden = true;
      if (!$$(".modal-backdrop.open, .gmodal-backdrop.open").length) {
        document.body.classList.remove("g-lock");
      }
    }, 240);
  }

  function initModais() {
    $$(".modal-backdrop, .gmodal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) { closeModalEl(backdrop); }
      });
    });
    $$("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var alvo = $("#" + btn.getAttribute("data-close"));
        closeModalEl(alvo);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") { return; }
      $$(".modal-backdrop.open, .gmodal-backdrop.open").forEach(closeModalEl);
    });
  }

  /* ------------------------------------------------------------
     Loading de botões + validação de campos
  ------------------------------------------------------------ */
  function setBtnLoading(btn, ativo) {
    if (!btn) { return; }
    btn.classList.toggle("loading", !!ativo);
    btn.disabled = !!ativo;
  }

  function setFieldInvalid(el, msg) {
    if (!el) { return; }
    el.classList.add("invalid");
    var err = el.closest(".field") ? el.closest(".field").querySelector(".field-error") : null;
    if (err) { err.textContent = msg || ""; }
  }

  function clearFieldInvalid(el) {
    if (!el) { return; }
    el.classList.remove("invalid");
    var err = el.closest(".field") ? el.closest(".field").querySelector(".field-error") : null;
    if (err) { err.textContent = ""; }
  }

  /* ------------------------------------------------------------
     Reveal on scroll
  ------------------------------------------------------------ */
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------
     Menu mobile
  ------------------------------------------------------------ */
  function initMenuMobile() {
    var toggle = $("#menu-toggle");
    var header = $(".site-header");
    if (!toggle || !header) { return; }
    toggle.addEventListener("click", function () {
      var aberto = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", aberto ? "true" : "false");
    });
    $$("#nav-mobile a").forEach(function (link) {
      link.addEventListener("click", function () { header.classList.remove("nav-open"); });
    });
  }

  /* ------------------------------------------------------------
     HOME: cards de categoria redirecionam com query string
  ------------------------------------------------------------ */
  function initHome() {
    $$("[data-cat]").forEach(function (card) {
      card.addEventListener("click", function () {
        var cat = card.getAttribute("data-cat");
        if (cat) {
          window.location.href = "pages/enviar.html?categoria=" + encodeURIComponent(cat);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     PÁGINA: ENVIAR MANIFESTAÇÃO
  ------------------------------------------------------------ */
  function normalizarBusca(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function gerarProtocolo() {
    var n = parseInt(store.get("fp-counter", 0), 10) || 0;
    n += 1;
    store.set("fp-counter", n);
    var num = String(184 + n);
    while (num.length < 6) { num = "0" + num; }
    return "FALA #" + num;
  }

  function initEnviar() {
    var form = $("#form-manifestacao");
    if (!form) { return; }

    var selCategoria = $("#categoria");
    var selSetor = $("#setor");
    var txtDescricao = $("#descricao");
    var charCount = $("#char-count");
    var radios = $$("input[name=\"identificacao\"]");
    var identFields = $("#ident-fields");
    var nome = $("#nome");
    var contato = $("#contato");
    var btnEnviar = $("#btn-enviar");
    var dropzone = $("#dropzone");
    var fileInput = $("#arquivos");
    var previewGrid = $("#preview-grid");
    var modal = $("#modal-sucesso");
    var protocoloBox = $("#protocolo-gerado");
    var btnCopiar = $("#btn-copiar");
    var btnFechar = $("#btn-fechar-sucesso");

    /* pré-seleciona categoria via query string (?categoria=...) */
    var params = new URLSearchParams(window.location.search);
    var catParam = normalizarBusca(params.get("categoria") || "");
    if (catParam && selCategoria) {
      var opt = $$("#categoria option").filter(function (o) { return normalizarBusca(o.value) === catParam; })[0];
      if (opt) { selCategoria.value = opt.value; }
    }

    /* contador de caracteres */
    if (txtDescricao && charCount) {
      txtDescricao.addEventListener("input", function () {
        var len = txtDescricao.value.trim().length;
        charCount.textContent = len + " / 15+ caracteres";
        charCount.classList.toggle("ok", len >= 15);
        clearFieldInvalid(txtDescricao);
      });
    }

    /* alternância anônimo / identificado */
    function atualizarIdent() {
      var identificado = radios.some ? radios.some(function (r) { return r.checked && r.value === "identificado"; }) : false;
      if (identFields) { identFields.hidden = !identificado; }
    }
    radios.forEach(function (r) { r.addEventListener("change", atualizarIdent); });
    atualizarIdent();

    /* limpeza de erro ao digitar */
    [selCategoria, selSetor, txtDescricao, nome, contato].forEach(function (el) {
      if (el) { el.addEventListener("input", function () { clearFieldInvalid(el); }); }
      if (el) { el.addEventListener("change", function () { clearFieldInvalid(el); }); }
    });

    /* anexos + preview */
    var anexos = [];
    function renderPreviews() {
      if (!previewGrid) { return; }
      previewGrid.innerHTML = "";
      anexos.forEach(function (file, i) {
        var item = document.createElement("div");
        item.className = "preview-item";
        var remover = document.createElement("button");
        remover.type = "button";
        remover.className = "preview-remove";
        remover.setAttribute("aria-label", "Remover anexo");
        remover.innerHTML = "×";
        remover.addEventListener("click", function (e) {
          e.stopPropagation();
          anexos.splice(i, 1);
          renderPreviews();
        });
        if (file.type && file.type.indexOf("image/") === 0) {
          var img = document.createElement("img");
          img.className = "preview-img";
          img.alt = file.name;
          var url = URL.createObjectURL(file);
          img.onload = function () { URL.revokeObjectURL(url); };
          img.src = url;
          item.appendChild(img);
        } else {
          var wrap = document.createElement("div");
          wrap.className = "preview-file";
          wrap.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><path d=\"M14 2v6h6\"/></svg><span></span>";
          wrap.querySelector("span").textContent = file.name;
          item.appendChild(wrap);
        }
        item.appendChild(remover);
        previewGrid.appendChild(item);
      });
    }
    function addFiles(list) {
      for (var i = 0; i < list.length; i++) { anexos.push(list[i]); }
      renderPreviews();
      if (list.length) { showToast(list.length + " anexo(s) adicionado(s).", "info", 2500); }
    }
    if (dropzone && fileInput) {
      dropzone.addEventListener("click", function () { fileInput.click(); });
      dropzone.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); }
      });
      dropzone.addEventListener("dragover", function (e) { e.preventDefault(); dropzone.classList.add("drag"); });
      dropzone.addEventListener("dragleave", function () { dropzone.classList.remove("drag"); });
      dropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        dropzone.classList.remove("drag");
        addFiles(e.dataTransfer.files);
      });
      fileInput.addEventListener("change", function () {
        addFiles(fileInput.files);
        fileInput.value = "";
      });
    }

    /* envio */
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var valido = true;

      if (!selCategoria.value) { setFieldInvalid(selCategoria, "Selecione uma categoria."); valido = false; }
      if (!selSetor.value) { setFieldInvalid(selSetor, "Selecione o setor."); valido = false; }
      if (txtDescricao.value.trim().length < 15) {
        setFieldInvalid(txtDescricao, "A descrição precisa de pelo menos 15 caracteres.");
        valido = false;
      }

      var identificado = radios.some(function (r) { return r.checked && r.value === "identificado"; });
      if (identificado) {
        if (!nome.value.trim()) { setFieldInvalid(nome, "Informe seu nome."); valido = false; }
        if (!contato.value.trim()) { setFieldInvalid(contato, "Informe e-mail ou matrícula."); valido = false; }
      }

      if (!valido) { showToast("Revise os campos destacados.", "erro"); return; }

      setBtnLoading(btnEnviar, true);

      window.setTimeout(function () {
        var protocolo = gerarProtocolo();
        var registro = {
          protocolo: protocolo,
          categoria: selCategoria.value,
          categoriaLabel: CAT_LABELS[selCategoria.value] || "Outro",
          setor: selSetor.value,
          setorLabel: SETOR_LABELS[selSetor.value] || "Prefiro não informar",
          descricao: txtDescricao.value.trim(),
          anonimo: !identificado,
          nome: identificado ? nome.value.trim() : "",
          contato: identificado ? contato.value.trim() : "",
          anexos: anexos.length,
          status: "recebido",
          data: new Date().toISOString()
        };

        /* INTEGRAÇÃO: aqui entraria o POST /manifestacoes (Supabase insert) */
        var subs = store.get("fp-submissions", []);
        if (!Array.isArray(subs)) { subs = []; }
        subs.unshift(registro);
        store.set("fp-submissions", subs);

        store.set("fp-last-protocol", protocolo);

        if (protocoloBox) { protocoloBox.textContent = protocolo; }
        openModalEl(modal);
        showToast("Manifestação registrada: " + protocolo, "ok");

        /* limpa o formulário */
        form.reset();
        anexos = [];
        renderPreviews();
        atualizarIdent();
        if (charCount) { charCount.textContent = "0 / 15+ caracteres"; charCount.classList.remove("ok"); }
        setBtnLoading(btnEnviar, false);
      }, 900);
    });

    /* copiar protocolo */
    if (btnCopiar && protocoloBox) {
      btnCopiar.addEventListener("click", function () {
        var texto = protocoloBox.textContent.trim();
        function fallback() {
          var ta = document.createElement("textarea");
          ta.value = texto;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (e) { /* noop */ }
          document.body.removeChild(ta);
          showToast("Protocolo copiado: " + texto, "ok");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(texto).then(function () {
            showToast("Protocolo copiado: " + texto, "ok");
          }, fallback);
        } else { fallback(); }
      });
    }
    if (btnFechar && modal) {
      btnFechar.addEventListener("click", function () { closeModalEl(modal); });
    }
  }

  /* ------------------------------------------------------------
     PÁGINA: ACOMPANHAR PROTOCOLO
  ------------------------------------------------------------ */
  var PASSOS = [
    { titulo: "Recebido", desc: "Manifestação registrada no canal e protocolo gerado." },
    { titulo: "Em análise", desc: "Gestão classificou o relato e definiu prioridade." },
    { titulo: "Em tratamento", desc: "Responsável designado está executando o plano de ação." },
    { titulo: "Resolvido", desc: "Solução aplicada e registrada no protocolo." }
  ];

  function rotuloDias(dias) {
    if (dias <= 0) { return "hoje"; }
    if (dias === 1) { return "há 1 dia"; }
    return "há " + dias + " dias";
  }

  function normalizarProtocolo(valor) {
    var limpo = String(valor || "").trim().toUpperCase().replace(/\s+/g, " ");
    var m = limpo.match(/^FALA\s*#?\s*([0-9]{3,})$/);
    if (m) { return "FALA #" + m[1]; }
    if (/^[0-9]{4,}$/.test(limpo)) { return "FALA #" + limpo; }
    return null;
  }

  function hashTexto(texto) {
    var h = 0;
    for (var i = 0; i < texto.length; i++) { h = (h * 31 + texto.charCodeAt(i)) % 997; }
    return h;
  }

  function buscarRegistro(protocolo) {
    var subs = store.get("fp-submissions", []);
    if (!Array.isArray(subs)) { return null; }
    for (var i = 0; i < subs.length; i++) {
      if (String(subs[i].protocolo).toUpperCase() === protocolo) { return subs[i]; }
    }
    return null;
  }

  function initAcompanhar() {
    var form = $("#form-consulta");
    if (!form) { return; }

    var input = $("#protocolo");
    var btn = $("#btn-consultar");
    var resultado = $("#resultado-consulta");
    var usarUltimo = $("#usar-ultimo");

    var lastProtocol = store.get("fp-last-protocol", null);
    if (lastProtocol && input) { input.placeholder = "ex.: " + lastProtocol; }
    if (lastProtocol && usarUltimo) {
      usarUltimo.hidden = false;
      usarUltimo.innerHTML = "Usar último protocolo: <strong></strong>";
      usarUltimo.querySelector("strong").textContent = lastProtocol;
      usarUltimo.addEventListener("click", function () {
        input.value = lastProtocol;
        input.focus();
        showToast("Último protocolo preenchido: " + lastProtocol, "info");
      });
    }
    if (input) { input.addEventListener("input", function () { clearFieldInvalid(input); }); }

    function montarResultado(protocolo) {
      var registro = buscarRegistro(protocolo);
      var categoria = registro ? (registro.categoriaLabel || CAT_LABELS[registro.categoria] || "Outro") : null;
      var setor = registro ? registro.setorLabel || SETOR_LABELS[registro.setor] || "Prefiro não informar" : null;
      var autor = registro ? (registro.anonimo ? "Anônimo" : registro.nome || "Colaborador identificado") : null;
      var h = hashTexto(protocolo);
      var concluidas = registro
        ? (STATUS_ORDEM[registro.status] || 1)
        : 1 + (h % 4); /* 1 a 4 etapas concluídas (simulação) */
      if (!categoria) {
        var cats = Object.keys(CAT_LABELS);
        categoria = CAT_LABELS[cats[h % cats.length]];
      }
      if (!setor) {
        var setores = Object.keys(SETOR_LABELS);
        setor = SETOR_LABELS[setores[h % setores.length]];
      }
      if (!autor) { autor = h % 2 === 0 ? "Anônimo" : "Colaborador identificado"; }

      var offsets = [6, 4, 1, 0];
      if (registro && registro.data) {
        var diasDesde = Math.floor((Date.now() - new Date(registro.data).getTime()) / 86400000);
        if (!isNaN(diasDesde) && diasDesde >= 0) { offsets[0] = diasDesde; }
      }
      var statusAtual = ["recebido", "analise", "tratamento", "resolvido"][Math.min(concluidas, 4) - 1];
      var meta = STATUS_META[statusAtual];

      var html = "";
      html += "<div class=\"result-head\">";
      html += "<span class=\"result-protocol\">" + esc(protocolo) + "</span>";
      html += "<span class=\"badge " + meta.badge + "\">" + meta.label + "</span>";
      html += "</div>";
      html += "<div class=\"result-meta\">";
      html += "<div>Categoria<strong>" + esc(categoria) + "</strong></div>";
      html += "<div>Setor<strong>" + esc(setor) + "</strong></div>";
      html += "<div>Autor<strong>" + esc(autor) + "</strong></div>";
      html += "<div>Etapas concluídas<strong>" + concluidas + " de 4</strong></div>";
      html += "</div>";
      html += "<div class=\"timeline\">";
      PASSOS.forEach(function (passo, i) {
        var done = i < concluidas;
        var atual = done && i === concluidas - 1 && concluidas < 4;
        var classe = "tl-step " + (done ? "tl-done" : "tl-pending") + (atual ? " tl-now" : "");
        var data = done ? rotuloDias(offsets[i]) : "pendente";
        var icone = done
          ? "<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12l5 5L20 7\"/></svg>"
          : String(i + 1);
        html += "<div class=\"" + classe + "\">";
        html += "<span class=\"tl-dot\">" + icone + "</span>";
        html += "<div class=\"tl-body\">";
        html += "<div class=\"tl-title\">" + passo.titulo + "</div>";
        html += "<div class=\"tl-date\">" + data + "</div>";
        html += "<p class=\"tl-desc\">" + passo.desc + "</p>";
        html += "</div></div>";
      });
      html += "</div>";
      return html;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var valor = input ? input.value : "";
      if (!valor.trim()) {
        setFieldInvalid(input, "Digite o número do protocolo para consultar.");
        showToast("Informe o protocolo para consultar.", "erro");
        return;
      }
      var protocolo = normalizarProtocolo(valor);
      if (!protocolo || valor.trim().length < 4) {
        setFieldInvalid(input, "Protocolo muito curto. Use o formato FALA #000001.");
        showToast("Protocolo inválido ou muito curto.", "erro");
        return;
      }
      if (!resultado) { return; }
      setBtnLoading(btn, true);
      window.setTimeout(function () {
        resultado.innerHTML = montarResultado(protocolo);
        resultado.hidden = false;
        setBtnLoading(btn, false);
        resultado.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 700);
    });
  }

  /* ------------------------------------------------------------
     HASH SHA-256 — verificação de senha sem texto claro
     A senha NUNCA aparece no código: guarda-se apenas o hash.
     Usa Web Crypto quando disponível; se não houver (contexto
     não seguro), um fallback síncrono em JavaScript puro.
  ------------------------------------------------------------ */
  var SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256Sync(msg) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = [];
    for (var i = 0; i < msg.length; i++) {
      var c = msg.charCodeAt(i);
      if (c < 0x80) { bytes.push(c); }
      else if (c < 0x800) { bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else { bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) { bytes.push(0); }
    bytes.push(0, 0, 0, 0, (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);
    var w = [];
    for (var off = 0; off < bytes.length; off += 64) {
      var t;
      for (t = 0; t < 16; t++) {
        w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c2 = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (h + S1 + ch + SHA_K[t] + w[t]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c2) ^ (b & c2);
        var temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0; d = c2; c2 = b; b = a; a = (temp1 + temp2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c2) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = "";
    for (var k = 0; k < 8; k++) { out += ("00000000" + (H[k] >>> 0).toString(16)).slice(-8); }
    return out;
  }

  function hashSenha(texto) {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      var bytes = new TextEncoder().encode(texto);
      return window.crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
        var arr = new Uint8Array(buf);
        var hex = "";
        for (var i = 0; i < arr.length; i++) { hex += ("0" + arr[i].toString(16)).slice(-2); }
        return hex;
      });
    }
    return Promise.resolve(sha256Sync(texto));
  }

  /* ------------------------------------------------------------
     PÁGINA: LOGIN DA ÁREA DE GESTÃO
     Somente o HASH da senha existe no código (SHA-256 de
     "123456789" abaixo). Nunca a senha em texto claro.
     INTEGRAÇÃO (produção): substituir por
     supabase.auth.signInWithPassword({ email, password }).
  ------------------------------------------------------------ */
  var HASH_ADMIN_PADRAO = "15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225";
  var ADMIN_USUARIO = "adm123";

  function hashAdminEfetivo() {
    /* Aceita hash trocado via Configurações > Alterar senha */
    return store.get("fp-admin-hash", HASH_ADMIN_PADRAO);
  }

  function initLogin() {
    var form = $("#form-login");
    if (!form) { return; }

    /* Se já estiver autenticado, vai direto para a Central de Gestão */
    if (session.get("fp-user", null)) {
      window.location.replace("gestao.html");
      return;
    }

    var inputUsuario = $("#usuario");
    var inputSenha = $("#senha");
    var btnEntrar = $("#btn-entrar");
    var togglePass = $("#toggle-pass");
    var card = $("#login-card");

    [inputUsuario, inputSenha].forEach(function (el) {
      if (!el) { return; }
      el.addEventListener("input", function () { clearFieldInvalid(el); });
    });

    if (togglePass && inputSenha) {
      togglePass.addEventListener("click", function () {
        var mostrando = inputSenha.type === "text";
        inputSenha.type = mostrando ? "password" : "text";
        togglePass.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var valido = true;
      var usuario = inputUsuario ? inputUsuario.value.trim() : "";
      var senha = inputSenha ? inputSenha.value : "";

      if (!usuario) { setFieldInvalid(inputUsuario, "Informe o usuário ou e-mail."); valido = false; }
      if (senha.length < 4) { setFieldInvalid(inputSenha, "Informe a senha (mín. 4 caracteres)."); valido = false; }
      if (!valido) { showToast("Revise os campos destacados.", "erro"); return; }

      setBtnLoading(btnEntrar, true);

      hashSenha(senha).then(function (hash) {
        window.setTimeout(function () {
          var autenticado = (usuario.toLowerCase() === ADMIN_USUARIO) && (hash === hashAdminEfetivo());
          if (!autenticado) {
            setBtnLoading(btnEntrar, false);
            setFieldInvalid(inputSenha, "Usuário ou senha incorretos.");
            showToast("Credenciais inválidas. Verifique usuário e senha.", "erro");
            if (card) {
              card.classList.remove("shake");
              void card.offsetWidth;
              card.classList.add("shake");
            }
            return;
          }
          session.set("fp-user", {
            usuario: ADMIN_USUARIO,
            nome: "Administrador",
            perfil: "Gestão da Produção",
            email: "admin@empresa.com"
          });
          showToast("Bem-vindo(a), Administrador. Redirecionando...", "ok");
          window.setTimeout(function () { window.location.href = "gestao.html"; }, 700);
        }, 700);
      });
    });
  }

  /* ------------------------------------------------------------
     API pública consumida pela Central de Gestão (gestao.js)
  ------------------------------------------------------------ */
  window.FP = {
    toast: showToast,
    esc: esc,
    store: store,
    session: session,
    cats: CAT_LABELS,
    setores: SETOR_LABELS,
    statusMeta: STATUS_META,
    hashSenha: hashSenha,
    hashEfetivo: hashAdminEfetivo,
    setLoading: setBtnLoading,
    setInvalid: setFieldInvalid,
    clearInvalid: clearFieldInvalid,
    normalizar: normalizarBusca
  };

  /* ------------------------------------------------------------
     Inicialização geral
  ------------------------------------------------------------ */
  function init() {
    initModais();
    initMenuMobile();
    initReveal();

    var pagina = document.body ? document.body.getAttribute("data-page") : "";
    if (pagina === "home") { initHome(); }
    else if (pagina === "enviar") { initEnviar(); }
    else if (pagina === "acompanhar") { initAcompanhar(); }
    else if (pagina === "login") { initLogin(); }
  }

  init();
})();
