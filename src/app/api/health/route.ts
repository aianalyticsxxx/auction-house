import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { connection } from "@/lib/solana/connection";
import { Redis } from "@upstash/redis";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    redis: ServiceStatus;
    solana: ServiceStatus;
  };
}

interface ServiceStatus {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      return { status: "down", error: "Redis not configured" };
    }
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    await redis.ping();
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkSolana(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const slot = await connection.getSlot();
    if (typeof slot !== "number") throw new Error("Invalid slot response");
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [supabase, redis, solana] = await Promise.all([
    checkSupabase(),
    checkRedis(),
    checkSolana(),
  ]);

  const services = { supabase, redis, solana };
  const allUp = Object.values(services).every((s) => s.status === "up");
  const allDown = Object.values(services).every((s) => s.status === "down");

  const health: HealthStatus = {
    status: allUp ? "healthy" : allDown ? "unhealthy" : "degraded",
    timestamp: new Date().toISOString(),
    services,
  };

  const httpStatus = health.status === "healthy" ? 200 : 503;

  return NextResponse.json(health, { status: httpStatus });
}
