// ═══════════════════════════════════════════════════════════════
// DeedPlot AI Proxy — Cloudflare Worker (Anthropic Claude)
// ═══════════════════════════════════════════════════════════════
// This worker sits between your browser and the Anthropic API.
// It keeps your API key safe (never exposed to the client)
// and uses Claude's tool_use feature to guarantee structured
// JSON output matching DeedPlot's exact data format.
//
// Uses Claude Haiku 4.5 by default (~$0.001 per plot).
// Change to claude-sonnet-4-5-20241022 for harder descriptions.
//
// DEPLOY: See the setup guide for step-by-step instructions.
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a professional land surveyor's assistant that parses metes and bounds legal descriptions into structured, plottable data.

CRITICAL RULES:
1. Extract EVERY call from the legal description. A "call" is a bearing + distance segment.
2. Split the description into separate tracts/layers when you see markers like "EXCEPTING THEREFROM", "LESS AND EXCEPT", "Tract I/II", "PARCEL 1/2", "SECOND TRACT", etc.
3. For each call, return the quadrant bearing in standard surveying format:
   - quad: "N" or "S" (the starting cardinal direction)
   - dir: "E" or "W" (the ending cardinal direction)  
   - deg: integer degrees (0-90)
   - min: integer minutes (0-59)
   - sec: number seconds (0-59.99), round to 2 decimal places
   - dist: distance in FEET (convert chains, links, rods, varas, meters, yards to feet)
4. Handle "Due North/South/East/West" as:
   - Due North = quad:"N", deg:0, min:0, sec:0, dir:"E"
   - Due South = quad:"S", deg:0, min:0, sec:0, dir:"E"
   - Due East = quad:"N", deg:90, min:0, sec:0, dir:"E"
   - Due West = quad:"N", deg:90, min:0, sec:0, dir:"W"
5. Handle "Northerly", "along said line North", "with the same West" etc. as cardinal directions.
6. Convert ALL distance units to feet:
   - 1 chain = 66 feet
   - 1 link = 0.66 feet
   - 1 rod/pole/perch = 16.5 feet
   - 1 vara = 2.778 feet
   - 1 meter = 3.28084 feet
   - 1 yard = 3 feet
7. Handle fractions like "6.48 1/2" = 6.985 feet
8. If a "return to POB" or "to the place of beginning" call appears WITH a bearing and distance, include it as a normal call. If it appears WITHOUT bearing/distance, omit it (the plotter will auto-close).
9. For each tract, set isException to true if it's an exception/exclusion parcel.
10. Add warnings for any ambiguous, missing, or uncertain calls. Be specific about what's uncertain.
11. Do NOT invent or fabricate calls. If information is genuinely missing, add a warning instead.
12. "thence along the meander of the river" or similar monument-based calls WITHOUT bearing/distance should be flagged as warnings, not fabricated as calls.

IMPORTANT: You MUST use the submit_parsed_deed tool to return your results. Always call the tool.`;

// Claude uses tool_use for structured output
const TOOL_DEFINITION = {
  name: "submit_parsed_deed",
  description:
    "Submit the parsed metes and bounds calls extracted from the legal description. This MUST be called with the results.",
  input_schema: {
    type: "object",
    properties: {
      tracts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Tract/layer name derived from the description, or empty string if none",
            },
            isException: {
              type: "boolean",
              description: "True if this is an exception/exclusion parcel",
            },
            calls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  quad: {
                    type: "string",
                    enum: ["N", "S"],
                    description: "Starting cardinal direction",
                  },
                  deg: { type: "integer", description: "Degrees (0-90)" },
                  min: { type: "integer", description: "Minutes (0-59)" },
                  sec: { type: "number", description: "Seconds (0-59.99)" },
                  dir: {
                    type: "string",
                    enum: ["E", "W"],
                    description: "Ending cardinal direction",
                  },
                  dist: { type: "number", description: "Distance in feet" },
                },
                required: ["quad", "deg", "min", "sec", "dir", "dist"],
              },
            },
          },
          required: ["name", "isException", "calls"],
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description:
          "List of warnings about ambiguous, missing, or uncertain information",
      },
    },
    required: ["tracts", "warnings"],
  },
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only accept POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST required" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      const { text } = await request.json();

      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return new Response(
          JSON.stringify({
            error: "Legal description text is required (min 10 characters)",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      // Truncate extremely long inputs (safety)
      const input = text.trim().slice(0, 15000);

      // Call Anthropic Claude API with tool_use for structured output
      const claudeResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: [TOOL_DEFINITION],
            tool_choice: { type: "tool", name: "submit_parsed_deed" },
            messages: [
              {
                role: "user",
                content: `Parse this legal description into plottable metes and bounds calls:\n\n${input}`,
              },
            ],
          }),
        },
      );

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        console.error("Anthropic error:", claudeResponse.status, errText);
        return new Response(
          JSON.stringify({
            error: `Claude API error: ${claudeResponse.status}`,
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      const claudeData = await claudeResponse.json();

      // Extract the tool_use result from Claude's response
      const toolUse = claudeData.content?.find(
        (block) => block.type === "tool_use",
      );

      if (!toolUse || !toolUse.input) {
        return new Response(
          JSON.stringify({ error: "No structured response from Claude" }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      const parsed = toolUse.input;

      // Basic validation
      if (!parsed.tracts || !Array.isArray(parsed.tracts)) {
        return new Response(
          JSON.stringify({ error: "Invalid AI response structure" }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      // Validate and clamp each call to sane values
      for (const tract of parsed.tracts) {
        for (const call of tract.calls) {
          if (call.deg < 0 || call.deg > 90)
            call.deg = Math.min(90, Math.max(0, call.deg));
          if (call.min < 0 || call.min > 59)
            call.min = Math.min(59, Math.max(0, call.min));
          if (call.sec < 0 || call.sec > 59.99)
            call.sec = Math.min(59.99, Math.max(0, call.sec));
          if (call.dist <= 0) call.dist = 0.01;
        }
      }

      // Return the validated result
      return new Response(JSON.stringify(parsed), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error: " + err.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  },
};
