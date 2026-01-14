
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdvedlmnapxxfvpyfwqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdmVkbG1uYXB4eGZ2cHlmd3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjE5NzUsImV4cCI6MjA2MDM5Nzk3NX0.yLIbYKF1PfzEo3gMO0H8SgXN8AAPRYgDTJewg8nb7GA';

export const supabase = createClient(supabaseUrl, supabaseKey);
