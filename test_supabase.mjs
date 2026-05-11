import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dmaakqzwctmnvleytvqr.supabase.co'
const supabaseKey = 'sb_publishable_u6EPL0qZeLb1mQb2gSV-MQ_W892QLxO'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', supabaseUrl)
  console.log('Key (first 20 chars):', supabaseKey.substring(0, 20) + '...')
  
  try {
    // 简单测试：尝试读取 conventions 表
    const { data, error } = await supabase
      .from('conventions')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.error('Error details:', error)
    } else {
      console.log('✅ Connection successful!')
      console.log('Data:', data)
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

testConnection()
