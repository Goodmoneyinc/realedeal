import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EnvelopeRequest {
  documentId: string;
  documentTitle: string;
  filePath: string;
  signers: Array<{
    email: string;
    name: string;
    order: number;
  }>;
}

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
          message: "Please configure DocuSign credentials in your environment settings",
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

    const { documentId, documentTitle, filePath, signers }: EnvelopeRequest = await req.json();

    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(filePath);

    if (fileError || !fileData) {
      throw new Error("Failed to download document");
    }

    const fileBytes = await fileData.arrayBuffer();
    const base64Document = btoa(String.fromCharCode(...new Uint8Array(fileBytes)));

    const envelopeDefinition = {
      emailSubject: `Please sign: ${documentTitle}`,
      documents: [
        {
          documentBase64: base64Document,
          name: documentTitle,
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: String(index + 1),
          routingOrder: String(signer.order),
          tabs: {
            signHereTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                xPosition: "100",
                yPosition: "150",
              },
            ],
            dateSignedTabs: [
              {
                documentId: "1",
                pageNumber: "1",
                xPosition: "100",
                yPosition: "200",
              },
            ],
          },
        })),
      },
      status: "sent",
    };

    const docusignResponse = await fetch(
      `${docusignBaseUrl}/v2.1/accounts/${docusignAccountId}/envelopes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${docusignAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(envelopeDefinition),
      }
    );

    if (!docusignResponse.ok) {
      const errorText = await docusignResponse.text();
      throw new Error(`DocuSign API error: ${errorText}`);
    }

    const envelope = await docusignResponse.json();

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "pending_signature",
        docusign_envelope_id: envelope.envelopeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      throw updateError;
    }

    const signatureInserts = signers.map((signer, index) => ({
      document_id: documentId,
      signer_email: signer.email,
      signer_name: signer.name,
      signing_order: signer.order,
      status: "sent",
      docusign_recipient_id: String(index + 1),
    }));

    const { error: signatureError } = await supabase
      .from("document_signatures")
      .insert(signatureInserts);

    if (signatureError) {
      throw signatureError;
    }

    await supabase.from("document_activity").insert({
      document_id: documentId,
      user_id: user.id,
      action: "signature_requested",
      details: `Sent for signature via DocuSign (Envelope: ${envelope.envelopeId})`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        envelopeId: envelope.envelopeId,
        status: envelope.status,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error creating DocuSign envelope:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create DocuSign envelope",
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