import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  ArrowRight, 
  Search, 
  FileText, 
  Edit3, 
  Bookmark, 
  Check, 
  Layers, 
  ShieldCheck,
  Feather,
  Sparkles,
  BookmarkCheck,
  PenTool,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  LifeBuoy,
  X,
  Send,
  CheckCircle2,
  Lock,
  Zap,
  Users,
  Compass,
  FileCode,
  Quote
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  // Support Modal State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportCategory, setSupportCategory] = useState('General Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0); // First item open by default

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportEmail || !supportMessage) return;
    setSupportLoading(true);

    setTimeout(() => {
      setSupportLoading(false);
      setSupportSubmitted(true);
      setTimeout(() => {
        setIsSupportOpen(false);
        setSupportSubmitted(false);
        setSupportName('');
        setSupportEmail('');
        setSupportMessage('');
      }, 2500);
    }, 600);
  };

  const faqs = [
    {
      q: 'How does source grounding prevent AI hallucinations?',
      a: 'DocMind extracts your text into overlapping semantic passages and stores high-dimensional embeddings in Supabase Postgres pgvector. When you inquire, only passages passing strict cosine-similarity thresholds are supplied to the language model. Every answer is bound strictly to cited paragraph bounds with exact page and section numbers.',
    },
    {
      q: 'Can multiple researchers edit the same note concurrently?',
      a: 'Yes. DocMind uses client-server Operational Transformation (OT) over WebSockets. Every keystroke is transformed against concurrent operations in real time, guaranteeing consistent document states and zero character loss even during rapid simultaneous co-authoring.',
    },
    {
      q: 'What file formats can I upload into the library vault?',
      a: 'DocMind natively ingests technical PDF documents (.pdf), Markdown notes (.md), plain text manuscripts (.txt), research code, and structured JSON files. You can also paste raw text buffers directly into the studio.',
    },
    {
      q: 'How does mathematical formula rendering (KaTeX) work?',
      a: 'Equations enclosed in standard LaTeX delimiters ($...$ for inline or $$...$$ / \\begin{aligned} for display blocks) are rendered natively into crisp typographic formulas accelerated by KaTeX, ensuring complex matrices and proofs render with print-grade clarity.',
    },
    {
      q: 'Are my research documents and notes kept private?',
      a: 'Absolutely. Every document chunk and note is protected by PostgreSQL Row Level Security (RLS) bound to your unique authenticated session. Your private research is never pooled, shared, or used to train third-party machine learning models.',
    },
    {
      q: 'Is DocMind free to use?',
      a: 'Yes. You can immediately upload documents, run grounded vector queries, and collaborate on shared notes free of charge with complete account isolation.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Upload & Parse',
      desc: 'Drag and drop research PDFs, manuscripts, or notes. DocMind extracts text and creates token-aware chunk boundaries with zero formatting loss.',
      icon: <FileText className="w-5 h-5 text-[#c2410c]" />,
    },
    {
      step: '02',
      title: 'Index & Vector Embed',
      desc: 'High-dimensional embeddings are generated for every paragraph and indexed with cosine distance metrics for instantaneous lookup.',
      icon: <Layers className="w-5 h-5 text-[#c2410c]" />,
    },
    {
      step: '03',
      title: 'Inquire with Verified Citations',
      desc: 'Synthesize insights across your library. The companion highlights exact quoted passages and paragraph references for every response.',
      icon: <BookmarkCheck className="w-5 h-5 text-[#c2410c]" />,
    },
    {
      step: '04',
      title: 'Live Collaborative Co-Editing',
      desc: 'Write technical papers, literature reviews, and notes together in real time with Operational Transformation and presence cursors.',
      icon: <PenTool className="w-5 h-5 text-[#c2410c]" />,
    },
  ];

  const comparisonItems = [
    {
      feature: 'Source Attribution',
      docmind: 'Exact paragraph & page citation bounds',
      traditional: 'Vague summaries or unverified guesses',
    },
    {
      feature: 'Real-Time Co-Authoring',
      docmind: 'Conflict-free Operational Transformation',
      traditional: 'Static read-only export or lockouts',
    },
    {
      feature: 'Mathematical Typography',
      docmind: 'Native KaTeX formula acceleration',
      traditional: 'Raw broken LaTeX code strings',
    },
    {
      feature: 'Data Privacy & Isolation',
      docmind: 'Postgres Row Level Security (RLS)',
      traditional: 'Shared model training logs',
    },
    {
      feature: 'Reading Environment',
      docmind: 'Distraction-free typographic ivory canvas',
      traditional: 'Cluttered dashboard with neon banners',
    },
  ];

  const testimonials = [
    {
      quote: 'DocMind replaced our fragmented research stack. Having verified paragraph citations side-by-side with a collaborative editor saves our lab dozens of hours every week.',
      author: 'Dr. Elena Rostova',
      role: 'Principal Researcher, Institute for Computational Biology',
    },
    {
      quote: 'The absence of AI clichés and distractions is a breath of fresh air. It feels like writing in Notion or Substack, but with the rigor of a grounded academic database.',
      author: 'Marcus Vance',
      role: 'Technical Author & Systems Engineer',
    },
    {
      quote: 'Being able to co-author math proofs with live KaTeX rendering and instant source citations is genuinely transformative for technical peer review.',
      author: 'Aria Chen',
      role: 'Doctoral Fellow in Theoretical Physics',
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] selection:bg-[#fed7aa] selection:text-[#7c2d12] flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#e7e5e4] bg-[#faf9f6]/90 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline text-[#1c1917]">
            <div className="w-7 h-7 rounded-md bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
              <Feather className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-[#1c1917] font-serif-editorial text-[17px]">DocMind</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f5f4f0] border border-[#e7e5e4] text-[#78716c]">
                Studio
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[#57534e]">
            <a href="#workflow" className="hover:text-[#1c1917] transition-colors">How It Works</a>
            <a href="#comparison" className="hover:text-[#1c1917] transition-colors">Comparison</a>
            <a href="#faq" className="hover:text-[#1c1917] transition-colors">FAQ</a>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="hover:text-[#1c1917] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>Support</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="md:hidden text-xs text-[#57534e] hover:text-[#1c1917] flex items-center gap-1 px-2 py-1"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>Support</span>
            </button>

            <Link
              to="/auth"
              className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] px-2 py-1 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate('/auth')}
              className="btn-ink text-xs"
            >
              <span>Start Writing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-16 text-center">
        <div className="max-w-2xl mx-auto space-y-5">
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffffff] border border-[#e7e5e4] text-xs text-[#57534e] shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]" />
            <span>Quiet Reading &bull; Grounded Citations &bull; Real-Time Notes</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif-editorial text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#1c1917] leading-[1.12]"
          >
            A quiet space for reading, research, and thinking.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base text-[#57534e] leading-relaxed max-w-xl mx-auto font-normal"
          >
            Upload technical research, manuscripts, and notes. Ask questions with verified paragraph citations, and co-author longform essays in real time.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3"
          >
            <button
              onClick={() => navigate('/auth')}
              className="btn-ink w-full sm:w-auto px-6 py-2.5 text-xs font-medium"
            >
              <span>Open Reading Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="btn-notion-secondary w-full sm:w-auto px-5 py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>Contact Support</span>
            </button>
          </motion.div>
        </div>

        {/* ── Notion-Style Minimal Reading Preview Card ─────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-14 notion-card p-0 overflow-hidden shadow-lg border border-[#e7e5e4] bg-[#ffffff] text-left"
        >
          {/* Notion header row */}
          <div className="h-10 bg-[#faf9f6] border-b border-[#e7e5e4] px-4 flex items-center justify-between text-xs text-[#57534e]">
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <span className="font-medium text-[#1c1917]">Attention_Mechanism_Analysis.pdf</span>
              <span className="text-[#a8a29e] font-serif-editorial italic">/ Section 3.2</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#78716c]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
              <span>Synced</span>
            </div>
          </div>

          {/* Minimalist document body */}
          <div className="p-8 space-y-4 max-w-2xl mx-auto">
            <h2 className="font-serif-editorial text-2xl font-normal text-[#1c1917] tracking-tight">
              Scaled Dot-Product Attention Formulation
            </h2>

            <p className="text-xs sm:text-sm text-[#44403c] leading-relaxed font-serif-editorial text-[15px]">
              We compute the matrix of outputs as a weighted sum of values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key:
            </p>

            {/* Editorial KaTeX math display */}
            <div className="p-4 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-center font-mono text-sm text-[#1c1917]">
              <span className="font-serif italic font-bold text-[#c2410c]">Attention</span>
              <span className="text-[#57534e]">(Q, K, V) = softmax</span>
              <span className="text-[#78716c]">(</span>
              <span className="text-[#1c1917] font-semibold">QK</span>
              <sup className="text-[#c2410c]">T</sup>
              <span className="text-[#78716c]"> / &radic;</span>
              <span className="italic text-[#57534e]">d</span>
              <sub className="text-[#78716c]">k</sub>
              <span className="text-[#78716c]">) </span>
              <span className="text-[#1c1917] font-semibold">V</span>
            </div>

            {/* Substack-style inline citation callout */}
            <div className="p-3.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa] flex items-start gap-2.5 text-xs text-[#7c2d12]">
              <BookmarkCheck className="w-4 h-4 text-[#c2410c] shrink-0 mt-0.5" />
              <div className="font-serif-editorial text-[14px] leading-relaxed">
                <strong className="font-sans font-semibold text-[#9a3412] text-xs">Verified Source:</strong> Vaswani et al., Section 3.2, Page 4 &mdash; <em>&ldquo;The two most commonly used attention functions are additive attention and dot-product attention.&rdquo;</em>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Section 1: Step-by-Step Workflow ───────────────────────────────── */}
      <section id="workflow" className="border-t border-[#e7e5e4] bg-[#ffffff] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// The Research Lifecycle</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              From raw literature to verified writing.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Every manuscript is deconstructed, semantically mapped, and anchored to exact references.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workflowSteps.map((step, idx) => (
              <div 
                key={idx}
                className="notion-card p-6 border border-[#e7e5e4] bg-[#faf9f6] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-[#a8a29e] font-semibold">[{step.step}]</span>
                    <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e7e5e4] flex items-center justify-center shadow-xs">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="font-serif-editorial text-lg text-[#1c1917] mb-2">{step.title}</h3>
                  <p className="text-xs text-[#57534e] leading-relaxed font-normal">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Comparison Grid (DocMind vs Generic PDF Tools) ──────── */}
      <section id="comparison" className="border-t border-[#e7e5e4] bg-[#faf9f6] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// Grounded Precision</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Engineered for academic rigor.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Why serious researchers choose DocMind over ungrounded generic chatbots.
            </p>
          </div>

          <div className="notion-card overflow-hidden border border-[#e7e5e4] bg-[#ffffff] shadow-sm">
            <div className="grid grid-cols-12 bg-[#f5f4f0] border-b border-[#e7e5e4] px-6 py-3 text-xs font-semibold text-[#1c1917]">
              <div className="col-span-4 text-[#78716c]">Capability</div>
              <div className="col-span-4 text-[#c2410c] flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" />
                <span>DocMind Studio</span>
              </div>
              <div className="col-span-4 text-[#78716c]">Generic PDF Chatbots</div>
            </div>

            <div className="divide-y divide-[#e7e5e4] text-xs">
              {comparisonItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 px-6 py-4 items-center gap-2">
                  <div className="col-span-4 font-medium text-[#1c1917]">{item.feature}</div>
                  <div className="col-span-4 text-[#c2410c] font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.docmind}</span>
                  </div>
                  <div className="col-span-4 text-[#78716c]">{item.traditional}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Research Community Quotes ──────────────────────────── */}
      <section className="border-t border-[#e7e5e4] bg-[#ffffff] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// Community Notes</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Trusted by writers &amp; researchers.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Quiet words from people who think, write, and publish with DocMind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="notion-card p-6 bg-[#faf9f6] border border-[#e7e5e4] flex flex-col justify-between space-y-4">
                <Quote className="w-5 h-5 text-[#c2410c]/50" />
                <p className="font-serif-editorial text-[14px] text-[#292524] leading-relaxed italic">
                  "{t.quote}"
                </p>
                <div className="pt-3 border-t border-[#e7e5e4]">
                  <p className="text-xs font-semibold text-[#1c1917]">{t.author}</p>
                  <p className="text-[11px] text-[#78716c] leading-tight mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Frequently Asked Questions (FAQ) ───────────────────── */}
      <section id="faq" className="border-t border-[#e7e5e4] bg-[#faf9f6] py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// Answers &amp; Clarity</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Frequently asked questions.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Have other questions? Reach out anytime through our support channel.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="notion-card bg-[#ffffff] border border-[#e7e5e4] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-medium text-sm text-[#1c1917] font-serif-editorial text-[16px]">
                      {faq.q}
                    </span>
                    <span className="text-[#a8a29e] shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-[#c2410c]" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="px-5 pb-5 text-xs text-[#57534e] leading-relaxed border-t border-[#f5f4f0] pt-3 font-normal">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c2410c] hover:underline cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Still have a question? Ask our support team &rarr;</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 5: Final Call To Action Banner ─────────────────────────── */}
      <section className="border-t border-[#e7e5e4] bg-[#ffffff] py-16 text-center">
        <div className="max-w-2xl mx-auto px-6 space-y-4">
          <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
            Begin your quiet research studio today.
          </h2>
          <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed max-w-lg mx-auto">
            Upload your first manuscript or paper, verify citations with zero hallucinations, and collaborate with your team.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="btn-ink px-6 py-2.5 text-xs font-medium"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="btn-notion-secondary px-5 py-2.5 text-xs flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>Need Help? Contact Support</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e7e5e4] bg-[#faf9f6] py-10 text-xs text-[#78716c]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[#44403c]">
            <span className="font-serif-editorial text-sm font-semibold text-[#1c1917]">DocMind Studio</span>
            <span>&bull;</span>
            <span className="text-[#78716c]">Clean Editorial Edition</span>
          </div>

          <div className="flex items-center gap-6 text-[#78716c]">
            <a href="#workflow" className="hover:text-[#1c1917] transition-colors">How It Works</a>
            <a href="#comparison" className="hover:text-[#1c1917] transition-colors">Comparison</a>
            <a href="#faq" className="hover:text-[#1c1917] transition-colors">FAQ</a>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="hover:text-[#c2410c] transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>
            <Link to="/auth" className="hover:text-[#1c1917] transition-colors">Sign In</Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-6 pt-6 border-t border-[#e7e5e4] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#a8a29e]">
          <span>&copy; {new Date().getFullYear()} DocMind Research Systems. All rights reserved.</span>
          <span className="mt-2 sm:mt-0 font-serif-editorial italic">Designed for slow reading, verified citations &amp; clean thought.</span>
        </div>
      </footer>

      {/* ── Floating Support Button ───────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsSupportOpen(true)}
          className="btn-ink px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium hover:scale-105 transition-transform"
        >
          <LifeBuoy className="w-4 h-4 text-[#c2410c]" />
          <span>Support</span>
        </button>
      </div>

      {/* ── Support & Feedback Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {isSupportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-md bg-[#ffffff] border border-[#e7e5e4] rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#e7e5e4] flex items-center justify-between bg-[#faf9f6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#ffffff] border border-[#e7e5e4] text-[#c2410c] flex items-center justify-center shadow-xs">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-serif-editorial text-base text-[#1c1917]">DocMind Support</h2>
                    <p className="text-xs text-[#78716c]">We typically respond within 24 hours</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSupportOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a8a29e] hover:text-[#1c1917] hover:bg-[#f5f4f0] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {supportSubmitted ? (
                  <div className="py-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center mx-auto border border-[#bbf7d0]">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif-editorial text-lg text-[#1c1917]">Inquiry Dispatched</h3>
                    <p className="text-xs text-[#57534e] max-w-xs mx-auto leading-relaxed">
                      Thank you for contacting us. A confirmation has been logged under ticket <span className="font-mono text-[#c2410c] font-semibold">#SUP-8492</span>.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#44403c] mb-1">Your Name</label>
                      <input
                        type="text"
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        placeholder="Alex Vance"
                        className="input-notion text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#44403c] mb-1">
                        Email Address <span className="text-[#c2410c]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="alex@domain.com"
                        className="input-notion text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#44403c] mb-1">Inquiry Category</label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="input-notion text-xs bg-[#ffffff] cursor-pointer"
                      >
                        <option value="General Inquiry">General Question</option>
                        <option value="Technical Support">Technical Support / Bug Report</option>
                        <option value="Feature Request">Feature Suggestion</option>
                        <option value="Security & RLS">Data Privacy &amp; Security</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#44403c] mb-1">
                        Message / Query <span className="text-[#c2410c]">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="Describe your question or issue in detail…"
                        className="input-notion text-xs resize-none leading-relaxed"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <a
                        href="mailto:support@docmind.io"
                        className="text-[11px] text-[#78716c] hover:text-[#c2410c] underline"
                      >
                        Direct: support@docmind.io
                      </a>

                      <button
                        type="submit"
                        disabled={supportLoading || !supportEmail || !supportMessage}
                        className="btn-ink text-xs py-2 px-4"
                      >
                        {supportLoading ? (
                          <span>Sending…</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Message</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
