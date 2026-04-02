export default function ChartsPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gray-100 blur-3xl opacity-60" />
        <div className="relative px-8 py-14 md:px-14">
          <div className="flex items-center gap-3 text-gray-500">
            <span className="text-[10px] tracking-[0.25em] uppercase">Charts</span>
          </div>
          <div className="mt-6">
            <h1 className="text-3xl md:text-5xl font-light tracking-tight text-gray-900">Charts</h1>
            <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">
              Enter an airport code to start. Data provided by Skylite Pilot Center.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10 border border-gray-100 rounded-2xl overflow-hidden bg-white">
        <iframe
          title="Charts"
          src="https://portal.skylitefly.com/charts?embedding=1"
          style={{ width: '100%', height: '1000px', border: 0 }}
          loading="lazy"
        />
      </section>
    </main>
  );
}
