import { db } from "~/server/db";
import { posts, flags } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/dist/server/web/spec-extension/response";

// Delete Existing Flags and Brings Flag Count Down to 0
// Expects userId, postId
// Used when bringing a post back from flagged state
export async function POST(request: Request) {
  try {
    const data: unknown = await request.json();

    if (
      !(
        typeof data === "object" &&
        data !== null &&
        "userId" in data &&
        typeof data.userId === "string" &&
        "postId" in data &&
        typeof data.postId === "string"
      )
    ) {
      return new Response("Missing userId or postId", { status: 400 });
    }

    const { userId, postId } = data;

    // 1. Get the current post state
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.archived) {
      await db
        .update(posts)
        .set({
          archived: false,
        })
        .where(eq(posts.id, postId));
    } else {
      await db
        .update(posts)
        .set({
          flagCount: 0,
        })
        .where(eq(posts.id, postId));
    }

    if (userId) {
      await db
        .delete(flags)
        .where(
          and(
            eq(flags.postId, postId),
            eq(flags.userId, userId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in /api/removeFlag:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}