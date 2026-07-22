import { ArrowRight, BarChart3, BrainCircuit, CalendarRange, Check, Clock3, Cloud, Command, Focus, Menu, ShieldCheck, Sparkles, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandLogo } from './BrandLogo'

type PageKey = 'home' | 'features' | 'pricing' | 'privacy' | 'terms' | 'contact' | 'about'
const pathMap: Record<string, PageKey> = { '/': 'home', '/features': 'features', '/pricing': 'pricing', '/privacy': 'privacy', '/terms': 'terms', '/contact': 'contact', '/about': 'about' }
const metadata: Record<PageKey, { title: string; description: string }> = {
  home: { title: 'GM Daily Planner — Tu día, diseñado con intención', description: 'Planifica tareas, protege tu enfoque y construye hábitos desde un espacio de productividad elegante y privado.' },
  features: { title: 'Funciones — GM Daily Planner', description: 'Planificación inteligente, enfoque, hábitos, calendario y estadísticas en un solo producto.' },
  pricing: { title: 'Planes — GM Daily Planner', description: 'Empieza gratis y evoluciona con herramientas premium de productividad.' },
  privacy: { title: 'Privacidad — GM Daily Planner', description: 'Conoce cómo GM Daily Planner protege y procesa tus datos.' },
  terms: { title: 'Términos — GM Daily Planner', description: 'Términos de servicio de GM Daily Planner.' },
  contact: { title: 'Contacto — GM Daily Planner', description: 'Habla con el equipo de GM Daily Planner.' },
  about: { title: 'Nosotros — GM Daily Planner', description: 'La visión detrás de una productividad más humana.' },
}

function usePageMetadata(page: PageKey) {
  useEffect(() => {
    const meta = metadata[page]
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', meta.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', meta.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${window.location.origin}${window.location.pathname}`)
  }, [page])
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className="marketing-header"><div className="marketing-container"><BrandLogo/><nav className={open ? 'open' : ''} aria-label="Navegación principal"><a href="/features">Funciones</a><a href="/pricing">Planes</a><a href="/about">Nosotros</a><a href="/contact">Contacto</a></nav><div className="marketing-actions"><a className="text-link" href="/app">Iniciar sesión</a><a className="button-primary small" href="/app">Abrir aplicación</a><button className="mobile-nav" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>{open ? <X/> : <Menu/>}</button></div></div></header>
}

function Footer() {
  return <footer className="marketing-footer"><div className="marketing-container footer-grid"><div><BrandLogo inverse/><p>Claridad para decidir. Espacio para avanzar.</p></div><div><strong>Producto</strong><a href="/features">Funciones</a><a href="/pricing">Planes</a><a href="/app">Aplicación</a></div><div><strong>Compañía</strong><a href="/about">Nosotros</a><a href="/contact">Contacto</a></div><div><strong>Legal</strong><a href="/privacy">Privacidad</a><a href="/terms">Términos</a></div></div><div className="marketing-container footer-bottom"><span>© 2026 GM Daily Planner</span><span>Diseñado para una productividad más humana.</span></div></footer>
}

function ProductPreview() {
  return <div className="product-preview" aria-label="Vista previa de GM Daily Planner"><div className="preview-top"><span/><span/><span/><div>gmplanner.app/app</div></div><div className="preview-shell"><aside><BrandLogo compact inverse/><i className="active"><Command/> Inicio</i><i><CalendarRange/> Calendario</i><i><Focus/> Enfoque</i><i><BarChart3/> Informes</i></aside><div className="preview-main"><div className="preview-greeting"><div><small>MARTES, 22 DE JULIO</small><strong>Buenos días, construyamos un gran día.</strong></div><button><Sparkles/>Planificar mi día</button></div><div className="preview-metrics"><article><span>Progreso</span><strong>72%</strong></article><article><span>Enfoque</span><strong>2h 15m</strong></article><article><span>Racha</span><strong>12 días</strong></article></div><div className="preview-content"><section><h3>Prioridades de hoy</h3>{['Preparar presentación', 'Revisar objetivos', 'Sesión de estrategia'].map((item, index) => <p key={item}><b className={index === 0 ? 'done' : ''}>{index === 0 && <Check/>}</b><span>{item}</span><em>{index === 0 ? '08:30' : index === 1 ? '10:00' : '14:00'}</em></p>)}</section><section className="focus-preview"><Clock3/><span>Centro de enfoque</span><strong>25:00</strong><button>Comenzar</button></section></div></div></div></div>
}

const benefits = [
  { icon: BrainCircuit, title: 'Planificación inteligente', text: 'Convierte tus prioridades en un día posible, sin perder el control de tus decisiones.' },
  { icon: Focus, title: 'Enfoque protegido', text: 'Pomodoro, temporizador y seguimiento de tiempo integrados en tu flujo.' },
  { icon: CalendarRange, title: 'Todo en contexto', text: 'Tareas, agenda, hábitos, objetivos y calendario trabajando como un solo sistema.' },
  { icon: Cloud, title: 'Disponible en todas partes', text: 'Sincronización segura, instalación PWA y funcionamiento incluso sin conexión.' },
  { icon: BarChart3, title: 'Progreso comprensible', text: 'Métricas claras, rachas y resúmenes que ayudan sin añadir presión.' },
  { icon: ShieldCheck, title: 'Privado por diseño', text: 'Tus datos están aislados por usuario y protegidos con políticas de acceso estrictas.' },
]

function PricingCards({ compact = false }: { compact?: boolean }) {
  return <div className="pricing-grid"><article><span>Personal</span><h3>Gratis</h3><p>Para construir un sistema diario claro.</p><a className="button-secondary" href="/app">Comenzar ahora</a><ul><li><Check/>Tareas, agenda y hábitos</li><li><Check/>Calendario y enfoque</li><li><Check/>Modo offline</li></ul></article><article className="featured"><em>PRÓXIMAMENTE</em><span>Premium</span><h3>$8<small>/mes</small></h3><p>Para quienes quieren optimizar cada semana.</p><a className="button-primary" href="/app">Probar la versión actual</a><ul><li><Check/>Todo en Personal</li><li><Check/>Planificación avanzada</li><li><Check/>Informes ampliados</li>{!compact && <li><Check/>Sincronización multi-dispositivo</li>}</ul></article></div>
}

function HomePage() {
  return <><section className="hero"><div className="hero-glow one"/><div className="hero-glow two"/><div className="marketing-container hero-content"><div className="eyebrow"><Sparkles/>Una forma más serena de hacer que el día cuente</div><h1>Tu día, diseñado<br/>con <span>intención.</span></h1><p>Organiza prioridades, protege tu enfoque y entiende tu progreso desde un espacio construido para pensar con claridad.</p><div className="hero-actions"><a className="button-primary" href="/app">Empezar gratis <ArrowRight/></a><a className="button-secondary" href="/features">Explorar funciones</a></div><small>No requiere tarjeta · Funciona sin conexión · Tus datos son tuyos</small></div><div className="marketing-container preview-wrap"><ProductPreview/></div></section><section className="logo-strip"><div className="marketing-container"><span>UN SISTEMA COMPLETO PARA</span><p><b>Planificar</b><b>Enfocarte</b><b>Construir hábitos</b><b>Medir progreso</b></p></div></section><section className="marketing-section"><div className="marketing-container"><div className="section-heading"><span>TODO EN SU LUGAR</span><h2>Menos ruido. Más avance.</h2><p>Cada herramienta tiene un propósito y comparte el mismo contexto.</p></div><div className="benefit-grid">{benefits.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon/></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section><section className="intelligence-section"><div className="marketing-container intelligence-grid"><div><span className="section-label">PLANIFICADOR INTELIGENTE</span><h2>Una propuesta realista.<br/>La decisión siempre es tuya.</h2><p>GM analiza prioridades, vencimientos, energía y espacios disponibles para sugerir un plan sin modificar nada hasta que lo confirmes.</p><ul><li><Check/>Determinista y explicable</li><li><Check/>Respeta tu agenda existente</li><li><Check/>Tú apruebas cada cambio</li></ul><a href="/features">Descubrir cómo funciona <ArrowRight/></a></div><div className="plan-card"><div><Sparkles/><span>Propuesta para hoy</span><em>90 min</em></div><article><time>08:00</time><p><strong>Preparar propuesta</strong><small>Prioridad alta · Energía media</small></p></article><article><time>08:45</time><p><strong>Revisar objetivos</strong><small>Vence hoy · 30 minutos</small></p></article><article><time>09:15</time><p><strong>Responder mensajes</strong><small>Espacio disponible</small></p></article><button>Aplicar a mi agenda</button></div></div></section><section className="marketing-section pricing-section"><div className="marketing-container"><div className="section-heading"><span>PLANES SIMPLES</span><h2>Empieza hoy. Crece a tu ritmo.</h2></div><PricingCards compact/></div></section><section className="faq-section"><div className="marketing-container"><div className="section-heading"><span>PREGUNTAS FRECUENTES</span><h2>Todo lo que necesitas saber.</h2></div><div className="faq-grid">{[['¿Funciona sin conexión?','Sí. La aplicación conserva tus datos localmente y sincroniza cuando vuelve la conexión.'],['¿El planificador usa inteligencia artificial?','No todavía. V1 es un motor determinista, transparente y predecible.'],['¿Puedo instalarla en móvil y escritorio?','Sí. Es una PWA instalable en Windows, macOS, Android y iPhone.'],['¿Mis datos son privados?','Sí. La sincronización aplica aislamiento estricto por usuario mediante RLS.']].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section><Cta/></>
}

function Cta() { return <section className="cta-section"><div className="marketing-container"><div><Zap/><h2>Haz espacio para lo que importa.</h2><p>Tu próximo gran día comienza con una decisión clara.</p><a className="button-light" href="/app">Abrir GM Daily Planner <ArrowRight/></a></div></div></section> }

function FeaturesPage() { return <><PageHero label="PRODUCTO" title="Todo lo que necesitas. Nada que estorbe." text="Un sistema coherente que conecta planificación, ejecución y reflexión."/><section className="marketing-section"><div className="marketing-container benefit-grid large">{benefits.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon/></span><h3>{title}</h3><p>{text}</p><a href="/app">Probar ahora <ArrowRight/></a></article>)}</div></section><Cta/></> }
function PricingPage() { return <><PageHero label="PLANES" title="Productividad premium, sin complejidad." text="Comienza con todo lo esencial. Premium llegará cuando realmente aporte más valor."/><section className="marketing-section"><div className="marketing-container"><PricingCards/></div></section><Cta/></> }
function PageHero({ label, title, text }: { label: string; title: string; text: string }) { return <section className="page-hero"><div className="marketing-container"><span>{label}</span><h1>{title}</h1><p>{text}</p></div></section> }

const legalContent = {
  privacy: { label: 'LEGAL', title: 'Política de privacidad', intro: 'Última actualización: 22 de julio de 2026', sections: [['Datos que tratamos','Procesamos el correo de la cuenta y los datos de planificación que decides sincronizar. La aplicación también puede funcionar de forma local.'],['Cómo protegemos tus datos','Aplicamos aislamiento por usuario, conexiones cifradas y políticas de acceso a nivel de fila.'],['Tus opciones','Puedes usar el modo local, cerrar sesión o solicitar información sobre tus datos mediante nuestro canal de contacto.']] },
  terms: { label: 'LEGAL', title: 'Términos de servicio', intro: 'Última actualización: 22 de julio de 2026', sections: [['Uso del servicio','GM Daily Planner se ofrece como herramienta de productividad personal. Debes utilizarla de forma legal y responsable.'],['Disponibilidad','Trabajamos para ofrecer un servicio confiable, aunque pueden existir periodos de mantenimiento o funciones en evolución.'],['Propiedad y responsabilidad','Conservas la titularidad de tus datos. El producto se proporciona sin garantías sobre resultados personales o profesionales específicos.']] },
  about: { label: 'NUESTRA VISIÓN', title: 'Productividad que se siente humana.', intro: 'GM Daily Planner nace de una idea sencilla: organizarse debería aportar calma, no más presión.', sections: [['Claridad antes que cantidad','Diseñamos herramientas que ayudan a decidir qué merece atención.'],['Control para el usuario','Las sugerencias deben ser explicables y nunca modificar tus datos sin confirmación.'],['Calidad duradera','Construimos una base visual y técnica pensada para evolucionar durante años.']] },
  contact: { label: 'CONTACTO', title: 'Hablemos.', intro: 'Preguntas, comentarios o ideas: queremos escucharlas.', sections: [['Soporte','Escríbenos a soporte@gmdailyplanner.com.'],['Producto','Para propuestas de producto y colaboraciones: hola@gmdailyplanner.com.'],['Tiempo de respuesta','Nuestro objetivo es responder cada mensaje en un máximo de dos días laborables.']] },
} as const

function ContentPage({ page }: { page: 'privacy' | 'terms' | 'about' | 'contact' }) {
  const content = legalContent[page]
  return <><PageHero label={content.label} title={content.title} text={content.intro}/><section className="content-page"><div className="marketing-container narrow">{content.sections.map(([title,text]) => <article key={title}><h2>{title}</h2><p>{text}</p></article>)}</div></section></>
}

export function MarketingSite() {
  const page = pathMap[window.location.pathname] ?? 'home'
  usePageMetadata(page)
  return <div className="marketing-site"><Header/><main>{page === 'home' ? <HomePage/> : page === 'features' ? <FeaturesPage/> : page === 'pricing' ? <PricingPage/> : <ContentPage page={page}/>}</main><Footer/></div>
}
