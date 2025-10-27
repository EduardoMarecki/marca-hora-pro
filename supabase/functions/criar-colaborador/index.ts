// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Identify caller and enforce admin
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { data: userData, error: getUserError } = await admin.auth.getUser(token);
    if (getUserError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const callerId = userData.user.id;
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const body = await req.json();
    const { email, nome, empresaId, cargo } = body as { email: string; nome: string; empresaId?: string; cargo?: string };

    if (!email || !nome) {
      return new Response(JSON.stringify({ error: "email and nome are required" }), { status: 400 });
    }

    // Create user with default password and basic metadata
    const DEFAULT_PASSWORD = "Ponto@2025";
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      user_metadata: { nome },
      email_confirm: false, // do not auto-confirm
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
    }

    const newUser = created.user;
    // Send invite/confirmation email to the user (official method that triggers email)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) {
      // Non-blocking: continue, but report
      console.error("inviteUserByEmail error:", inviteErr.message);
    }

    // Associate profile with empresa_id and cargo if provided
    if (empresaId || cargo) {
      const updates: { empresa_id?: string; cargo?: string } = {};
      if (empresaId) updates.empresa_id = empresaId;
      if (cargo) updates.cargo = cargo;
      const { error: profileErr } = await admin.from("profiles").update(updates).eq("id", newUser.id);
      if (profileErr) {
        console.error("update profile error:", profileErr.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.id, email }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500 });
  }
});