const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    env[key] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  // Use RPC or a raw query to fetch columns of the claims table
  // Since we cannot run raw SQL easily via client library unless we have an RPC function,
  // we can check if there are other columns by doing a select of a single row and checking all keys.
  // We can also fetch from information_schema.columns using a custom RPC if it exists,
  // but let's query the first row and print all its keys. We already did that and got:
  // id, game_id, player_id, claim_type, is_valid, validation_reason, status, created_at.
  // Wait! Let's check if we can insert a claim WITHOUT claim_data.
  // Let's test inserting a claim without claim_data column to see if it succeeds.
  const { data: insertData, error: insertError } = await supabase
    .from('claims')
    .insert({
      game_id: '3974d19b-2804-413d-9bea-3e831faf88cc',
      player_id: '5173f8fe-9f99-494e-b944-7a4329e261e4',
      claim_type: 'corners',
      is_valid: true,
      validation_reason: 'Test approved without claim_data',
      status: 'approved'
    })
    .select();

  console.log("Insert result without claim_data:", insertData);
  console.log("Insert error without claim_data:", insertError);
}

test();
