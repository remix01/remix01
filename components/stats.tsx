export function Stats() {
  const stats = [
    { value: '5.000+', label: 'Opravljenih del' },
    { value: '225+', label: 'Aktivnih mojstrov' },
    { value: '98%', label: 'Uspešno zaključenih del' },
    { value: '<2h', label: 'Povprečni odzivni čas' },
  ]

  return (
    <section className="border-b bg-muted/50 py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Mobile: 2x2 grid with centered last item */}
        <div className="grid grid-cols-2 gap-6 sm:hidden">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className={`text-center ${index === stats.length - 1 && stats.length % 2 !== 0 ? 'col-span-2' : ''}`}
            >
              <p className="font-display text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        
        {/* Tablet+: Horizontal layout */}
        <div className="hidden gap-8 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
