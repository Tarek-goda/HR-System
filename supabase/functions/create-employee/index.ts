// supabase/functions/create-employee/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // معالجة CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }     
  try {
    // 1. Client بصلاحيات المستخدم الحالي (عشان نتحقق هو Owner/HR Manager فعلاً)
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. تحقق إن المستخدم الحالي Owner أو HR Manager
    const { data: profile } = await userClient
      .from('profiles')
      .select('role, department_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'hr_manager'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Client إداري (Service Role) لعمل الحساب فعلياً
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, password, full_name, job_title, department_id, hire_date, salary, system_role } = await req.json();

    // 4. إنشاء حساب الـ Auth (بدون ما يأثر على جلسة الـ Owner)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. تحديث الـ role والـ department في profiles (الـ Trigger بيعمل الصف الأساسي)
    await adminClient
      .from('profiles')
      .update({ role: system_role ?? 'employee', full_name, department_id })
      .eq('id', newUser.user.id);

    // 6. إنشاء صف في employees
    const { error: empError } = await adminClient
      .from('employees')
      .insert({
        profile_id: newUser.user.id,
        job_title,
        hire_date,
        salary
      });

    if (empError) {
      return new Response(JSON.stringify({ error: empError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});