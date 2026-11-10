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
  const [supportCategory, setSupportCategory] = useState('General Question');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0); // First item open by default

  // Interactive Document Preview Mode ('notes' or 'math')
  const [previewMode, setPreviewMode] = useState('notes');

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
      q: 'How does DocMind make sure answers are accurate?',
      a: 'DocMind reads your uploaded document and finds the exact paragraphs that match your question. Every answer includes a clickable source card showing the exact page and paragraph so you can verify the facts yourself.',
    },
    {
      q: 'Can my teammates and I edit notes together at the same time?',
      a: 'Yes! Just like Google Docs or Notion, multiple people can edit the same document simultaneously. Changes sync in real-time with live collaborator avatars so nobody overwrites anyone else.',
    },
    {
      q: 'What types of files can I upload?',
      a: 'You can upload PDF files (.pdf), Markdown notes (.md), plain text files (.txt), and code files. You can also paste text directly into the editor.',
    },
    {
      q: 'Can it render math equations and formulas?',
      a: 'Yes. DocMind has full built-in support for math equations using LaTeX and KaTeX. From simple fractions to complex matrices and physics formulas, everything displays with clean textbook quality.',
    },
    {
      q: 'Is my data safe and private?',
      a: 'Yes. Your uploaded documents and notes are stored in your private, encrypted account. We never share your data, and your documents are never used to train external AI models.',
    },
    {
      q: 'Is DocMind free to use?',
      a: 'Yes! You can sign up, upload documents, search across them, and collaborate on notes completely free.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Upload your document',
      desc: 'Drag and drop any PDF, research paper, or text file. DocMind reads and organizes the content in seconds.',
      icon: <FileText className="w-5 h-5 text-[#c2410c]" />,
    },
    {
      step: '02',
      title: 'Smart indexing',
      desc: 'Every paragraph is indexed so you can find any topic, definition, or data point instantly.',
      icon: <Layers className="w-5 h-5 text-[#c2410c]" />,
    },
    {
      step: '03',
      title: 'Ask questions & get citations',
      desc: 'Ask any question in plain English. Get clear answers with direct links to the exact page and paragraph.',
      icon: <BookmarkCheck className="w-5 h-5 text-[#c2410c]" />,
    },
    {
      step: '04',
      title: 'Write & collaborate live',
      desc: 'Take notes, summarize findings, and write reports together with your team in real time.',
      icon: <PenTool className="w-5 h-5 text-[#c2410c]" />,
    },
  ];

  const comparisonItems = [
    {
      feature: 'Answers with proof',
      docmind: 'Exact page & paragraph references you can check',
      traditional: 'Summaries that might make things up',
    },
    {
      feature: 'Live team editing',
      docmind: 'Real-time multi-person collaborative editor',
      traditional: 'Static chat window with no shared editor',
    },
    {
      feature: 'Math & formula display',
      docmind: 'Clean textbook-style math formulas (KaTeX)',
      traditional: 'Messy raw code that is hard to read',
    },
    {
      feature: 'Privacy & security',
      docmind: '100% private to your account (Row Level Security)',
      traditional: 'Data often logged or shared with third parties',
    },
    {
      feature: 'Reading experience',
      docmind: 'Clean, distraction-free writing space',
      traditional: 'Cluttered screens full of ads and popups',
    },
  ];

  const testimonials = [
    {
      quote: 'DocMind makes reading long research papers so much faster. Being able to see the exact page reference for every answer gives me total confidence in the facts.',
      author: 'Elena Rostova',
      role: 'Research Scientist',
    },
    {
      quote: 'It feels as clean as Notion, but it actually knows everything inside my PDF files. Our team uses it every day to prepare project documentation.',
      author: 'Marcus Vance',
      role: 'Software Engineer & Writer',
    },
    {
      quote: 'The collaborative editor is brilliant. My study group and I can review complex math papers and write our shared notes together at the same time.',
      author: 'Aria Chen',
      role: 'Graduate Student',
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
            <a href="#comparison" className="hover:text-[#1c1917] transition-colors">Why DocMind</a>
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
              <span>Get Started</span>
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
            <span>Upload PDFs &bull; Get Verified Answers &bull; Take Notes Together</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif-editorial text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#1c1917] leading-[1.12]"
          >
            A simple, smart workspace for your documents.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base text-[#57534e] leading-relaxed max-w-xl mx-auto font-normal"
          >
            Upload your PDFs and documents. Ask questions and get clear, accurate answers with exact page references, then write and collaborate on notes in real time.
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
              <span>Get Started Free</span>
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

        {/* ── Document Preview Card ─────────────────────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-14 notion-card p-0 overflow-hidden shadow-lg border border-[#e7e5e4] bg-[#ffffff] text-left"
        >
          {/* Header row with sample switcher */}
          <div className="h-11 bg-[#faf9f6] border-b border-[#e7e5e4] px-4 flex items-center justify-between text-xs text-[#57534e]">
            <div className="flex items-center gap-2">
              <span className="text-sm">📄</span>
              <span className="font-medium text-[#1c1917]">
                {previewMode === 'notes' ? 'Product_Launch_Plan.pdf' : 'Physics_Research_Paper.pdf'}
              </span>
              <span className="text-[#a8a29e] font-serif-editorial italic">
                {previewMode === 'notes' ? '/ Page 3' : '/ Page 12'}
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-md border border-[#e7e5e4]">
              <button
                type="button"
                onClick={() => setPreviewMode('notes')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  previewMode === 'notes'
                    ? 'bg-[#ffffff] text-[#c2410c] shadow-xs'
                    : 'text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                Project Notes
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('math')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  previewMode === 'math'
                    ? 'bg-[#ffffff] text-[#c2410c] shadow-xs'
                    : 'text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                Math &amp; Formulas
              </button>
            </div>
          </div>

          {/* Document body */}
          <div className="p-6 sm:p-8 space-y-4 max-w-2xl mx-auto">
            {previewMode === 'notes' ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-[#f5f4f0]">
                  <h2 className="font-serif-editorial text-2xl font-normal text-[#1c1917] tracking-tight">
                    Product Launch Milestones &amp; Schedule
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#16a34a] font-medium bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#bbf7d0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                    <span>2 online</span>
                  </div>
                </div>

                {/* Plain English question asked */}
                <div className="p-3 rounded-lg bg-[#faf9f6] border border-[#e7e5e4] text-xs text-[#57534e]">
                  <span className="font-semibold text-[#1c1917]">Question asked: </span>
                  &ldquo;When is the public launch and what needs to be finished first?&rdquo;
                </div>

                {/* Verified Answer with accurate facts */}
                <div className="text-xs sm:text-sm text-[#292524] leading-relaxed font-serif-editorial text-[15px]">
                  Beta testing is scheduled to finish on <strong>August 15</strong>. The public release will launch on <strong>September 1</strong>, followed by customer onboarding webinars during the first week of September.
                </div>

                {/* Direct Citation Box with page proof */}
                <div className="p-3.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa] flex items-start gap-2.5 text-xs text-[#7c2d12]">
                  <BookmarkCheck className="w-4 h-4 text-[#c2410c] shrink-0 mt-0.5" />
                  <div className="font-serif-editorial text-[14px] leading-relaxed">
                    <strong className="font-sans font-semibold text-[#9a3412] text-xs">Verified Source:</strong> Page 3, Section 2.1 &mdash; <em>&ldquo;Beta testing concludes August 15, followed by public launch on September 1.&rdquo;</em>
                  </div>
                </div>

                {/* Team Collaboration Note */}
                <div className="pt-2 flex items-center gap-2 text-xs text-[#78716c]">
                  <div className="w-5 h-5 rounded-full bg-[#fed7aa] text-[#9a3412] flex items-center justify-center text-[10px] font-bold">
                    M
                  </div>
                  <span><strong>Marcus:</strong> Updated our team calendar with these dates!</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-[#f5f4f0]">
                  <h2 className="font-serif-editorial text-2xl font-normal text-[#1c1917] tracking-tight">
                    Attention Mechanism Formulation
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#78716c]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                    <span>KaTeX Enabled</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#44403c] leading-relaxed font-serif-editorial text-[15px]">
                  The model computes a weighted score for each piece of text by comparing the query against keys, then applies the weights to return the most relevant answer:
                </p>

                {/* Formula display */}
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

                {/* Citation callout */}
                <div className="p-3.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa] flex items-start gap-2.5 text-xs text-[#7c2d12]">
                  <BookmarkCheck className="w-4 h-4 text-[#c2410c] shrink-0 mt-0.5" />
                  <div className="font-serif-editorial text-[14px] leading-relaxed">
                    <strong className="font-sans font-semibold text-[#9a3412] text-xs">Verified Source:</strong> Section 3.2, Page 4 &mdash; <em>&ldquo;The two most commonly used attention functions are additive attention and dot-product attention.&rdquo;</em>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── Section 1: How It Works ────────────────────────────────────────── */}
      <section id="workflow" className="border-t border-[#e7e5e4] bg-[#ffffff] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// How It Works</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Four simple steps to get started.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Upload your files, ask questions, and take notes together with your team.
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
                    <span className="font-mono text-xs text-[#a8a29e] font-semibold">Step {step.step}</span>
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

      {/* ── Section 2: Why Choose DocMind ──────────────────────────────────── */}
      <section id="comparison" className="border-t border-[#e7e5e4] bg-[#faf9f6] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// Why DocMind</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Built for accuracy, not guesswork.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              See how DocMind gives you real page references instead of making things up.
            </p>
          </div>

          <div className="notion-card overflow-hidden border border-[#e7e5e4] bg-[#ffffff] shadow-sm">
            <div className="grid grid-cols-12 bg-[#f5f4f0] border-b border-[#e7e5e4] px-6 py-3 text-xs font-semibold text-[#1c1917]">
              <div className="col-span-4 text-[#78716c]">Feature</div>
              <div className="col-span-4 text-[#c2410c] flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" />
                <span>DocMind</span>
              </div>
              <div className="col-span-4 text-[#78716c]">Standard Chatbots</div>
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

      {/* ── Section 3: Community Feedback ─────────────────────────────────── */}
      <section className="border-t border-[#e7e5e4] bg-[#ffffff] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// What People Say</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Trusted by students, writers &amp; researchers.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Read how people are using DocMind to understand documents faster.
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

      {/* ── Section 4: Frequently Asked Questions ──────────────────────────── */}
      <section id="faq" className="border-t border-[#e7e5e4] bg-[#faf9f6] py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-mono uppercase text-[#c2410c] tracking-wider font-semibold">// Common Questions</span>
            <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
              Frequently asked questions.
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              Have other questions? Feel free to reach out to our team anytime.
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

      {/* ── Section 5: Get Started Call To Action ──────────────────────────── */}
      <section className="border-t border-[#e7e5e4] bg-[#ffffff] py-16 text-center">
        <div className="max-w-2xl mx-auto px-6 space-y-4">
          <h2 className="font-serif-editorial text-3xl sm:text-4xl font-normal text-[#1c1917] tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed max-w-lg mx-auto">
            Upload your first document, ask questions with real page references, and write notes together with your team.
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
            <span className="font-serif-editorial text-sm font-semibold text-[#1c1917]">DocMind</span>
            <span>&bull;</span>
            <span className="text-[#78716c]">Simple Document Assistant &amp; Notes</span>
          </div>

          <div className="flex items-center gap-6 text-[#78716c]">
            <a href="#workflow" className="hover:text-[#1c1917] transition-colors">How It Works</a>
            <a href="#comparison" className="hover:text-[#1c1917] transition-colors">Why DocMind</a>
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
          <span>&copy; {new Date().getFullYear()} DocMind. All rights reserved.</span>
          <span className="mt-2 sm:mt-0 font-serif-editorial italic">Designed for clear reading, verified answers &amp; simple notes.</span>
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
                    <p className="text-xs text-[#78716c]">We typically reply within 24 hours</p>
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
                    <h3 className="font-serif-editorial text-lg text-[#1c1917]">Message Sent!</h3>
                    <p className="text-xs text-[#57534e] max-w-xs mx-auto leading-relaxed">
                      Thank you for contacting us. We received your message under ticket <span className="font-mono text-[#c2410c] font-semibold">#SUP-8492</span>.
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
                        placeholder="alex@example.com"
                        className="input-notion text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#44403c] mb-1">Topic</label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="input-notion text-xs bg-[#ffffff] cursor-pointer"
                      >
                        <option value="General Question">General Question</option>
                        <option value="Technical Support">Technical Problem / Bug</option>
                        <option value="Feature Request">Feature Suggestion</option>
                        <option value="Privacy">Privacy &amp; Security</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#44403c] mb-1">
                        Message <span className="text-[#c2410c]">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="How can we help you?"
                        className="input-notion text-xs resize-none leading-relaxed"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <a
                        href="mailto:support@docmind.io"
                        className="text-[11px] text-[#78716c] hover:text-[#c2410c] underline"
                      >
                        support@docmind.io
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
