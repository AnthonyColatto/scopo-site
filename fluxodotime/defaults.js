/* Conteúdo padrão do sistema de gestão.
   Carregado só quando a base está vazia (primeiro uso) ou quando alguém
   clica em "Carregar padrão". Depois disso, tudo é editado pela própria tela. */
window.GESTAO_DEFAULTS = (function () {
  var S = function (dia, hora, titulo, desc, tipo, comTony) {
    return { dia: dia, hora: hora, titulo: titulo, desc: desc || "", tipo: tipo || "tarefa", comTony: !!comTony };
  };

  var config = {
    listas: {
      contas: ["AM", "AG", "Ambas"],
      reunioes: [
        "Diretoria",
        "Gerentes AG",
        "Gerente Matriz AM",
        "1:1 Ellyn",
        "Karine",
        "Briefing Marlon",
        "Liu",
        "RH",
        "Projetos paralelos"
      ],
      areas: [
        "Mídia digital", "Anúncios", "Loja / VM", "Tabloide", "Diretoria", "RH", "Cultura",
        "Projetos paralelos", "Projeto TI (indicação)", "Relatório", "Equipe",
        "Verba / Financeiro", "Eventos", "Fornecedores", "Outro"
      ],
      etiquetas: [
        { nome: "Urgente", cor: "#FF5C5C" },
        { nome: "Anúncio", cor: "#F5DF00" },
        { nome: "Feed", cor: "#5CC8FF" },
        { nome: "Story", cor: "#B69CFF" },
        { nome: "Vídeo", cor: "#FF9F43" },
        { nome: "Tabloide", cor: "#3DDC84" },
        { nome: "PDV / Loja", cor: "#FF7AC6" },
        { nome: "Campanha", cor: "#E8E8E8" }
      ],
      tiposEvento: ["Reunião", "Gravação", "Evento em loja", "Campanha", "Entrega", "Visita", "Outro"],
      categoriasVerba: [
        "Mídia · rádio", "Mídia · TV", "Mídia · outdoor e OOH", "Mídia · jornal e revista", "Mídia digital · anúncios",
        "Produção de vídeo", "Produção gráfica e impressos", "PDV e materiais", "Brindes", "Eventos",
        "Prestadores PJ", "Ferramentas e assinaturas", "Outros"
      ],
      pagamentos: ["Boleto", "PIX", "Transferência", "Cartão", "Faturado"]
    },
    // usado só na prévia e no modo sem banco: quem é admin
    acessos: { lista: [
      { email: "", nome: "Tony", papel: "admin" },
      { email: "", nome: "Ellyn", papel: "admin" }
    ] }
  };

  var pessoas = [
    {
      id: "tony", ordem: 0, nome: "Tony", vinculo: "Gestor", gestor: true,
      papel: "Gestor de marketing AM e AG",
      canal: "Pauta viva + Bitrix",
      semana: [
        S("diario", "manhã", "Pauta viva no celular", "Dar seguimento, delegar, cobrar. Responder lojas, RH e VMs. Aprovações rápidas.", "celular"),
        S("diario", "15:30", "Resumo da varredura do Davi", "5 minutos. O que precisa de você vira item na pauta. Dia que o Davi faltar, faça a varredura rápida na manhã seguinte.", "rito"),
        S("seg", "14:00", "1:1 Ellyn", "Trade, mídia, verba, fornecedores e o que travou.", "rito"),
        S("seg", "14:30", "Plano da semana · Karine", "O que publica cada dia nas duas contas, visitas dos video makers, anúncios no ar.", "rito"),
        S("seg", "15:00", "Briefing em lote · Marlon", "Tudo da semana num briefing só, pelo quadro de Criação.", "rito"),
        S("seg", "15:45", "Foco · roteiros", "4 a 5 roteiros por visita: Sandro (AM) e Julio (AG).", "foco"),
        S("ter", "14:00", "Foco · estratégia e campanhas", "Planejamento de conteúdo do mês, KVs, peças com o D.A.", "foco"),
        S("ter", "16:30", "Projeto TI · indicação", "Sessão com o TI no app de profissionais, ou pendências de loja e VM.", "projeto"),
        S("qua", "14:00", "Foco · métricas e anúncios", "Meta, Google Always On e YouTube das duas contas. Pausar, escalar, trocar criativo.", "foco"),
        S("qua", "15:30", "Direcionamento · Karine", "Passar as decisões de anúncio e ajustes de conteúdo.", "rito"),
        S("qua", "16:00", "Projetos paralelos · Conecta e Quiz Cultura", "Pauta fora das campanhas: andamento, próximos passos, quem faz o quê.", "projeto"),
        S("qui", "manhã", "Gerentes AG + Diretoria", "Leve a pauta filtrada. O que sair da reunião vira item antes do almoço.", "reuniao"),
        S("qui", "14:00", "Desdobrar reuniões", "Decisões viram tarefa no Bitrix ou cartão no quadro, com dono e prazo. Cobrar o Liu no grupo se precisar.", "rito"),
        S("qui", "15:00", "Foco · execução", "Peças com o D.A, tabloide, campanhas em andamento, cultura.", "foco"),
        S("sex", "13:30", "Preparar reunião da AM", "Filtrar a pauta do Gerente Matriz AM. Conferir o que foi publicado.", "foco"),
        S("sex", "15:00", "Gerente Matriz AM", "Leve a pauta filtrada. Registre as demandas na hora.", "reuniao"),
        S("sex", "17:00", "Fechamento da semana", "Limpar a pauta, olhar os quadros, montar a segunda.", "rito")
      ],
      entrega: [], recebe: [], frentes: [], mes: []
    },
    {
      id: "ellyn", ordem: 1, nome: "Ellyn", vinculo: "Dedicada",
      papel: "Trade · Mídia · Administrativo · braço direito",
      canal: "Pauta viva e Bitrix para tarefas, Whats para aviso",
      semana: [
        S("diario", "manhã", "Celular: notas fiscais", "Cobrar notas pendentes e mandar as do dia para a contabilidade.", "celular"),
        S("diario", "manhã", "Celular: fornecedores e lojas", "Responder fornecedores e pedidos de lojas e VMs. Tudo que for tarefa vai para a pauta ou Bitrix.", "celular"),
        S("seg", "14:00", "1:1 com Tony", "Traz: status de mídia, verba, fornecedores, campanhas nas lojas e o que travou.", "rito", true),
        S("seg", "14:30", "Programação da semana: rádio e TVs internas", "Conferir spots e conteúdos das campanhas vigentes.", "tarefa"),
        S("ter", "tarde", "Visita a uma loja (1x por semana)", "Checklist de visita: campanha exposta, PDV, tabloide, rádio e TV funcionando, fotos, pedidos do gerente.", "campo"),
        S("qua", "tarde", "Produção de peças e PDV", "Gráfica, orçamentos, separação de materiais com o Davi.", "tarefa"),
        S("qua", "tarde", "Brindes e eventos", "Orçamentos, compras aprovadas na verba e checklist dos próximos eventos.", "tarefa"),
        S("qui", "14:00", "Recebe as decisões das reuniões de quinta", "Tony repassa o que é dela. Ela executa.", "rito", true),
        S("qui", "tarde", "Contratação de mídia", "Orçamentos, PIs, comprovação de veiculação dos veículos contratados.", "tarefa"),
        S("sex", "tarde", "Verba da semana", "Lançar os gastos na planilha, saldo por conta AM e AG, verba cooperada em aberto.", "tarefa"),
        S("sex", "até 13h", "Status curto para o Tony", "O que foi entregue, o que atrasou, o que precisa de aprovação.", "rito", true)
      ],
      entrega: [
        { quando: "seg 14h", texto: "Status de mídia, verba e fornecedores no 1:1" },
        { quando: "sex 13h", texto: "Status curto da semana" },
        { quando: "último dia útil", texto: "Fechamento da verba de marketing do mês" },
        { quando: "até dia 10", texto: "Tabloide impresso e distribuído nas lojas" }
      ],
      recebe: [
        { quando: "seg 14h", texto: "Prioridades da semana" },
        { quando: "qui 14h", texto: "Decisões das reuniões de quinta" },
        { quando: "antes de contratar", texto: "Aprovação de mídia, brindes e eventos acima do combinado" }
      ],
      frentes: [
        { nome: "Contratação de mídia", cadencia: "Mensal", itens: ["Plano de mídia do mês aprovado com o Tony", "Orçamento de pelo menos 3 veículos", "PI ou contrato assinado", "Comprovação de veiculação", "Nota fiscal para a contabilidade"] },
        { nome: "Fornecedores", cadencia: "Contínuo", itens: ["Combinados sempre por escrito", "Prazos de entrega no calendário", "Avaliação do fornecedor no fechamento do mês"] },
        { nome: "Visita às lojas", cadencia: "1x por semana", itens: ["Campanha vigente exposta", "PDV em bom estado ou reposição pedida", "Tabloide exposto", "Rádio e TV interna funcionando", "Fotos para o relatório", "Pedidos do gerente registrados na pauta"] },
        { nome: "Verba de marketing (ADM)", cadencia: "Semanal e mensal", itens: ["Gastos lançados na planilha toda sexta", "Saldo por conta AM e AG", "Fechamento do mês para o Tony no último dia útil"] },
        { nome: "Notas fiscais e contabilidade", cadencia: "Diário", itens: ["Cobrar notas pendentes", "Enviar as notas do dia para a contabilidade", "Planilha de controle atualizada"] },
        { nome: "Rádio e TVs internas", cadencia: "Semanal e mensal", itens: ["Programação do mês seguinte até dia 25", "Spots das campanhas atualizados", "Conferir no ar durante as visitas"] },
        { nome: "Campanhas nas lojas", cadencia: "Por campanha", itens: ["Kit de materiais por loja", "Cronograma de montagem", "Fotos da execução", "Desmontagem no fim da campanha"] },
        { nome: "Produção de peças", cadencia: "Por demanda", itens: ["Arquivo aprovado", "Orçamento da gráfica", "Prazo de entrega combinado", "Distribuição por loja"] },
        { nome: "Brindes", cadencia: "Mensal", itens: ["Estoque conferido", "Orçamentos", "Compra aprovada na verba", "Controle de saída por loja"] },
        { nome: "Eventos", cadencia: "Por evento", itens: ["Briefing e data definidos", "Orçamento dentro da verba", "Fornecedores contratados", "Checklist do dia", "Fotos e pós-evento"] },
        { nome: "Verba cooperada", cadencia: "Mensal", itens: ["Acordos vigentes por fornecedor", "Ações realizadas com comprovação", "Apuração e cobrança até o 5º dia útil", "Controle de recebido e a receber"] }
      ],
      mes: []
    },
    {
      id: "karine", ordem: 2, nome: "Karine", vinculo: "PJ",
      papel: "Social media + tráfego pago AM e AG",
      canal: "Quadro Social + Vídeo. Whats só para urgência",
      semana: [
        S("seg", "14:30", "Plano da semana com o Tony", "Sai com o que publica em cada dia e as visitas dos video makers agendadas.", "rito", true),
        S("qua", "15:30", "Direcionamento de anúncios do Tony", "Recebe as decisões e sobe os ajustes.", "rito", true),
        S("diario", "", "Publicar conforme o calendário", "Feed, stories, directs e comentários das duas contas. Move os cartões no quadro.", "combinado")
      ],
      entrega: [
        { quando: "combinado", texto: "Conteúdos publicados conforme o calendário (cartão em Publicado)" },
        { quando: "após ajuste", texto: "Anúncios ajustados no ar" }
      ],
      recebe: [
        { quando: "seg 14h30", texto: "Calendário, roteiros e legendas prontos" },
        { quando: "qua 15h30", texto: "Decisões de anúncio" },
        { quando: "dia 22", texto: "Calendário do mês seguinte" }
      ],
      frentes: [], mes: []
    },
    {
      id: "marlon", ordem: 3, nome: "Marlon", vinculo: "PJ",
      papel: "Designer · criação",
      canal: "Quadro de Criação. Diárias podem vir pelo Whats, mas viram cartão",
      semana: [
        S("seg", "15:00", "Recebe o lote de briefings da semana", "Tudo no quadro de Criação, coluna Briefado.", "rito", true),
        S("diario", "", "Diárias pelo Whats", "Só produz o que também está no quadro.", "combinado")
      ],
      entrega: [
        { quando: "qua 12h", texto: "Criativos de anúncio" },
        { quando: "qui 18h", texto: "Restante do lote da semana" },
        { quando: "complexas", texto: "Data sugerida no cartão, sem pressão" }
      ],
      recebe: [
        { quando: "seg 15h", texto: "Lote de briefings" },
        { quando: "qua e qui", texto: "Aprovação ou ajuste no cartão" }
      ],
      frentes: [], mes: []
    },
    {
      id: "karlos", ordem: 4, nome: "Karlos", vinculo: "PJ",
      papel: "D.A freela · sob demanda",
      canal: "Quadro de Criação + planilha de itens do tabloide",
      semana: [],
      entrega: [
        { quando: "2 dias úteis", texto: "Tabloide depois da planilha de itens" },
        { quando: "combinado", texto: "Peças de campanha com KV aprovado" }
      ],
      recebe: [
        { quando: "reunião com o diretor", texto: "Planilha de itens do tabloide" },
        { quando: "campanha", texto: "KV aprovado com diretoria e Liu" }
      ],
      frentes: [], mes: []
    },
    {
      id: "julio", ordem: 5, nome: "Julio", vinculo: "PJ",
      papel: "Video maker · cidade da AG · remoto",
      canal: "Quadro Social + Vídeo, com roteiro no cartão",
      semana: [
        S("seg", "", "Recebe a pauta da visita", "4 a 5 roteiros com lista de takes. A Karine agenda o dia.", "rito", true),
        S("qua", "", "1 visita na semana (dia combinado)", "Grava de 4 a 5 conteúdos na visita.", "combinado")
      ],
      entrega: [{ quando: "48h após a visita", texto: "Material bruto. Tony finaliza ou aprova a edição" }],
      recebe: [{ quando: "seg", texto: "Roteiros, takes e agenda da visita" }],
      frentes: [], mes: []
    },
    {
      id: "sandro", ordem: 6, nome: "Sandro", vinculo: "PJ",
      papel: "Video maker · cidade da AM · capta com a Karine",
      canal: "Karine coordena pelo quadro Social + Vídeo",
      semana: [
        S("ter", "", "1 visita na semana com a Karine", "Grava de 4 a 5 conteúdos na visita.", "combinado")
      ],
      entrega: [{ quando: "48h após a visita", texto: "Material bruto para finalização" }],
      recebe: [{ quando: "seg", texto: "Roteiros (do Tony) e agenda (da Karine)" }],
      frentes: [], mes: []
    },
    {
      id: "liu", ordem: 7, nome: "Liu", vinculo: "PJ",
      papel: "Estrategista · copy e plano · reporta à diretoria",
      canal: "Grupo da diretoria, para ficar registrado",
      semana: [],
      entrega: [
        { quando: "dia 15", texto: "Plano estratégico e copies do mês seguinte" },
        { quando: "5 dias úteis", texto: "Copy de campanha pedida" }
      ],
      recebe: [
        { quando: "dia 10", texto: "Cobrança no grupo da diretoria" },
        { quando: "dia 18", texto: "Se não entregou, Tony segue sem ele e avisa" }
      ],
      frentes: [], mes: []
    },
    {
      id: "davi", ordem: 8, nome: "Davi", vinculo: "Estágio · 14h30 às 17h15",
      papel: "Estagiário · tarefas simples e repetitivas",
      canal: "Whats para o resumo, Bitrix para tarefas",
      semana: [
        S("diario", "14:30", "Varredura dos canais", "Email, Whats, Bitrix, Google, site e Reclame Aqui de AM e AG.", "tarefa"),
        S("diario", "15:30", "Manda o resumo da varredura", "Modelo na aba Modelos.", "rito", true),
        S("seg", "15:45", "Organiza as pastas da semana", "Fotos, vídeos brutos e peças aprovadas.", "tarefa"),
        S("ter", "15:45", "Apoio à Ellyn: almoxarifado e PDV", "", "tarefa"),
        S("qua", "15:45", "Apoio à Ellyn: separação e envio de PDV", "", "tarefa"),
        S("qui", "15:45", "Planilha de números", "Avaliações, chamados e reclamações da semana.", "tarefa"),
        S("sex", "15:45", "Fecha a semana da varredura", "Lista o que ficou sem resposta.", "tarefa")
      ],
      entrega: [
        { quando: "todo dia 15h30", texto: "Resumo da varredura" },
        { quando: "6 dias úteis antes do dia 10", texto: "Tabloides dos concorrentes no Compras" }
      ],
      recebe: [{ quando: "seg", texto: "Tarefas da semana no Bitrix" }],
      frentes: [], mes: []
    }
  ];

  var R = function (tipo, a, b) { return { tipo: tipo, n: a || 0, dia: b || 0 }; };
  var ciclo = [
    { ordem: 1, titulo: "Relatório de fechamento para a diretoria", desc: "Primeira coisa do mês: pesquisas, atendimentos Bitrix da equipe e números do digital de AM e AG.", regra: R("util", 1), quem: ["Tony"], cadeia: "fechamento", conta: "Ambas", area: "Relatório", reuniao: "Diretoria" },
    { ordem: 2, titulo: "Tabloides dos concorrentes coletados e entregues ao Compras", desc: "Davi coleta e leva ao Compras com nossos produtos equivalentes lado a lado.", regra: R("antes", 6, 10), quem: ["Davi"], cadeia: "tabloide 1/6", conta: "Ambas", area: "Tabloide", reuniao: "" },
    { ordem: 3, titulo: "Compras conclui a análise de preço", desc: "2 dias úteis de análise.", regra: R("antes", 5, 10), quem: ["Davi"], cadeia: "tabloide 2/6", conta: "Ambas", area: "Tabloide", reuniao: "" },
    { ordem: 4, titulo: "Reunião com o diretor e planilha de itens para o D.A", desc: "Itens da briga de preço escolhidos. Planilha sai no mesmo dia.", regra: R("antes", 4, 10), quem: ["Tony"], cadeia: "tabloide 3/6", conta: "Ambas", area: "Tabloide", reuniao: "Diretoria" },
    { ordem: 5, titulo: "D.A entrega o tabloide e Tony aprova", desc: "2 dias úteis de produção.", regra: R("antes", 2, 10), quem: ["Karlos", "Tony"], cadeia: "tabloide 4/6", conta: "Ambas", area: "Tabloide", reuniao: "" },
    { ordem: 6, titulo: "Tabloide na gráfica", desc: "Ellyn envia no mesmo dia da aprovação.", regra: R("antes", 2, 10), quem: ["Ellyn"], cadeia: "tabloide 5/6", conta: "Ambas", area: "Tabloide", reuniao: "1:1 Ellyn" },
    { ordem: 7, titulo: "Tabloide nas lojas", desc: "Prazo final. Se o dia 10 cair no fim de semana, vale a sexta anterior.", regra: R("dia", 10), quem: ["Ellyn"], cadeia: "tabloide 6/6", conta: "Ambas", area: "Tabloide", reuniao: "" },
    { ordem: 8, titulo: "Apuração e cobrança da verba cooperada", desc: "Ações do mês anterior comprovadas e cobradas dos fornecedores.", regra: R("util", 5), quem: ["Ellyn"], cadeia: "verba", conta: "Ambas", area: "Verba / Financeiro", reuniao: "1:1 Ellyn" },
    { ordem: 9, titulo: "Cobrar do Liu o plano do mês seguinte", desc: "No grupo da diretoria, com o prazo do dia 15.", regra: R("dia", 10), quem: ["Tony", "Liu"], cadeia: "conteúdo do mês seguinte", conta: "Ambas", area: "Mídia digital", reuniao: "Liu" },
    { ordem: 10, titulo: "Prazo do Liu para plano e copy", desc: "Se não chegou, você segue sem ele no dia 18.", regra: R("dia", 15), quem: ["Liu"], cadeia: "conteúdo do mês seguinte", conta: "Ambas", area: "Mídia digital", reuniao: "Liu" },
    { ordem: 11, titulo: "Visita às filiais do interior + cultura", desc: "Mesma viagem: vistoria de loja e PDV das duas empresas e apresentação de propósito, valores e conceitos da marca.", regra: R("semana", 2, 16), quem: ["Tony"], cadeia: "cultura", conta: "Ambas", area: "Cultura", reuniao: "" },
    { ordem: 12, titulo: "Linha editorial e campanhas do mês seguinte", desc: "Temas, datas comerciais, produto foco e verba de anúncios. Com ou sem o plano do Liu.", regra: R("dia", 18), quem: ["Tony"], cadeia: "conteúdo do mês seguinte", conta: "Ambas", area: "Mídia digital", reuniao: "" },
    { ordem: 13, titulo: "Calendário do mês seguinte pronto e briefado", desc: "AM: 15 a 20 feed, 10 a 15 stories, 2 a 4 Meta, YouTube e Always On. AG: 15 feed, 20 stories, 2 Meta e YouTube. Briefings no quadro de Criação e roteiros no quadro Social.", regra: R("dia", 22), quem: ["Tony", "Karine", "Marlon"], cadeia: "conteúdo do mês seguinte", conta: "Ambas", area: "Mídia digital", reuniao: "Karine" },
    { ordem: 14, titulo: "Programação de rádio e TVs internas do mês seguinte", desc: "Spots e conteúdos das campanhas do próximo mês.", regra: R("dia", 25), quem: ["Ellyn"], cadeia: "trade", conta: "Ambas", area: "Loja / VM", reuniao: "1:1 Ellyn" },
    { ordem: 15, titulo: "Fechamento da verba de marketing", desc: "Gastos do mês por conta, saldo e verba cooperada a receber.", regra: R("ultimo", 0), quem: ["Ellyn"], cadeia: "fechamento", conta: "Ambas", area: "Verba / Financeiro", reuniao: "1:1 Ellyn" },
    { ordem: 16, titulo: "Números do mês levantados para o relatório", desc: "Atendimentos Bitrix, pesquisas e números do digital. Depois esse levantamento vai ser automático.", regra: R("ultimo", 0), quem: ["Tony", "Davi"], cadeia: "fechamento", conta: "Ambas", area: "Relatório", reuniao: "" }
  ];

  var modelos = [
    { ordem: 1, titulo: "Briefing de peça · Marlon / Karlos", corpo:
"BRIEFING · [AM | AG] · [nome da peça]\nFormato: [feed 1080x1350 | story 1080x1920 | tabloide | PDV | outro]\nObjetivo: [vender X | divulgar campanha | institucional]\nMensagem principal: [uma frase]\nTexto da peça: [título / apoio / preço / CTA]\nProduto(s) e imagens: [link da pasta]\nReferência: [link ou print]\nObrigatório: [logo, selo, condição de pagamento, validade]\nData sugerida: [dd/mm]  (complexa: sem pressão, mas me avise se não der)\nAprovação: Tony" },
    { ordem: 2, titulo: "Pauta de visita · Julio / Sandro (4 a 5 conteúdos)", corpo:
"VISITA · [AM | AG] · [dd/mm] · [local]\nQuem aparece: [vendedor / cliente / só produto]\n\n1) [tema] · [15s | 30s | 60s]\n   Gancho (0–3s): [...]\n   Takes: [...]\n   CTA: [...]\n2) [tema]\n   Gancho: [...]\n   Takes: [...]\n3) [tema]\n4) [tema]\n5) [tema]\n\nTakes extras: [fachada, detalhes de produto, equipe]\nBruto: até 48h depois da visita → Tony finaliza/aprova\nAgenda: Karine" },
    { ordem: 3, titulo: "Varredura diária · Davi (até 15h30)", corpo:
"VARREDURA [dd/mm]\nAM\n• Email: [nada | resumo]\n• Whats: [nada | resumo]\n• Bitrix: [chamados abertos: X]\n• Google (avaliações): [novas: X | negativas: X]\n• Site (formulários): [X contatos]\n• Reclame Aqui: [nada | nova reclamação: link]\nAG\n• Email:\n• Whats:\n• Bitrix:\n• Google:\n• Site:\n• Reclame Aqui:\n⚠ PRECISA DO TONY: [lista ou \"nada\"]" },
    { ordem: 4, titulo: "Direcionamento de anúncios · Karine (quarta)", corpo:
"ANÚNCIOS · semana [dd/mm]\nAM\n• Meta: manter [...] | pausar [...] | novo criativo [...]\n• Google Always On: [...]\n• YouTube: [...]\nAG\n• Meta: manter [...] | pausar [...] | novo criativo [...]\n• YouTube Always On: [...]\nVerba: [sem mudança | mover R$ X de ... para ...]\nAté quando: [dd/mm]" },
    { ordem: 5, titulo: "Cobrança Liu · grupo da diretoria", corpo:
"Liu, bom dia! Para fecharmos o calendário de [mês] de AM e AG, preciso do plano estratégico e das copies até dia [15/mm].\nCom isso a equipe consegue produzir e agendar a tempo.\nSe não der até lá, sigo com a linha que já temos e a gente ajusta junto. Obrigado!" },
    { ordem: 6, titulo: "Visita às filiais + cultura", corpo:
"VISITA [filial] · [dd/mm]\nLoja\n• Fachada e comunicação externa: [ok | ajuste]\n• PDV e materiais em uso: [ok | faltando: ...]\n• Tabloide exposto: [sim | não]\nCultura (20 a 30 min com a equipe)\n• Propósito da marca: [1 frase]\n• Valor do mês: [qual] e um exemplo prático na loja\n• Conceito da marca em ação: [história real]\n• Pergunta para a equipe: \"O que atrapalha vocês de atender como a gente quer?\"\nLevar de volta: [pendências → pauta]" },
    { ordem: 7, titulo: "Visita semanal da Ellyn à loja", corpo:
"VISITA LOJA [nome] · [dd/mm]\n• Campanha vigente exposta: [ok | ajuste]\n• PDV: [ok | repor: ...]\n• Tabloide exposto: [sim | não]\n• Rádio interna: [ok | problema]\n• TV interna: [ok | problema]\n• Fotos: [link]\n• Pedidos do gerente: [lista → pauta]" }
  ];

  var quadros = [
    { id: "criacao", ordem: 1, nome: "Criação · Marlon e D.A", colunas: [
      { id: "c1", nome: "Pedidos" }, { id: "c2", nome: "Briefado" }, { id: "c3", nome: "Em produção" },
      { id: "c4", nome: "Em aprovação" }, { id: "c5", nome: "Ajustes" }, { id: "c6", nome: "Aprovado" }] },
    { id: "social", ordem: 2, nome: "Social + Vídeo · Karine, Sandro e Julio", colunas: [
      { id: "s1", nome: "Ideias" }, { id: "s2", nome: "Roteiro pronto" }, { id: "s3", nome: "Agendar visita" },
      { id: "s4", nome: "Gravado" }, { id: "s5", nome: "Edição" }, { id: "s6", nome: "Aprovação" },
      { id: "s7", nome: "Agendado" }, { id: "s8", nome: "Publicado" }] }
  ];


  // mapa mental padrão: o fluxo novo para apresentar ao time
  var N = [];
  var node = function (id, pai, texto, cor) { N.push({ id: id, pai: pai, texto: texto, cor: cor || "" }); };
  node("r", null, "Marketing AM · AG");
  node("t", "r", "Tony · gestão", "#F5DF00");
  node("t1", "t", "Pauta viva: tudo entra aqui primeiro");
  node("t2", "t", "Manhã no celular, tarde na mesa");
  node("t3", "t", "Reuniões: Diretoria e Gerentes AG (qui manhã), Gerente AM (sex tarde)");
  node("t4", "t", "Projetos paralelos: Conecta e Quiz Cultura");
  node("e", "r", "Ellyn · trade, mídia e ADM", "#B69CFF");
  node("e1", "e", "Mídia, fornecedores e verba");
  node("e2", "e", "Visita a uma loja por semana");
  node("e3", "e", "Notas para a contabilidade todo dia");
  node("e4", "e", "Rádio e TVs internas, brindes, eventos");
  node("c", "r", "Criação", "#5CC8FF");
  node("c1", "c", "Marlon: briefing em lote na segunda");
  node("c2", "c", "Karlos (D.A): tabloide e campanhas");
  node("c3", "c", "Tudo pelo quadro de Criação");
  node("s", "r", "Social + vídeo", "#FF9F43");
  node("s1", "s", "Karine: calendário e anúncios");
  node("s2", "s", "Sandro (AM) e Julio (AG): 1 visita por semana, 4 a 5 conteúdos");
  node("s3", "s", "Tudo pelo quadro Social + Vídeo");
  node("m", "r", "Ciclo do mês", "#3DDC84");
  node("m1", "m", "1º dia útil: relatório para a diretoria");
  node("m2", "m", "Até dia 10: tabloide nas lojas");
  node("m3", "m", "Dia 15: plano do Liu");
  node("m4", "m", "Depois do dia 15: visita ao interior + cultura");
  node("m5", "m", "Dia 22: calendário do mês seguinte pronto");
  node("a", "r", "Apoio", "#FF7AC6");
  node("a1", "a", "Davi: varredura diária até 15h30");
  node("a2", "a", "Liu: estratégia e copy");
  var mapas = [{ id: "fluxo", ordem: 1, titulo: "Fluxo do time AM · AG", nos: N }];

  return { config: config, pessoas: pessoas, ciclo: ciclo, modelos: modelos, quadros: quadros, mapas: mapas };
})();
