import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database health check failed:', error);
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Database connection failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      checks: {
        database: 'ok',
        environment_variables: {
          supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          api_url: !!process.env.NEXT_PUBLIC_API_URL
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
}
