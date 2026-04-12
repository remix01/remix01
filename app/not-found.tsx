import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stran ni bila najdena</h1>
        <p className="text-gray-600 mb-8">
          Stran, ki jo iščete, ne obstaja ali je bila premaknjena.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Nazaj na domačo stran
        </Link>
      </div>
    </div>
  )
}
