import { useState } from "react";
import { Menu, X, Star, ArrowRight, CheckCircle2 } from "lucide-react";

// ---------- Header ----------
function Header() {
  const [open, setOpen] = useState(false);
  const links = ["Product", "Features", "Pricing", "About"];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
          <span className="font-semibold text-slate-900 text-lg">DummyApp</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </button>
          <button className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Get started
          </button>
        </div>

        <button
          className="md:hidden text-slate-700"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 px-6 py-4 flex flex-col gap-4">
          {links.map((link) => (
            <a key={link} href="#" className="text-sm text-slate-600">
              {link}
            </a>
          ))}
          <button className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg w-full">
            Get started
          </button>
        </div>
      )}
    </header>
  );
}

// ---------- Hero ----------
function Hero() {
  return (
    <section className="bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-24 text-center">
        <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-6">
          Placeholder badge text
        </span>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight max-w-3xl mx-auto">
          This is a dummy headline for testing purposes
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto">
          Some placeholder subtext goes here describing the fake product.
          Replace this with real copy whenever you're ready.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            Primary action <ArrowRight size={18} />
          </button>
          <button className="bg-white text-slate-700 px-6 py-3 rounded-lg font-medium border border-slate-300 hover:bg-slate-100 transition-colors">
            Secondary action
          </button>
        </div>

        <div className="mt-16 bg-white border border-slate-200 rounded-xl shadow-sm max-w-4xl mx-auto h-72 flex items-center justify-center text-slate-400">
          [ Placeholder screenshot / product image ]
        </div>
      </div>
    </section>
  );
}

// ---------- CTA ----------
function CTA() {
  return (
    <section className="bg-indigo-600">
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-white">
          Dummy call-to-action heading
        </h2>
        <p className="mt-3 text-indigo-100">
          One more placeholder line encouraging the fake user to take action.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
            Get started free
          </button>
          <button className="text-white px-6 py-3 rounded-lg font-medium border border-indigo-400 hover:bg-indigo-500 transition-colors">
            Contact sales
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------- Testimonials ----------
function Testimonials() {
  const testimonials = [
    {
      name: "Jane Doe",
      role: "Product Manager, Fake Co.",
      quote:
        "This is placeholder testimonial text. It sounds very impressed with the dummy product.",
    },
    {
      name: "John Smith",
      role: "Engineer, Example Inc.",
      quote:
        "Another fake quote praising this fictional tool for testing UI layouts.",
    },
    {
      name: "Alex Lee",
      role: "Founder, Sample Studio",
      quote:
        "Lorem ipsum style feedback used purely to fill space in this test component.",
    },
  ];

  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">
            What our fake customers say
          </h2>
          <p className="mt-2 text-slate-500">
            Placeholder testimonials for layout testing
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="border border-slate-200 rounded-xl p-6 bg-slate-50"
            >
              <div className="flex gap-1 text-amber-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> Fake stat #1
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> Fake stat #2
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> Fake stat #3
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------- Footer ----------
function Footer() {
  const columns = [
    {
      title: "Product",
      links: ["Features", "Pricing", "Integrations", "Changelog"],
    },
    {
      title: "Company",
      links: ["About", "Blog", "Careers", "Contact"],
    },
    {
      title: "Resources",
      links: ["Docs", "Support", "Community", "Status"],
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <span className="font-semibold text-white text-lg">DummyApp</span>
          </div>
          <p className="text-sm text-slate-400">
            Placeholder footer description text for this dummy test app.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-white font-medium mb-4 text-sm">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
          <p>&copy; 2026 DummyApp. All rights reserved (not really).</p>
          <p>Built for testing purposes only.</p>
        </div>
      </div>
    </footer>
  );
}

// ---------- Home Page ----------
function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <CTA />
      <Testimonials />
      <Footer />
    </div>
  );
}

export default HomePage;
