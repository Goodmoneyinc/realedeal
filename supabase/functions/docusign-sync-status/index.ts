import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const docusignAccountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const docusignAccessToken = Deno.env.get("DOCUSIGN_ACCESS_TOKEN");
    const docusignBaseUrl = Deno.env.get("DOCUSIGN_BASE_URL") || "https://demo.docusign.net/restapi";

    if (!docusignAccountId || !docusignAccessToken) {
      return new Response(
        JSON.stringify({
          error: "DocuSign not configured",
          message: "Please add DOCUSIGN_ACCOUNT_ID and DOCUSIGN_ACCESS_TOKEN to your environment variables",
          needsConfiguration: true
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { envelopeId, documentId } = await req.json();

    const envelopeResponse = await fetch(
      `${docusignBaseUrl}/v2.1/accounts/${docusignAccountId}/envelopes/${envelopeId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${docusignAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!envelopeResponse.ok) {
      throw new Error("Failed to fetch envelope status from DocuSign");
    }

    const envelope = await envelopeResponse.json();

    let documentStatus = "pending_signature";

    if (envelope.status === "completed") {
      documentStatus = "completed";
    } else if (envelope.status === "declined" || envelope.status === "voided") {
      documentStatus = "voided";
    } else if (envelope.status === "sent" || envelope.status === "delivered") {
      documentStatus = "pending_signature";
    }

    await supabase
      .from("documents")
      .update({
        status: documentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (envelope.recipients?.signers) {
      for (const signer of envelope.recipients.signers) {
        const signatureStatus = signer.status === "completed" ? "completed" : "sent";
        
        await supabase
          .from("document_signatures")
          .update({
            status: signatureStatus,
            signed_at: signer.status === "completed" ? signer.signedDateTime : null,
          })
          .eq("document_id", documentId)
          .eq("signer_email", signer.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: documentStatus,
        envelopeStatus: envelope.status,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error syncing DocuSign status:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to sync status",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});