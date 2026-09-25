import {
  Compass,
  Palette,
  Crosshair,
  Megaphone,
  Heart,
  Search,
  Layers,
  MessageSquareQuote,
  PenTool,
  Tag,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  Check,
  ArrowDown,
} from "lucide-react";
import logo from "@/assets/logo-gabriel-gonzaga.png";
import type { PropostaConfig } from "../types";

/**
 * FONTE ÚNICA DE CONTEÚDO DA PROPOSTA.
 *
 * Proposta institucional de Gabriel Gonzaga (consultoria de marca e Branding).
 * Conteúdo e paleta migrados da Apresentação Institucional 2026: Método N.A.V.E.,
 * processo em 8 etapas, frentes do Branding e tabela de serviços "a partir de".
 */

const WINDOW_DOTS = (
  <>
    <div className="w-2 h-2 rounded-full bg-white/20" />
    <div className="w-2 h-2 rounded-full bg-white/20" />
    <div className="w-2 h-2 rounded-full bg-primary/80" />
  </>
);

const NaveMockup = () => (
  <div className="glass-dark rounded-3xl border border-primary/20 shadow-premium overflow-hidden p-6 sm:p-8">
    <div className="flex items-center gap-2 mb-6">
      {WINDOW_DOTS}
      <p className="ml-3 text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">
        Método N.A.V.E.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[
        { letra: "N", nome: "Negócio", itens: ["Análise de contexto", "Metas curto/longo prazo"] },
        { letra: "A", nome: "Audiência", itens: ["Segmentos de mercado", "Personas"] },
        { letra: "V", nome: "Valor", itens: ["Proposta de valor", "Auditoria da concorrência"] },
        { letra: "E", nome: "Estória", itens: ["História de criação", "Propósito"] },
      ].map((bloco) => (
        <div key={bloco.letra} className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-heading font-bold text-primary">{bloco.letra}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/85">{bloco.nome}</span>
          </div>
          <div className="space-y-1">
            {bloco.itens.map((item) => (
              <p key={item} className="text-[10px] text-muted-foreground leading-snug">
                {item}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/70">
      <Search className="w-3 h-3" />
      <span>Entrevistas · Workshop · Pesquisas</span>
    </div>
  </div>
);

const PlataformaMockup = () => (
  <div className="glass-dark rounded-3xl border border-primary/20 shadow-premium overflow-hidden p-6 sm:p-8">
    <div className="flex items-center gap-2 mb-6">
      <Layers className="w-4 h-4 text-primary/70" />
      <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">
        Plataforma de marca
      </p>
    </div>
    <div className="flex justify-center mb-3">
      <div className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-2.5 text-center w-1/2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Promessa</p>
        <p className="text-[9px] text-foreground/70 mt-1 leading-snug">A visão de mundo em forma de convite</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[
        { campo: "Propósito", texto: "A razão de existir" },
        { campo: "Posicionamento", texto: "Como a marca é vista" },
        { campo: "Diferencial", texto: "O que faz melhor" },
        { campo: "Valores", texto: "O que guia decisões" },
        { campo: "Personalidade", texto: "A marca como pessoa" },
        { campo: "Público", texto: "Pra quem ela existe" },
      ].map((item) => (
        <div key={item.campo} className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
          <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-foreground/85">{item.campo}</p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-1 leading-snug">{item.texto}</p>
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/70">
      <Check className="w-3 h-3" />
      <span>Preenchida ao fim do diagnóstico</span>
    </div>
  </div>
);

const VerbalMockup = () => (
  <div className="glass-dark rounded-3xl border border-primary/20 shadow-premium overflow-hidden p-6 sm:p-8">
    <div className="flex items-center gap-2 mb-6">
      {WINDOW_DOTS}
      <p className="ml-3 text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">
        Key Word
      </p>
    </div>
    <div className="space-y-3">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">Eixo narrativo</p>
        <p className="text-xs text-foreground/85 leading-relaxed">Promessa, mensagem central e manifesto</p>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-2">Tom de voz</p>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <p className="text-foreground/85"><span className="text-primary font-bold">É</span> · direto, próximo</p>
          <p className="text-muted-foreground"><span className="font-bold">Não é</span> · frio, genérico</p>
        </div>
      </div>
      <div className="rounded-xl bg-primary/10 border border-primary/30 p-4">
        <p className="text-[9px] uppercase tracking-widest text-primary mb-2">Território lexical</p>
        <div className="flex flex-wrap gap-1.5">
          {["slogan", "expressões", "storytelling", "vocabulário próprio"].map((tag) => (
            <span key={tag} className="text-[9px] rounded-full border border-primary/30 px-2 py-0.5 text-foreground/85">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const VisualMockup = () => (
  <div className="glass-dark rounded-3xl border border-primary/20 shadow-premium overflow-hidden p-6 sm:p-8">
    <div className="flex items-center gap-2 mb-6">
      {WINDOW_DOTS}
      <p className="ml-3 text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">
        Key Visual
      </p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center">
          <span className="text-sm font-heading font-bold text-foreground">M</span>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Logo e símbolo</p>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center justify-center gap-2">
        <p className="text-3xl font-heading font-bold text-foreground leading-none">Aa</p>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Tipografia</p>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col items-center justify-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-5 h-5 rounded-full bg-foreground" />
          <div className="w-5 h-5 rounded-full bg-muted-foreground" />
          <div className="w-5 h-5 rounded-full bg-primary" />
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Cores</p>
      </div>
      <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 flex flex-col items-center justify-center gap-2">
        <div className="flex gap-1 items-end h-5">
          <div className="w-1.5 h-2 bg-primary/60 rounded-sm" />
          <div className="w-1.5 h-4 bg-primary/80 rounded-sm" />
          <div className="w-1.5 h-5 bg-primary rounded-sm" />
          <div className="w-1.5 h-3 bg-primary/70 rounded-sm" />
        </div>
        <p className="text-[9px] uppercase tracking-widest text-primary">Grafismos</p>
      </div>
    </div>
    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/70">
      <PenTool className="w-3 h-3" />
      <span>Ícones · ilustração · fotografia</span>
    </div>
  </div>
);

const NamingMockup = () => (
  <div className="glass-dark rounded-3xl border border-primary/20 shadow-premium overflow-hidden p-6 sm:p-8">
    <div className="flex items-center gap-2 mb-6">
      <Tag className="w-4 h-4 text-primary/70" />
      <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">
        Filtro de nomes
      </p>
    </div>
    <div className="space-y-3">
      {[
        { nome: "Marca", uso: "Nome principal", status: "Aprovado", ativo: true },
        { nome: "Submarca", uso: "Linha ou unidade", status: "Em análise", ativo: false },
        { nome: "Produto", uso: "Item do portfólio", status: "Em análise", ativo: false },
      ].map((linha) => (
        <div
          key={linha.nome}
          className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${
            linha.ativo ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
          }`}
        >
          <div>
            <p className="text-xs font-medium text-foreground/90">{linha.nome}</p>
            <p className="text-[9px] text-muted-foreground">{linha.uso}</p>
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-widest ${
              linha.ativo ? "text-primary" : "text-foreground/60"
            }`}
          >
            {linha.status}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/70">
      <Compass className="w-3 h-3" />
      <span>Nome guiado pela estratégia</span>
    </div>
  </div>
);

const GuiaMockup = () => (
  <div className="glass-dark rounded-3xl border border-primary/20 shadow-premium overflow-hidden p-6 sm:p-8">
    <div className="flex items-center gap-2 mb-6">
      <BookOpen className="w-4 h-4 text-primary/70" />
      <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60">
        Guia de marca · sumário
      </p>
    </div>
    <div className="space-y-2">
      {[
        { n: "01", titulo: "Estratégia", nota: "Plataforma de marca" },
        { n: "02", titulo: "Posicionamento", nota: "Promessa e manifesto" },
        { n: "03", titulo: "Identidade verbal", nota: "Tom de voz e vocabulário" },
        { n: "04", titulo: "Identidade visual", nota: "Logo, cores, tipografia" },
        { n: "05", titulo: "Aplicações", nota: "Pontos de contato" },
      ].map((cap, i, arr) => (
        <div
          key={cap.n}
          className={`flex items-center gap-4 rounded-xl px-4 py-2.5 border ${
            i === arr.length - 1 ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"
          }`}
        >
          <span className="text-[10px] font-bold text-primary">{cap.n}</span>
          <span className="text-xs text-foreground/85 flex-1">{cap.titulo}</span>
          <span className="text-[9px] text-muted-foreground text-right">{cap.nota}</span>
        </div>
      ))}
    </div>
    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/70">
      <ArrowDown className="w-3 h-3" />
      <span>Um documento pra todo o time seguir</span>
    </div>
  </div>
);

const WHATSAPP_LINK =
  "https://wa.me/5547991295745?text=Ol%C3%A1%2C%20Gabriel!%20Quero%20falar%20sobre%20a%20proposta%20de%20branding.";

export const proposta: PropostaConfig = {
  hero: {
    badge: "PROPOSTA · BRANDING · 2026",
    titulo: "Negócios crescem.",
    tituloDestaque: "Marcas expandem.",
    subtitulo:
      "Consultoria de estratégia e identidade de marca pra empresas que querem ser escolhidas pelo motivo certo.",
    logoSrc: logo,
    logoAlt: "Gabriel Gonzaga",
    ctaLabel: "Ver como funciona",
    scrollTargetId: "momento-atual",
  },

  marquee: {
    items: [
      "ESTRATÉGIA DE MARCA",
      "MÉTODO N.A.V.E.",
      "POSICIONAMENTO",
      "IDENTIDADE VERBAL",
      "IDENTIDADE VISUAL",
      "NAMING",
      "GUIA DE MARCA",
    ],
  },

  momentoAtual: {
    eyebrow: "MARCA E BRANDING",
    titulo: "Marca é o que dizem de você quando você não está presente",
    subtitulo:
      "Branding é o método pra construir o que vão falar de você. Sem método, o mercado decide sozinho.",
    desafio: {
      titulo: "Marca sem método",
      icone: AlertTriangle,
      items: [
        "Estética sem clareza: a marca não explica quem é, o que representa e por que deve ser escolhida.",
        "Cada canal fala uma língua: site, redes, embalagem e atendimento passam mensagens diferentes.",
        "Disputa por preço: sem valor percebido, a única diferença que o cliente enxerga é a etiqueta.",
      ],
    },
    solucao: {
      titulo: "Marca com método",
      icone: Lightbulb,
      items: [
        "O trabalho começa antes do visual: negócio, audiência, valores e história investigados a fundo.",
        "Estratégia vira identidade visual e verbal coerente, relevante e memorável.",
        "Posicionamento claro, que alinha o que o consumidor precisa com o modelo de negócio.",
      ],
    },
  },

  ecossistema: {
    eyebrow: "AS FRENTES DO BRANDING",
    titulo: "Cinco frentes que constroem uma marca",
    subtitulo:
      "Da base estratégica até a percepção emocional do cliente. Cada frente sustenta a próxima.",
    pilares: [
      {
        icone: Compass,
        titulo: "Estratégia",
        descricao: "A base que define o propósito e a direção de uma marca.",
      },
      {
        icone: Palette,
        titulo: "Identidade",
        descricao: "Os elementos visuais e verbais que definem a personalidade e a presença da marca.",
      },
      {
        icone: Crosshair,
        titulo: "Posicionamento",
        descricao: "O lugar estratégico da marca no mercado, pra destacar o seu valor único.",
      },
      {
        icone: Megaphone,
        titulo: "Comunicação",
        descricao: "A mensagem da marca nos diferentes canais e pontos de contato.",
      },
      {
        icone: Heart,
        titulo: "Experiência",
        descricao: "A interação geral e a percepção emocional do cliente com a sua marca.",
      },
    ],
  },

  featureTabs: {
    tabs: [
      {
        label: "DIAGNÓSTICO",
        icone: Search,
        titulo: "Discovery pelo Método N.A.V.E.",
        descricao:
          "Tudo parte de um diagnóstico: revisão do modelo de negócio, compreensão da audiência e definição da personalidade da marca.",
        itens: [
          "Negócio: contexto, metas de curto e longo prazo e objetivo principal",
          "Audiência: segmentos de mercado, tipos de consumidor e personas",
          "Valor: proposta de valor, análise de mercado e auditoria da concorrência",
          "Estória: história de criação, sistema de crenças, propósito e atributos",
        ],
        mockup: <NaveMockup />,
      },
      {
        label: "ESTRATÉGIA",
        icone: Layers,
        titulo: "Uma plataforma de marca pra guiar cada decisão",
        descricao:
          "O resultado do diagnóstico vira estratégia: plataforma de marca e direção criativa, documentadas num relatório.",
        itens: [
          "Entrevistas individuais com colaboradores chave",
          "Workshop de estratégia facilitado por um estrategista",
          "Pesquisas internas e análise das informações coletadas",
          "Relatório de estratégia com tudo o que foi apurado",
        ],
        mockup: <PlataformaMockup />,
      },
      {
        label: "POSICIONAMENTO",
        icone: MessageSquareQuote,
        titulo: "O que a marca fala e como ela fala",
        descricao:
          "O eixo narrativo da marca: sua promessa, a mensagem central e o manifesto. Como a sua empresa quer ser lembrada.",
        itens: [
          "Eixo narrativo e storytelling",
          "Promessa, slogan e manifesto",
          "Território lexical e expressões próprias",
          "Tom de voz aplicado aos canais da marca",
        ],
        mockup: <VerbalMockup />,
      },
      {
        label: "IDENTIDADE VISUAL",
        icone: PenTool,
        titulo: "Os elementos que fazem a marca ser reconhecida",
        descricao:
          "O conjunto de características visuais que identificam a marca, criado a partir da estratégia e não do gosto pessoal.",
        itens: [
          "Logo, símbolos e assinaturas",
          "Paleta de cores e tipografia",
          "Ícones, grafismos e ilustrações",
          "Direção de fotografia e animações",
        ],
        mockup: <VisualMockup />,
      },
      {
        label: "NAMING",
        icone: Tag,
        titulo: "Um nome que já nasce com estratégia",
        descricao:
          "Criação de nome pra marca, submarcas ou produtos, alinhado ao posicionamento definido no diagnóstico.",
        itens: [
          "Nome da marca principal",
          "Nomes de submarcas e linhas",
          "Nomes de produtos do portfólio",
          "Escolha guiada pela plataforma de marca",
        ],
        mockup: <NamingMockup />,
      },
      {
        label: "GUIA DE MARCA",
        icone: BookOpen,
        titulo: "Tudo unido num guia de comunicação",
        descricao:
          "Estratégia, posicionamento e identidade verbal e visual reunidos num só documento, pra marca falar igual em qualquer ponto de contato.",
        itens: [
          "Plataforma de marca documentada",
          "Regras de identidade verbal e visual",
          "Aplicações nos pontos de contato",
          "Referência pra time interno e fornecedores",
        ],
        mockup: <GuiaMockup />,
      },
    ],
  },

  jornada: {
    eyebrow: "LINHA DO TEMPO",
    titulo: "Cada fase entrega",
    tituloDestaque: "uma decisão validada",
    subtitulo:
      "Da estratégia de marca à identidade de marca, em quatro fases e oito etapas.",
    etapas: [
      {
        numero: 1,
        titulo: "Coletando",
        descricao:
          "Diagnóstico: entrevistas individuais, workshop de estratégia e pesquisas internas pra levantar tudo sobre o negócio.",
      },
      {
        numero: 2,
        titulo: "Explorando",
        descricao:
          "Direção estratégica e criativa: relatório de estratégia e plataforma de marca com a síntese do que foi apurado.",
      },
      {
        numero: 3,
        titulo: "Criando",
        descricao:
          "Key Word e Key Visual: proposta de posicionamento e identidade verbal, seguida da proposta de identidade visual.",
      },
      {
        numero: 4,
        titulo: "Definindo",
        descricao:
          "Guia de marca: estratégia, posicionamento e identidade verbal e visual unidos num guia de comunicação.",
      },
    ],
  },

  investimento: {
    eyebrow: "EMPRESA OU MARCA",
    titulo: "Antes e depois do Branding",
    subtitulo:
      "A diferença entre ter um logotipo e ter uma marca que as pessoas reconhecem, lembram e escolhem.",
    cenarioAtual: {
      titulo: "Cenário Atual",
      label: "HOJE",
      destaque: "Lembrada pelo preço",
      subtitulo: "Visual sem estratégia por trás",
      items: [
        "Comunicação que muda conforme quem escreve",
        "Público que não entende o que torna a empresa diferente",
        "Decisões de marca tomadas no gosto pessoal",
      ],
    },
    cenarioFuturo: {
      titulo: "Cenário com Branding",
      label: "COM MÉTODO",
      destaque: "Lembrada pelo propósito",
      subtitulo: "Estratégia, posicionamento e identidade alinhados",
      items: [
        "Plataforma de marca clara: propósito, valores, promessa e público",
        "Mesma voz e mesmo visual em todos os pontos de contato",
        "Diferencial percebido que sustenta valor e fideliza audiência",
        "Guia de marca pra orientar time e fornecedores",
      ],
    },
  },

  precos: {
    eyebrow: "INVESTIMENTO",
    titulo: "Serviços e valores",
    planos: [
      {
        eyebrow: "ETAPA 01 · A BASE",
        nome: "Estratégia",
        descricao:
          "Workshop, entrevistas e pesquisas entregues num relatório de estratégia de marca pra guiar todas as decisões da criação.",
        valor: "R$ 4.000",
        rotuloValor: "a partir de",
        destaque: true,
        itens: [
          "Workshop de estratégia com exercícios multidisciplinares",
          "Facilitação por um estrategista de marca",
          "Entrevistas com colaboradores e/ou clientes",
          "Pesquisas qualitativas e quantitativas",
          "Relatório de estratégia de marca",
        ],
        observacao:
          "É a etapa que orienta todas as outras. Ponto de partida recomendado pra qualquer projeto de marca.",
      },
      {
        eyebrow: "ETAPA 02 · A NARRATIVA",
        nome: "Posicionamento + Identidade Verbal",
        descricao:
          "O que e como a marca fala, a história que ela conta e a promessa que ela faz.",
        valor: "R$ 3.000",
        rotuloValor: "a partir de",
        itens: [
          "Posicionamento de marca e eixo narrativo",
          "Storytelling, slogan e manifesto",
          "Território lexical e expressões",
          "Tom de voz da marca",
        ],
      },
      {
        eyebrow: "ETAPA 03 · O VISUAL",
        nome: "Identidade Visual",
        descricao:
          "Os elementos gráficos que constroem a identidade visual da marca.",
        valor: "R$ 4.000",
        rotuloValor: "a partir de",
        itens: [
          "Logo, símbolos e assinaturas",
          "Ícones, cores e tipografia",
          "Grafismos e animações",
          "Ilustrações e fotografia",
        ],
        observacao:
          "Colaterais como apresentações, editorial, embalagem, web design, sinalização e templates são orçados à parte.",
      },
      {
        eyebrow: "SOB DEMANDA · O NOME",
        nome: "Naming",
        descricao:
          "Criação de nome pra marca, submarcas e/ou produtos.",
        valor: "R$ 1.000",
        rotuloValor: "a partir de",
        itens: [
          "Nome da marca",
          "Nomes de submarcas",
          "Nomes de produtos",
        ],
        observacao:
          "Todos os valores são a partir de. O orçamento final depende do escopo de cada projeto.",
      },
    ],
  },

  cta: {
    eyebrow: "PRÓXIMO PASSO",
    titulo: "Bora transformar sua empresa",
    tituloDestaque: "em marca?",
    descricao:
      "Cada projeto começa com uma conversa. Me chama no WhatsApp e a gente define juntos o escopo ideal pra sua marca.",
    botaoLabel: "Falar no WhatsApp",
    botaoLink: WHATSAPP_LINK,
  },

  footer: {
    logoSrc: logo,
    logoAlt: "Gabriel Gonzaga",
    siteUrl: WHATSAPP_LINK,
    siteLabel: "Falar com Gabriel Gonzaga",
    nota: "Gabriel Gonzaga · Consultor de marca e Branding. Estratégia, posicionamento e identidade pra empresas pequenas e grandes de diversos setores.",
  },
};
