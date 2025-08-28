'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from "next/image"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Image
          className="mx-auto h-12 w-auto mb-4"
          src="/next.svg"
          alt="Church Management System"
          width={120}
          height={48}
        />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading Church Management System...</p>
        <p className="mt-2 text-sm text-gray-500">✅ Auto-deployment is working!</p>
      </div>
    </div>
  )
}
