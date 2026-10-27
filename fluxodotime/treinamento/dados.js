/* Treinamento · Escola SCOPO · conteúdo fixo (mapa de passos, roteiros, legendas e textos).
   Para mudar um passo ou roteiro, edite aqui. O progresso marcado fica no banco do Fluxo. */
var FASES = [
  { n: "01", fino: "Fase 1 ·", forte: "Fundação", datas: "27/10 – 08/11", desc: "Deixar tudo de pé antes do primeiro vídeo: contas, promessa, isca e lista.", passos: [
    ["p01", "Criar a pasta Escola SCOPO no Drive", "Subpastas: Marca, Conteúdo, Curso e Vendas. Tudo do projeto mora aqui.", "10 min"],
    ["p02", "Reservar o @ da escola no Instagram, TikTok e YouTube", "O mesmo nome nas três redes, por exemplo @escolascopo.", "20 min"],
    ["p03", "Criar a conta de produtor na Hotmart", "Em hotmart.com, com o CNPJ da SCOPO.", "15 min"],
    ["p04", "Completar a verificação da Hotmart", "Documento, dados fiscais e conta bancária. Sem isso não dá para receber.", "30 min"],
    ["p05", "Mandar mensagem ao contador sobre nota fiscal de curso", "Pergunte como emitir nota para venda de curso pela Hotmart.", "10 min"],
    ["p06", "Escrever a promessa do curso à mão, com suas palavras", "Parta da frase do documento de oferta e ajuste até soar como você falando.", "15 min"],
    ["p07", "Pedir autorização aos 3 clientes, por escrito", "Uma mensagem no WhatsApp basta. Peça junto um número real de resultado.", "30 min"],
    ["p08", "Montar a isca em PDF", "Checklist da Espinha de Retenção + 10 prompts de edição, no padrão do Manual.", "4 h"],
    ["p09", "Criar a página da lista de espera", "Nome, WhatsApp, e-mail e a pergunta: onde você mais trava na edição?", "2 h"],
    ["p10", "Criar a lista no WhatsApp e no e-mail", "Uma comunidade ou canal no WhatsApp e uma lista na ferramenta de e-mail.", "30 min"],
    ["p11", "Fazer avatar e bio do perfil da escola", "O \"!\" amarelo sobre preto e uma bio com a promessa em uma linha.", "1 h"]
  ]},
  { n: "02", fino: "Fase 2 ·", forte: "Audiência e lista", datas: "09/11 – 20/12", desc: "Construir do zero as pessoas que vão comprar em janeiro, sem falar de preço.", gate: "150 pessoas na lista e 10 conversas feitas.", passos: [
    ["p12", "Fixar a rotina de 10 h por semana", "Segunda grava em bloco, terça a quinta edita, sexta conversa com a lista.", "15 min"],
    ["p13", "Convidar 50 contatos para a lista, um por um", "Mensagem pessoal, não transmissão. Os primeiros 50 vêm daqui.", "2 h"],
    ["p14", "Gravar os 3 primeiros vídeos na mesa de podcast", "Formato: como eu editei este Reels. Um prompt por vídeo.", "2 h"],
    ["p15", "Publicar 3 vídeos por semana", "Instagram, Shorts e TikTok, com título de busca: como editar vídeo com I.A.", "Contínuo"],
    ["p16", "Gravar um bastidor por cliente e publicar em collab", "Três vídeos, publicados junto com o perfil de cada cliente.", "3 h"],
    ["p17", "Fazer a primeira live de edição ao vivo", "Edite um vídeo real na frente do público e termine com o convite da lista.", "1 h"],
    ["p18", "Fechar local e data do aulão presencial", "Sugestão: sábado, 5/12. Seu estúdio ou um espaço parceiro, 20 a 30 pessoas.", "1 h"],
    ["p19", "Contatar 2 faculdades de publicidade ou design", "Ofereça uma palestra gratuita em troca de divulgação da lista.", "1 h"],
    ["p20", "Divulgar o aulão", "A inscrição no aulão é a entrada na lista.", "3 semanas"],
    ["p21", "Fazer 10 conversas de 15 minutos com a lista", "Onde travam, quanto já pagaram em curso, que ferramenta usam. Anote tudo.", "3 h"],
    ["p22", "Dar o aulão e anunciar a turma fundadora", "No fim, conte que a turma abre em janeiro e que a lista fica sabendo primeiro.", "3 h"],
    ["p23", "Escrever a estrutura final do curso", "A partir das conversas, não da cabeça.", "2 h"]
  ]},
  { n: "03", fino: "Fase 3 ·", forte: "Turma fundadora", datas: "21/12 – 17/02", desc: "Vender antes de gravar. A turma paga a produção e mostra onde o aluno trava.", gate: "De 10 a 15 alunos pagantes e satisfação alta.", passos: [
    ["p24", "Cadastrar a turma na Hotmart e enviar para aprovação", "Corte Certo · Turma Fundadora. Faça até 20/12, porque a análise não é imediata.", "1 h"],
    ["p25", "Configurar preço, garantia e checkout", "R$ 297 em até 12x, garantia de 14 dias, checkout preto com botão amarelo.", "1 h"],
    ["p26", "Criar a página da turma", "Headline C no topo, D no subtítulo, oferta, objeções e garantia.", "6 h"],
    ["p27", "Testar uma compra do começo ao fim", "Compre, receba o acesso e peça o reembolso, como um aluno faria.", "30 min"],
    ["p28", "Mandar o e-mail de fim de ano para a lista", "Sem venda. Só agradecimento e o que vem em janeiro.", "30 min"],
    ["p29", "Aquecer a lista em 5, 7 e 9/1", "Três vídeos e e-mails: o problema, a Espinha de Retenção e o case de cliente.", "6 h"],
    ["p30", "Avisar em 10/1: amanhã abre", "Uma mensagem curta na lista e no grupo.", "15 min"],
    ["p31", "Abrir o carrinho em 11/1, às 19h, ao vivo", "Live curta e link do checkout só para a lista.", "1 h"],
    ["p32", "Mandar mensagem individual a empresários em 12/1", "Quer que alguém do seu time aprenda isso?", "1 h"],
    ["p33", "Fazer a live de dúvidas em 13/1", "Responda às objeções da tabela de oferta, ao vivo.", "1 h"],
    ["p34", "Publicar o case de cliente em 15/1", "Com o número real de resultado que o cliente autorizou.", "1 h"],
    ["p35", "Fechar o carrinho em 17/1, às 23h59", "Três avisos: manhã, tarde e duas horas antes. Sem prorrogação.", "30 min"],
    ["p36", "Dar as boas-vindas em 18/1", "Grupo do WhatsApp, acesso ao Club e o primeiro exercício.", "1 h"],
    ["p37", "Dar os 4 encontros e gravar todos", "Terças, 20h: 19/1, 26/1, 2/2 e 16/2. A gravação é o rascunho do curso.", "8 h"],
    ["p38", "Corrigir o projeto final de cada aluno em vídeo", "A correção individual é o bônus que mais pesa.", "5 h"],
    ["p39", "Coletar depoimentos e antes e depois", "Em vídeo, de cada aluno. É a prova do lançamento de março.", "2 h"],
    ["p40", "Marcar os destaques para o Banco de Talentos", "Quem entregou o melhor projeto final.", "30 min"]
  ]},
  { n: "04", fino: "Fase 4 ·", forte: "Produção", datas: "17/02 – 14/03", desc: "Transformar a turma ao vivo num curso gravado que ensina sozinho.", passos: [
    ["p41", "Reescrever os módulos com o que a turma travou", "O que gerou mais dúvida ganha mais aula.", "3 h"],
    ["p42", "Roteirizar cada aula na espinha AIDA", "Resultado em 20 s, por que importa, demonstração, exercício e gancho da próxima.", "8 h"],
    ["p43", "Montar a identidade das aulas", "Abertura com o \"!\", título em Saira, etiqueta de módulo 01 / 08.", "3 h"],
    ["p44", "Gravar um módulo por dia, em bloco", "Rosto na abertura e no fechamento, tela no miolo.", "8 × 2 h"],
    ["p45", "Editar as aulas", "Corte seco, zoom no cursor, um título a cada passo.", "16 h"],
    ["p46", "Subir tudo no Hotmart Club", "MP4 1080p e o PDF de apoio de cada aula.", "3 h"],
    ["p47", "Produzir o Kit de Modelos de Design e ligar como order bump", "Capas, thumbnails e cards de legenda, R$ 47 a R$ 97.", "6 h"],
    ["p48", "Liberar o curso gravado para os fundadores", "Promessa cumprida antes do lançamento.", "15 min"]
  ]},
  { n: "05", fino: "Fase 5 ·", forte: "Lançamento na Hotmart", datas: "15/03 – 18/04", desc: "Aulas gratuitas, carrinho aberto por sete dias e os depoimentos da turma como prova.", gate: "Custo por venda abaixo do valor líquido do curso.", passos: [
    ["p49", "Criar a página das aulas gratuitas com pixel e GA4", "Pixel da Meta e Google Analytics 4 na página e no checkout.", "3 h"],
    ["p50", "Gravar os anúncios de captação", "Use os ganchos que mais seguraram atenção nos vídeos da Fase 2.", "3 h"],
    ["p51", "Rodar a captação de 15/3 a 4/4", "Orçamento diário definido antes de ligar.", "Contínuo"],
    ["p52", "Gravar as 3 aulas gratuitas", "A oportunidade, a transformação e a experiência dos alunos.", "6 h"],
    ["p53", "Escrever os e-mails e mensagens do carrinho", "Uma por dia durante os sete dias.", "4 h"],
    ["p54", "Transmitir as aulas em 5, 7 e 9/4", "Sempre no mesmo horário.", "3 h"],
    ["p55", "Abrir o carrinho em 12/4 e fechar em 18/4", "Fechamento real, como na turma fundadora.", "7 dias"]
  ]},
  { n: "06", fino: "Fase 6 ·", forte: "Perpétuo e escada", datas: "A partir de 19/04", desc: "O curso vendendo todo dia e o ecossistema começando a girar.", passos: [
    ["p56", "Montar o funil sempre ligado", "Anúncio, aula curta ou vídeo de vendas e checkout com order bump.", "6 h"],
    ["p57", "Revisar os números toda segunda", "Custo por venda, conversão da página e reembolsos.", "30 min/sem"],
    ["p58", "Abrir o programa de afiliados", "Quando já houver depoimentos suficientes.", "1 h"],
    ["p59", "Validar o modelo do Banco de Talentos com um advogado", "Antes de o primeiro aluno trabalhar dentro de um cliente.", "1 h"],
    ["p60", "Colocar o primeiro talento dentro de um cliente da House", "O momento em que o ecossistema fecha a primeira volta.", "Marco"],
    ["p61", "Abrir a turma do curso de sistemas com I.A", "Vendida primeiro para quem já é aluno, no segundo semestre.", "Marco"]
  ]}
];

var B = "Escola SCOPO. Corte certo segura gente.";
var SEMANAS = [
  { n: "Semana 1", fase: "Atenção", datas: "10 a 14/11", desc: "Mostrar que o problema existe e que tem nome. Nenhuma venda, só o convite para seguir e para a lista." },
  { n: "Semana 2", fase: "Interesse", datas: "17 a 21/11", desc: "Abrir as vértebras uma a uma. Aqui entra o primeiro dado próprio, o teste A/B." },
  { n: "Semana 3", fase: "Desejo", datas: "24 a 28/11", desc: "Mostrar o método funcionando de verdade, com cliente real, e começar a falar do aulão." },
  { n: "Semana 4", fase: "Ação", datas: "01 a 04/12", desc: "Cada vídeo termina no aulão de sábado, 5/12. O último é o convite final." }
];

var ROTEIROS = [
  { id: "r01", sem: 0, data: "Ter · 10/11", tit: "Seu vídeo morre nos 3 primeiros segundos", tipo: "busca", pilar: "Retenção", dur: "45 a 60 s",
    busca: "como prender a atenção nos primeiros segundos do reels",
    tec: "Correção de crença e lista com o melhor item no final",
    gA: ["Seu vídeo não perde gente no meio.", "Perde aqui."], gB: "Ninguém pula seu vídeo no meio. Pula no começo.",
    linhas: [
      ["0–3 s", "Gancho", "“Seu vídeo não perde gente no meio. Perde aqui.”", "Close na mesa de podcast. Texto: MORRE EM 3 SEGUNDOS. Cronômetro 0:03 em amarelo"],
      ["3–8 s", "Loop", "“Vou te mostrar os três ganchos que eu uso. O terceiro funciona até em vídeo sem graça.”", "Contador 1, 2, 3. O 3 desfocado"],
      ["8–30 s", "Ritmo", "“Um: contrariar o que todo mundo acha. Dois: tocar na dor antes de falar de você. E eu nunca, nunca começo com oi, pessoal.”", "Um exemplo escrito por item. OI, PESSOAL aparece e é riscado"],
      ["30–35 s", "Re-gancho", "“E o terceiro é o mais simples de todos.”", "Corte seco, quadro mais fechado"],
      ["35–50 s", "Virada", "“Mostrar o final primeiro. O resultado pronto logo no começo, e o resto do vídeo explica como chegou lá. A pessoa fica pra entender.”", "Tela dividida: antes e depois de um Reels da SCOPO. Seta voltando ao início"],
      ["50–60 s", "Ação", "“Comenta GANCHO que eu te mando meu checklist de retenção. " + B + "”", "Palavra GANCHO em amarelo. Logo e bordão"]
    ],
    dif: "O antes e depois é de um vídeo real da SCOPO, não de banco de imagem.",
    atom: "Carrossel “3 ganchos que seguram”, card com “Nunca comece com oi, pessoal”, story com enquete “qual você usa?”",
    nota: "Primeiro vídeo do perfil: grave com calma e use o melhor take. A isca (checklist) precisa estar pronta antes de publicar." },

  { id: "r02", sem: 0, data: "Qui · 12/11", tit: "Quanto tempo a I.A corta da sua edição", tipo: "busca", pilar: "I.A na edição", dur: "45 a 60 s",
    busca: "como editar vídeo com inteligência artificial",
    tec: "Demonstração com contraste de tempo",
    gA: ["Esse corte levava [00] minutos.", "Agora leva [00]."], gB: "A I.A edita rápido. Mas edita errado se você deixar.",
    linhas: [
      ["0–3 s", "Gancho", "“Esse corte levava [00] minutos. Agora leva [00].”", "Dois cronômetros lado a lado, um longo e um curto"],
      ["3–8 s", "Loop", "“E não é a ferramenta que faz a diferença. É o que você pede pra ela. No final eu te dou o pedido.”", "Texto: O PEDIDO CERTO, desfocado"],
      ["8–30 s", "Ritmo", "“Primeiro a I.A tira silêncio e respiração. Depois eu peço a transcrição e marco só as frases que entregam alguma coisa. O que não entrega, sai. Sem dó.”", "Gravação de tela: timeline encolhendo, transcrição com frases riscadas"],
      ["30–35 s", "Re-gancho", "“Mas tem uma coisa que eu nunca deixo pra I.A.”", "Corte seco"],
      ["35–50 s", "Virada", "“Escolher o gancho. A máquina corta rápido, mas quem sabe o que segura o seu público é você.”", "Texto, uma linha por vez: A I.A CORTA. VOCÊ ESCOLHE."],
      ["50–60 s", "Ação", "“Quer o pedido exato que eu uso? Comenta PROMPT. " + B + "”", "Palavra PROMPT em amarelo. Logo e bordão"]
    ],
    dif: "Tempo medido de verdade num vídeo seu, com a tela gravada mostrando o processo.",
    atom: "Carrossel com o prompt passo a passo, story “quanto tempo você leva pra editar 1 Reels?”",
    nota: "Cronometre uma edição real com e sem I.A antes de gravar e troque os [00]." },

  { id: "r03", sem: 0, data: "Sáb · 14/11", tit: "Por que mil cabeças seguem um berrante", tipo: "comp", pilar: "Retenção", dur: "60 a 75 s",
    busca: "o que é retenção de vídeo",
    tec: "Metáfora regional que apresenta o método",
    gA: ["Comitiva pantaneira não se perde.", "Seu vídeo, sim."], gB: "Por que mil cabeças seguem um berrante e ninguém segue seu vídeo?",
    linhas: [
      ["0–3 s", "Gancho", "“Comitiva pantaneira não se perde. Seu vídeo, sim.”", "Silhueta de comitiva cruzando o quadro, luz de entardecer"],
      ["3–8 s", "Loop", "“O ponteiro tem uma coisa que falta na maioria das edições.”", "Zoom lento na frente da comitiva"],
      ["8–30 s", "Ritmo", "“Na frente vai o ponteiro com o berrante. A boiada não enxerga o destino, mas ouve o som e segue. Ele não grita com cada boi. Dá o toque certo na hora certa.”", "Ícone do berrante. Ondas sonoras alinhando dezenas de pontos"],
      ["30–35 s", "Re-gancho", "“Na edição, esse berrante tem nome.”", "Corte seco, quadro fechado"],
      ["35–50 s", "Virada", "“Espinha de Retenção. Gancho, loop, ritmo, re-gancho e virada. Cinco toques que dizem pro público: fica, que vem coisa boa.”", "Cinco vértebras acendendo uma a uma, com os nomes"],
      ["50–60 s", "Ação", "“Nas próximas semanas eu abro cada uma aqui. Segue pra não perder. " + B + "”", "Logo e bordão"]
    ],
    dif: "Nenhum curso de edição do país fala de retenção com uma comitiva pantaneira.",
    atom: "Card com “Ele não grita com cada boi”, carrossel das 5 vértebras, LinkedIn em texto",
    nota: "Ritmo mais lento, como os vídeos de sexta da SCOPO. A comitiva pode ser 3D ou imagem licenciada." },

  { id: "r04", sem: 1, data: "Ter · 17/11", tit: "O truque que faz assistir até o fim", tipo: "busca", pilar: "Retenção", dur: "45 a 60 s",
    busca: "como fazer as pessoas assistirem seu vídeo até o final",
    tec: "Loop aberto usado e revelado dentro do próprio vídeo",
    gA: ["Tem uma frase que segura", "qualquer vídeo até o fim."], gB: "Você assistiu série até as 3 da manhã por causa disso.",
    linhas: [
      ["0–3 s", "Gancho", "“Tem uma frase que segura qualquer vídeo até o fim.”", "Texto desfocado no terço superior: a frase escondida"],
      ["3–8 s", "Loop", "“Eu vou te falar ela no final. Percebeu? Acabei de usar.”", "Texto aparece: LOOP ABERTO"],
      ["8–30 s", "Ritmo", "“Loop aberto é prometer no começo e entregar só no fim. O cérebro odeia história sem final, então fica. Toda série faz isso no último minuto do episódio.”", "Barra de progresso: promessa no início, entrega no fim"],
      ["30–35 s", "Re-gancho", "“Mas tem um jeito de errar feio.”", "Corte seco"],
      ["35–50 s", "Virada", "“Prometer e não entregar. Aí a pessoa nunca mais confia no seu começo. Loop aberto é contrato: abriu, fecha.”", "Uma corrente aberta que se fecha"],
      ["50–60 s", "Ação", "“E a frase era: no final eu te mostro. Usa no seu próximo vídeo e me marca. " + B + "”", "A frase entra em foco. Logo e bordão"]
    ],
    dif: "O vídeo é o próprio exemplo: o público sente o loop funcionando nele.",
    atom: "Card “Abriu, fecha”, story com o vídeo e caixa de pergunta",
    nota: "A frase escondida precisa aparecer desfocada desde o início, para o loop ser visível." },

  { id: "r05", sem: 1, data: "Qui · 19/11", tit: "Mesmo vídeo, dois começos", tipo: "comp", pilar: "Bastidor e prova", dur: "60 s",
    busca: "teste de gancho no reels",
    tec: "Dado próprio com palpite do público",
    gA: ["Mesmo vídeo. Dois começos.", "Um segurou muito mais."], gB: "Gravei o mesmo vídeo duas vezes. O resultado me surpreendeu.",
    linhas: [
      ["0–3 s", "Gancho", "“Mesmo vídeo. Dois começos. Um segurou muito mais gente.”", "Tela dividida: A e B"],
      ["3–8 s", "Loop", "“Tenta adivinhar qual ganhou antes do final.”", "Texto: A OU B?"],
      ["8–30 s", "Ritmo", "“No A eu começo explicando o assunto. No B, com a frase mais forte do vídeo. Mesmo dia, mesmo cenário, mesma roupa. Só mudou o gancho.”", "Os dois Reels lado a lado, rodando"],
      ["30–35 s", "Re-gancho", "“E o resultado…”", "Corte seco"],
      ["35–50 s", "Virada", "“O B segurou [00]% mais gente nos três primeiros segundos. Por isso toda gravação minha tem um Gancho B. É o teste mais barato do marketing.”", "Duas curvas de retenção dos Insights. Selo DADO REAL"],
      ["50–60 s", "Ação", "“Na próxima gravação, grava dois começos. Depois me conta. " + B + "”", "Logo e bordão"]
    ],
    dif: "Dado próprio dos Reels da SCOPO, que ninguém mais tem.",
    atom: "Carrossel com as duas curvas, LinkedIn com o número, story com enquete A ou B",
    nota: "Use os Insights reais de um par de Ganchos A e B dos roteiros da SCOPO. Sem dado real, troque por outro vídeo." },

  { id: "r06", sem: 1, data: "Sáb · 21/11", tit: "Sua legenda está espantando gente", tipo: "busca", pilar: "Retenção", dur: "45 a 60 s",
    busca: "como colocar legenda no reels do jeito certo",
    tec: "Lista de erros com o mais comum no final",
    gA: ["Sua legenda está", "espantando gente."], gB: "A legenda que você colocou pra ajudar está atrapalhando.",
    linhas: [
      ["0–3 s", "Gancho", "“Sua legenda está espantando gente.”", "Legenda enorme cobrindo o rosto, de propósito"],
      ["3–8 s", "Loop", "“São três erros. O terceiro quase todo mundo comete.”", "Contador 1, 2, 3"],
      ["8–30 s", "Ritmo", "“Um: frase inteira na tela. No máximo seis palavras por vez. Dois: legenda lá embaixo, onde o botão do aplicativo cobre. Deixa a base livre.”", "Tela 9:16 com as zonas seguras marcadas no topo e na base"],
      ["30–35 s", "Re-gancho", "“E o terceiro é o mais feio.”", "Corte seco"],
      ["35–50 s", "Virada", "“Legenda que pula de lugar. Cada hora numa altura, numa cor. O olho cansa e a pessoa sai. Legenda boa é a que você nem percebe que está lendo.”", "Legenda pulando, depois fixa na mesma altura"],
      ["50–60 s", "Ação", "“Salva pra conferir antes de postar. " + B + "”", "Logo e bordão"]
    ],
    dif: "Mostra as medidas reais das zonas seguras, que viram regra do curso.",
    atom: "Carrossel com o molde da tela 9:16, card “6 palavras por tela”",
    nota: "Pode ser 80% tela gravada. Bom vídeo para testar título de busca no YouTube." },

  { id: "r07", sem: 2, data: "Ter · 24/11", tit: "Gravo uma vez, posto a semana inteira", tipo: "busca", pilar: "I.A na edição", dur: "60 s",
    busca: "como reaproveitar um vídeo em vários formatos",
    tec: "Lista em leque com o item mais valioso no final",
    gA: ["Eu gravo uma vez", "e posto a semana inteira."], gB: "Você está gravando sete vezes o que dava pra gravar uma.",
    linhas: [
      ["0–3 s", "Gancho", "“Eu gravo uma vez e posto a semana inteira.”", "Um bruto no centro, sete peças surgindo em volta"],
      ["3–8 s", "Loop", "“Do mesmo bruto saem sete peças. A sétima quase ninguém faz.”", "A sétima peça desfocada"],
      ["8–30 s", "Ritmo", "“Reels. Shorts com título de busca. Vídeo pro LinkedIn. Carrossel com os gráficos. Card com a melhor frase. Três stories.”", "Cada peça acende no leque, uma a cada 3 s"],
      ["30–35 s", "Re-gancho", "“E a sétima…”", "Corte seco"],
      ["35–50 s", "Virada", "“Corte de 15 segundos pra anúncio: só gancho, virada e bordão. O vídeo que já provou que segura vira o anúncio mais barato que você vai ter.”", "A sétima peça entra em foco com o selo ANÚNCIO"],
      ["50–60 s", "Ação", "“Quer o mapa das sete peças? Comenta SETE. " + B + "”", "Palavra SETE em amarelo. Logo e bordão"]
    ],
    dif: "É o fluxo que a SCOPO usa toda semana, mostrado com peças reais.",
    atom: "O próprio vídeo vira as sete peças: faça isso de verdade e mostre no story",
    nota: "Use as peças reais de um vídeo da SCOPO de novembro." },

  { id: "r08", sem: 2, data: "Qui · 26/11", tit: "Esse vídeo chegou assim", tipo: "comp", pilar: "Bastidor e prova", dur: "60 a 75 s",
    busca: "antes e depois edição de vídeo",
    tec: "Bastidor com antes e depois, em collab",
    gA: ["Esse vídeo da [cliente]", "chegou assim."], gB: "Mesmo material, outra história. Olha.",
    linhas: [
      ["0–3 s", "Gancho", "“Esse vídeo da [cliente] chegou assim.”", "O bruto cru, sem corte"],
      ["3–8 s", "Loop", "“Fica até o fim que eu te mostro como ele saiu.”", "O vídeo final desfocado no canto"],
      ["8–30 s", "Ritmo", "“Primeiro achei a frase mais forte e joguei pro começo. Depois tirei tudo que não entregava nada. A I.A cortou o silêncio, eu escolhi o ritmo: uma coisa nova a cada três a cinco segundos.”", "Gravação de tela da timeline, cortes acontecendo"],
      ["30–35 s", "Re-gancho", "“Agora olha.”", "Corte seco"],
      ["35–55 s", "Virada", "“Mesmo material, outra história. E o resultado foi [00].”", "O vídeo final rodando. Número real na tela"],
      ["55–60 s", "Ação", "“Obrigado, [cliente], por abrir os bastidores. " + B + "”", "Logo e bordão"]
    ],
    dif: "Cliente real do MS, com resultado real. A prova que o curso precisa.",
    atom: "Publicar em collab com o cliente, carrossel antes e depois, depoimento curto nos stories",
    nota: "Precisa da autorização por escrito do cliente e do número de resultado. Repita o formato com os outros dois clientes depois." },

  { id: "r09", sem: 2, data: "Sáb · 28/11", tit: "A I.A não vai tirar seu trabalho", tipo: "comp", pilar: "I.A na edição", dur: "60 s",
    busca: "a inteligência artificial vai substituir editor de vídeo",
    tec: "Opinião firme com pausa antes da virada",
    gA: ["A I.A não vai", "tirar seu trabalho."], gB: "Quem tem medo da I.A ainda está editando do jeito antigo.",
    linhas: [
      ["0–3 s", "Gancho", "“A I.A não vai tirar seu trabalho.”", "Rosto, quadro aberto, frase fina na tela"],
      ["3–8 s", "Loop", "“Mas vai tirar o de alguém. E eu quero que não seja o seu.”", "Fusão lenta para close"],
      ["8–30 s", "Ritmo", "“Ela corta, legenda, traduz, faz gráfico. Em minutos, o que levava um dia. Quem só sabia apertar botão ficou caro demais.”", "Uma palavra por vez: CORTA. LEGENDA. TRADUZ."],
      ["30–35 s", "Re-gancho", "(pausa de dois segundos)", "Silêncio, tela limpa"],
      ["35–50 s", "Virada", "“O que ela não faz é decidir o que segura uma pessoa. Isso é método. E método não fica velho quando a ferramenta muda.”", "Texto: MÉTODO NÃO FICA VELHO"],
      ["50–60 s", "Ação", "“Dia 5 de dezembro eu ensino isso ao vivo, presencial e de graça. Link na bio. " + B + "”", "Data do aulão em amarelo. Logo e bordão"]
    ],
    dif: "Uma posição clara num tema em que quase todo mundo fica em cima do muro.",
    atom: "LinkedIn em texto longo, card com a frase, primeiro anúncio do aulão",
    nota: "Primeiro vídeo que cita o aulão. Ritmo mais calmo, pouca coisa na tela." },

  { id: "r10", sem: 3, data: "Ter · 01/12", tit: "O segundo em que o público desiste", tipo: "busca", pilar: "Retenção", dur: "60 s",
    busca: "como ver a retenção do reels no instagram",
    tec: "Tutorial com a métrica real na tela",
    gA: ["Tem um segundo exato", "em que o público desiste."], gB: "Seu vídeo tem um ponto de abandono. Eu sei onde.",
    linhas: [
      ["0–3 s", "Gancho", "“Tem um segundo exato em que o público desiste.”", "Curva de retenção com um vale marcado em amarelo"],
      ["3–8 s", "Loop", "“Eu te mostro onde ele fica, e como segurar.”", "Lupa sobre o vale"],
      ["8–30 s", "Ritmo", "“Abre os Insights do seu Reels e olha a curva de retenção. Ela despenca no começo e cai de novo perto da metade. Ali a promessa esfriou.”", "Gravação de tela do caminho nos Insights, curva com dois vales"],
      ["30–35 s", "Re-gancho", "“É aí que entra…”", "Corte seco"],
      ["35–50 s", "Virada", "“O re-gancho. Uma frase curta que reacende a promessa, tipo: e o próximo é o mais caro. Com corte seco e quadro mais fechado. O olho acorda.”", "Zoom in rápido no rosto"],
      ["50–60 s", "Ação", "“Sábado eu abro isso ao vivo no aulão. Vagas acabando, link na bio. " + B + "”", "Logo e bordão"]
    ],
    dif: "Mostra a curva real de um vídeo da SCOPO e o ponto exato onde o re-gancho foi colocado.",
    atom: "Carrossel “onde ver a retenção em 3 toques”, story com a curva",
    nota: "Busque um Reels da SCOPO com re-gancho e mostre a curva antes e depois do ponto." },

  { id: "r11", sem: 3, data: "Qui · 03/12", tit: "Efeito no lugar certo", tipo: "teste", pilar: "I.A na edição", dur: "45 s",
    busca: "como fazer animação 3D com inteligência artificial",
    tec: "Formato novo: só tela gravada, sem rosto",
    gA: ["Seu vídeo não precisa", "de mais efeito."], gB: "Esse gráfico eu fiz com I.A. O segredo é onde ele entra.",
    linhas: [
      ["0–3 s", "Gancho", "“Seu vídeo não precisa de mais efeito. Precisa de efeito no lugar certo.”", "Um vídeo poluído de efeitos que congela"],
      ["3–8 s", "Loop", "“Tem uma regra de tempo que eu sigo. Ela vem no final.”", "Texto: A REGRA, desfocado"],
      ["8–30 s", "Ritmo", "“Eu peço o objeto pra I.A, ajusto pras cores da marca e animo. Mas antes de gravar eu já sei onde ele vai entrar, e deixo espaço no quadro pra ele.”", "Tela gravada: o objeto sendo gerado, o quadro com o terço superior livre"],
      ["30–35 s", "Re-gancho", "“E a regra…”", "Corte seco"],
      ["35–45 s", "Virada e ação", "“Uma coisa nova a cada três a cinco segundos. Mais que isso cansa, menos que isso a pessoa sai. Sábado tem aulão. " + B + "”", "Metrônomo marcando 3 a 5 s. Logo e bordão"]
    ],
    dif: "Mostra o processo inteiro de um objeto 3D da SCOPO, do pedido à animação.",
    atom: "Se o formato sem rosto segurar bem, vira série quinzenal",
    nota: "É o teste do mês: compare a retenção com os vídeos de rosto." },

  { id: "r12", sem: 3, data: "Sex · 04/12", tit: "Amanhã eu edito ao vivo na sua frente", tipo: "conv", pilar: "Bastidor e prova", dur: "45 a 60 s",
    busca: "curso de edição de vídeo em Campo Grande",
    tec: "Convite com loop para o anúncio da turma",
    gA: ["Amanhã eu edito ao vivo", "na sua frente."], gB: "Traz um vídeo seu. Amanhã ele sai outro.",
    linhas: [
      ["0–3 s", "Gancho", "“Amanhã eu vou editar ao vivo na sua frente.”", "Close. Texto: AMANHÃ · 5/12"],
      ["3–8 s", "Loop", "“E no final vou contar uma coisa que só quem estiver lá vai saber primeiro.”", "Texto: SÓ PRA QUEM FOR"],
      ["8–30 s", "Ritmo", "“São três horas, presencial, aqui em [cidade]. Você traz um vídeo seu, e a gente aplica a Espinha de Retenção nele, ali na hora.”", "Local, horário e mapa, um por vez"],
      ["30–35 s", "Re-gancho", "“E não custa nada.”", "Corte seco"],
      ["35–50 s", "Virada", "“É de graça porque eu quero conhecer quem vai fazer o marketing de dentro das empresas daqui. No MS, relação vem antes do negócio.”", "O estúdio, a mesa de podcast, as cadeiras"],
      ["50–60 s", "Ação", "“Inscrição no link da bio. Te vejo amanhã. " + B + "”", "Botão da inscrição em amarelo. Logo e bordão"]
    ],
    dif: "Presencial e regional: nenhum curso online grande oferece isso.",
    atom: "Três stories na sexta e um no sábado de manhã, mensagem na lista",
    nota: "Confirme local, horário e cidade antes de gravar. A coisa que só eles vão saber é a turma fundadora de janeiro." }
];

var LEGENDAS = {
 "r01": {
  "cap": "Ninguém larga seu vídeo no meio. Larga antes de ele começar.\n\nTrês segundos. É o tempo que a pessoa te dá antes de passar o dedo.\n\nOs três ganchos que eu uso:\n1. Contrariar o que todo mundo acha\n2. Tocar na dor antes de falar de você\n3. Mostrar o final primeiro\n\nE uma regra sem exceção: nunca comece com \"oi, pessoal\".\n\nComenta GANCHO que eu te mando no direct o checklist de retenção que a gente usa na SCOPO.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #reels #ganchodevideo",
  "busca": "Como prender a atenção nos primeiros segundos do Reels"
 },
 "r02": {
  "cap": "Esse corte levava [00] minutos. Hoje leva [00].\n\nA ferramenta não é o segredo. O pedido é.\n\nO que eu deixo a I.A fazer: tirar silêncio, respiração e gaguejo. Transcrever tudo.\nO que eu faço: marcar só as frases que entregam alguma coisa. O resto sai, sem dó.\n\nE a única decisão que eu nunca terceirizo: o gancho. Quem conhece o seu público é você, não a máquina.\n\nComenta PROMPT que eu te mando o pedido exato que eu uso.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #inteligenciaartificial #ia",
  "busca": "Como editar vídeo com inteligência artificial"
 },
 "r03": {
  "cap": "Comitiva pantaneira não se perde. Seu vídeo, sim.\n\nQuem já viu uma comitiva cruzar o Pantanal sabe: a boiada não enxerga o destino. Ela ouve o berrante e segue.\n\nO ponteiro não grita com cada boi. Dá o toque certo, na hora certa, e o som organiza a marcha.\n\nNa edição esse toque tem nome: Espinha de Retenção.\nGancho. Loop. Ritmo. Re-gancho. Virada.\nCinco toques que dizem para quem está assistindo: fica, que vem coisa boa.\n\nNas próximas semanas eu abro cada vértebra aqui. Segue o perfil para não perder nenhuma.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #retencao #pantanal",
  "busca": "O que é retenção de vídeo (e por que o seu perde gente)"
 },
 "r04": {
  "cap": "Você já ficou acordado até as 3 da manhã por causa disso.\n\nChama loop aberto: prometer no começo e entregar só no fim. O cérebro não aguenta história sem final, então fica.\n\nSó tem um jeito de errar: prometer e não entregar. Aí a pessoa nunca mais confia no seu começo.\n\nLoop aberto é contrato. Abriu, fecha.\n\nUsa no seu próximo vídeo e me marca, que eu quero ver.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #retencao #roteiro",
  "busca": "Como fazer as pessoas assistirem seu vídeo até o final"
 },
 "r05": {
  "cap": "Gravei o mesmo vídeo duas vezes. Só mudei a primeira frase.\n\nMesmo dia, mesmo cenário, mesma camisa.\nA: começando pelo assunto.\nB: começando pela frase mais forte.\n\nO B segurou [00]% mais gente nos três primeiros segundos.\n\nPor isso toda gravação nossa tem um Gancho B. É o teste mais barato do marketing: custa um take a mais.\n\nAntes de ver o resultado, você apostava em qual? Responde A ou B aqui embaixo.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #testeab #reels",
  "busca": "Teste de gancho no Reels: mudei uma frase e veja o que aconteceu"
 },
 "r06": {
  "cap": "A legenda que você colocou para ajudar está atrapalhando.\n\nOs três erros, do menos ao mais comum:\n1. Frase inteira na tela. Máximo de seis palavras por vez.\n2. Legenda colada na base, onde os botões do app cobrem.\n3. Legenda que pula de lugar. Cada hora numa altura, numa cor. O olho cansa e a pessoa sai.\n\nLegenda boa é a que você nem percebe que está lendo.\n\nSalva este post para conferir antes de publicar o próximo.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #legenda #reels",
  "busca": "Como colocar legenda no Reels do jeito certo"
 },
 "r07": {
  "cap": "Você está gravando sete vezes o que dava para gravar uma.\n\nDo mesmo bruto saem sete peças:\nReels. Shorts com título de busca. Vídeo para o LinkedIn. Carrossel com os gráficos. Card com a melhor frase. Três stories.\n\nE a sétima, que quase ninguém faz: um corte de 15 segundos para anúncio, só gancho, virada e bordão. O vídeo que já provou que segura vira o anúncio mais barato que você vai ter.\n\nComenta SETE que eu te mando o mapa das sete peças.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #conteudo #socialmedia",
  "busca": "Como reaproveitar um vídeo em vários formatos"
 },
 "r08": {
  "cap": "Mesmo material, outra história.\n\nEsse vídeo da [cliente] chegou cru, do jeito que foi gravado. Três decisões mudaram tudo:\n1. Achar a frase mais forte e jogar para o começo\n2. Tirar o que não entregava nada\n3. Uma coisa nova na tela a cada três a cinco segundos\n\nA I.A cortou o silêncio. O ritmo fui eu que escolhi.\n\nResultado: [00].\n\nObrigado, [cliente], por abrir os bastidores. É assim que a gente trabalha: de dentro.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #antesedepois #[cidade]",
  "busca": "Antes e depois de uma edição de vídeo profissional"
 },
 "r09": {
  "cap": "A I.A não vai tirar seu trabalho. Mas vai tirar o de alguém.\n\nEla corta, legenda, traduz e faz gráfico em minutos. Quem só sabia apertar botão ficou caro demais.\n\nO que ela não faz é decidir o que segura uma pessoa. Isso é método. E método não fica velho quando a ferramenta muda.\n\nNo sábado, 5 de dezembro, eu ensino isso ao vivo. Presencial, em [cidade], de graça. Você traz um vídeo seu e a gente aplica o método nele na hora.\n\nInscrição no link da bio. As vagas são do tamanho da sala.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #inteligenciaartificial #[cidade]",
  "busca": "A inteligência artificial vai substituir o editor de vídeo?"
 },
 "r10": {
  "cap": "Seu vídeo tem um ponto exato de abandono. Dá para achar em três toques.\n\nAbre o Reels > Insights > Retenção.\nA curva despenca no começo e cai de novo perto da metade. Ali a promessa esfriou.\n\nO remédio é o re-gancho: uma frase curta que reacende a promessa, com corte seco e quadro mais fechado. O olho acorda.\n\nSábado eu abro isso ao vivo, no seu vídeo, no aulão presencial e gratuito em [cidade]. Inscrição no link da bio.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #insights #retencao",
  "busca": "Como ver a retenção do Reels no Instagram"
 },
 "r11": {
  "cap": "Seu vídeo não precisa de mais efeito. Precisa de efeito no lugar certo.\n\nEsse objeto eu fiz com I.A, ajustei para as cores da marca e animei. Mas antes de gravar eu já sabia onde ele ia entrar, e deixei espaço no quadro para ele.\n\nA regra de tempo: uma coisa nova a cada três a cinco segundos. Mais que isso cansa. Menos que isso, a pessoa sai.\n\nSábado tem aulão presencial e gratuito. Link na bio.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #animacao3d #inteligenciaartificial",
  "busca": "Como fazer animação 3D com inteligência artificial"
 },
 "r12": {
  "cap": "Traz um vídeo seu. Amanhã ele sai outro.\n\nAulão Corte Certo\nSábado, 5/12, das [horário]\n[local], [cidade]\nPresencial e gratuito\n\nSão três horas aplicando a Espinha de Retenção em vídeos de quem estiver na sala.\n\nÉ de graça porque eu quero conhecer quem vai fazer o marketing de dentro das empresas daqui. No MS, relação vem antes do negócio.\n\nE no final eu conto uma coisa que só quem estiver lá vai saber primeiro.\n\nInscrição no link da bio. Te vejo amanhã.\n\nEscola SCOPO. Corte certo segura gente.\n\n#escolascopo #edicaodevideo #cortecerto #[cidade] #cursodeedicao",
  "busca": "Curso de edição de vídeo em [cidade]"
 }
};

var TEXTOS = [
 [
  "Diagnóstico e roadmap",
  "O plano inteiro da Escola: onde a SCOPO está, para onde vai e em que ordem.",
  "https://claude.ai/artifact/McFwC9byGbFH5e7wYMQb7e",
  "Estratégia"
 ],
 [
  "Promessa e oferta",
  "A promessa do Corte Certo, a oferta da turma fundadora, preço, garantia e objeções.",
  "https://claude.ai/artifact/QgPYUd8wig3fy7FS6Zrk94",
  "Estratégia"
 ],
 [
  "Legendas dos 12 vídeos",
  "Legenda pronta de cada roteiro, com título de busca e hashtags.",
  "https://claude.ai/artifact/A2YT1tX6Y7y7VdUnqwGphG",
  "Conteúdo"
 ],
 [
  "Bio e destaques",
  "Bio do perfil da Escola e os destaques fixos.",
  "https://claude.ai/artifact/DQ1QojPPY1X6tuPibBqy6P",
  "Conteúdo"
 ],
 [
  "Página da lista de espera",
  "Texto da página que transforma seguidor em contato.",
  "https://claude.ai/artifact/8YsihD9dsVNBv8fndmDeZE",
  "Vendas"
 ],
 [
  "E-mails até o aulão",
  "A sequência de e-mails da lista até o aulão de 5/12.",
  "https://claude.ai/artifact/KESNtkiPbDmbSyNmzxMT87",
  "Vendas"
 ],
 [
  "Página de vendas",
  "A página da turma fundadora, bloco por bloco.",
  "https://claude.ai/artifact/93XtMC7iCWfXvmg4jL828T",
  "Vendas"
 ]
];
