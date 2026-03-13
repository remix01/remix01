import { Card } from '@/components/ui/card'

export const metadata = {
  title: 'Profil | LiftGO',
  description: 'Vaš profil',
}

export default function ProfilePage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Profil</h1>
        <p className="text-slate-600 mt-2">Upravljajte vaš profil in nastavitve</p>
      </div>

      <Card className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <p className="text-slate-600 text-lg">Profil - čakajući na implementacijo</p>
        <p className="text-slate-500 mt-2">Ta funkcionalnost je v razvoju.</p>
      </Card>
    </div>
  )
}
