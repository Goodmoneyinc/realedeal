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

    const webhookData = await req.json();
    console.log("DocuSign webhook received:", JSON.stringify(webhookData, null, 2));

    const event = webhookData.event;
    const envelopeId = webhookData.data?.envelopeId || webhookData.envelopeId;

    if (!envelopeId) {
      throw new Error("No envelope ID in webhook");
    }

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, title")
      .eq("docusign_envelope_id", envelopeId)
      .single();

    if (docError || !document) {
      console.error("Document not found for envelope:", envelopeId);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let documentStatus = "pending_signature";
    let activityAction = "status_updated";
    let activityDetails = "";

    switch (event) {
      case "envelope-sent":
        documentStatus = "pending_signature";
        activityAction = "sent_for_signature";
        activityDetails = "Document sent for signature";
        break;

      case "envelope-delivered":
        documentStatus = "pending_signature";
        activityAction = "delivered";
        activityDetails = "Document delivered to recipient";
        break;

      case "recipient-completed":
      case "envelope-signed":
        const recipients = webhookData.data?.envelopeSummary?.recipients?.signers || [];
        const allSigned = recipients.every((r: any) => r.status === "completed");
        
        if (allSigned) {
          documentStatus = "signed";
          activityAction = "fully_signed";
          activityDetails = "All recipients have signed";
        } else {
          documentStatus = "pending_signature";
          activityAction = "partially_signed";
          activityDetails = "Recipient signed the document";
        }

        if (webhookData.data?.recipientEmail) {
          await supabase
            .from("document_signatures")
            .update({
              status: "completed",
              signed_at: new Date().toISOString(),
            })
            .eq("document_id", document.id)
            .eq("signer_email", webhookData.data.recipientEmail);
        }
        break;

      case "envelope-completed":
        documentStatus = "completed";
        activityAction = "completed";
        activityDetails = "Document signing completed";

        await supabase
          .from("document_signatures")
          .update({
            status: "completed",
            signed_at: new Date().toISOString(),
          })
          .eq("document_id", document.id)
          .eq("status", "sent");
        break;

      case "envelope-declined":
        documentStatus = "voided";
        activityAction = "declined";
        activityDetails = "Signature request declined";
        break;

      case "envelope-voided":
        documentStatus = "voided";
        activityAction = "voided";
        activityDetails = "Envelope voided";
        break;

      default:
        activityDetails = `DocuSign event: ${event}`;
    }

    await supabase
      .from("documents")
      .update({
        status: documentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    await supabase.from("document_activity").insert({
      document_id: document.id,
      user_id: null,
      action: activityAction,
      details: activityDetails,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error processing DocuSign webhook:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process webhook",
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