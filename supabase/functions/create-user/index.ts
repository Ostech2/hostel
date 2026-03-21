// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    const err = new Error("No authorization header");
    (err as any).status = 401;
    throw err;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Use service role key to get user — this is more reliable in Edge Functions
  const adminAuthClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: callerUser }, error } = await adminAuthClient.auth.getUser(token);

  if (error || !callerUser) {
    console.error("Auth error:", error);
    const err = new Error("Unauthorized");
    (err as any).status = 401;
    throw err;
  }

  const adminDbClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await adminDbClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerUser.id)
    .in("role", ["admin", "warden"])
    .maybeSingle();

  if (!roleData) {
    const err = new Error("Only admins or wardens can manage users");
    (err as any).status = 403;
    throw err;
  }

  return { adminClient: adminDbClient, callerUser };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();

    // Check if this is a Database Webhook payload
    if (body.type && body.table) {
      return new Response(JSON.stringify({ success: true, message: "Webhook ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action } = body;

    // Diagnostic test action
    if (action === "test") {
      return new Response(JSON.stringify({ success: true, message: "Edge Function is reachable" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle delete_profile separately — open to admin and warden roles
    if (action === "delete_profile") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser();
      if (userError || !callerUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUser.id)
        .in("role", ["admin", "warden"])
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Only admins or wardens can delete students" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { profile_id } = body;
      if (!profile_id) {
        return new Response(JSON.stringify({ error: "profile_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete related records first to avoid FK constraint violations
      await adminClient.from("room_allocations").delete().eq("student_id", profile_id);
      await adminClient.from("user_roles").delete().eq("user_id", profile_id);
      try { await adminClient.from("activities").delete().eq("user_id", profile_id); } catch (_) { /* ignore */ }

      // Delete the profile
      const { error: deleteError } = await adminClient.from("profiles").delete().eq("id", profile_id);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require admin-only access
    const { adminClient } = await verifyAdmin(req);

    if (action === "update") {
      const { user_id, email, full_name, role, gender, phone, student_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update auth email if provided
      if (email) {
        const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
          email,
          email_confirm: true,
        });
        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (student_id) {
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("student_id", student_id)
          .neq("user_id", user_id)
          .maybeSingle();

        if (existingProfile) {
          return new Response(JSON.stringify({ error: "Student ID is already registered to another user" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update profile
      const updateData: Record<string, unknown> = {};
      if (full_name) updateData.full_name = full_name;
      if (email) updateData.email = email;
      if (gender !== undefined) updateData.gender = gender;
      if (phone !== undefined) updateData.phone = phone;
      if (student_id !== undefined) updateData.student_id = student_id;

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await adminClient
          .from("profiles")
          .update(updateData)
          .eq("user_id", user_id);

        if (profileError) {
          return new Response(JSON.stringify({ error: profileError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update role if provided
      if (role) {
        const { error: roleError } = await adminClient
          .from("user_roles")
          .upsert({ user_id, role }, { onConflict: "user_id" });

        if (roleError) {
          return new Response(JSON.stringify({ error: roleError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete role and profile first
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("user_id", user_id);

      // Delete the auth user completely
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_profile") {
      const { profile_id } = body;
      if (!profile_id) {
        return new Response(JSON.stringify({ error: "profile_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete room allocations first to avoid foreign key violations
      await adminClient
        .from("room_allocations")
        .delete()
        .eq("student_id", profile_id);

      // Also try to delete from user_roles and activities just in case
      await adminClient.from("user_roles").delete().eq("user_id", profile_id);
      
      // Attempt to delete from activities (if the table exists in the DB)
      try {
        await adminClient.from("activities").delete().eq("user_id", profile_id);
      } catch (e) {
        // Silently ignore if activities table doesn't exist or doesn't have user_id
      }

      // Delete the profile
      const { error: deleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", profile_id);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 200, // Return 200 so the frontend can easily read the data.error
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: create user
    const { email, password, full_name, role, gender, phone, student_id } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (student_id) {
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("student_id", student_id)
        .maybeSingle();

      if (existingProfile) {
        return new Response(JSON.stringify({ error: "Student ID is already registered to another user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id" });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (gender || phone || student_id) {
      await adminClient
        .from("profiles")
        .update({
          gender: gender || null,
          phone: phone || null,
          student_id: student_id || null,
        })
        .eq("user_id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ user: { id: newUser.user.id, email: newUser.user.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = (error as any)?.status || 500;
    
    console.error(`Error [${status}]: ${message}`);
    
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
