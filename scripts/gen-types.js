require('dotenv').config({ path: '.env.local' })
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.SUPABASE_DB_URL // Dashboard에서 복사한 전체 URL (선택적)

// 방법 1: Dashboard에서 복사한 DB URL을 직접 사용 (권장)
if (dbUrl) {
  console.log('🔄 Generating Supabase types using SUPABASE_DB_URL...')
  generateTypes(dbUrl)
}
// 방법 2: 환경변수로부터 자동 생성
else if (supabaseUrl && serviceRoleKey) {
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  if (!projectRef) {
    console.error('❌ Invalid NEXT_PUBLIC_SUPABASE_URL format')
    process.exit(1)
  }

  // Service Role Key를 URL 인코딩 (특수문자 처리)
  const encodedKey = encodeURIComponent(serviceRoleKey)
  const constructedDbUrl = `postgresql://postgres.${projectRef}:${encodedKey}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`

  console.log('🔄 Generating Supabase types...')
  console.log(`📍 Project: ${projectRef}`)
  generateTypes(constructedDbUrl)
} else {
  console.error('❌ Required environment variables not set in .env.local')
  console.error('Option 1: Set SUPABASE_DB_URL (권장)')
  console.error('Option 2: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

function generateTypes(dbUrl) {
  try {
    const command = `npx supabase gen types typescript --db-url "${dbUrl}"`
    const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })

    const outputPath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'database.ts')
    fs.writeFileSync(outputPath, output, 'utf-8')

    console.log('✅ Types generated successfully at src/lib/supabase/database.ts')
  } catch (error) {
    console.error('❌ Failed to generate types')
    console.error('\n💡 권장 방법:')
    console.error('1. Supabase Dashboard > Project Settings > Database')
    console.error('2. "Connection string" 섹션 > "Use connection pooling" 체크')
    console.error('3. Mode: "Transaction" 선택')
    console.error('4. 표시된 URI를 복사')
    console.error('5. .env.local에 추가:')
    console.error('   SUPABASE_DB_URL="복사한_전체_URI"')
    console.error('\n그 후 npm run gen:types 재실행')
    process.exit(1)
  }
}
