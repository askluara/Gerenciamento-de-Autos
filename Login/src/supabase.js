require('dotenv').config(); // Carrega as variáveis do arquivo .env
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: SUPABASE_URL ou SUPABASE_KEY não foram encontradas no arquivo .env!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;