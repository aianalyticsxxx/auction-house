import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit/limiter";
import { handleApiError } from "@/lib/errors/handler";
import { settlementLogger } from "@/lib/logger";

// POST /api/settlements/cascade - Process expired settlements and cascade to next bidder
// This endpoint should be called by a cron job every 5 minutes
export async function POST(request: NextRequest) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "strict");

    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Call the database function to process cascades
    const { data, error } = await supabase.rpc("process_settlement_cascade");

    if (error) {
      settlementLogger.error({ err: error }, "Cascade processing error");
      return NextResponse.json(
        { error: "Failed to process cascades" },
        { status: 500 }
      );
    }

    const result = data?.[0] || { processed_count: 0, cascaded_count: 0, failed_count: 0 };

    return NextResponse.json({
      success: true,
      processed: result.processed_count,
      cascaded: result.cascaded_count,
      failed: result.failed_count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/settlements/cascade - Check for pending expired settlements (diagnostic)
export async function GET(request: NextRequest) {
  try {
    await rateLimit(getRateLimitIdentifier(request), "lenient");

    const supabase = createServerClient();

    const { data: expiredSettlements, error } = await supabase
      .from("settlements")
      .select(`
        *,
        auction:auctions(id, title, winning_bid),
        winner:users!winner_id(wallet_address, username)
      `)
      .eq("status", "pending")
      .lt("payment_deadline", new Date().toISOString())
      .order("payment_deadline", { ascending: true });

    if (error) {
      settlementLogger.error({ err: error }, "Error fetching expired settlements");
      return NextResponse.json(
        { error: "Failed to fetch expired settlements" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: expiredSettlements?.length || 0,
      settlements: expiredSettlements || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
