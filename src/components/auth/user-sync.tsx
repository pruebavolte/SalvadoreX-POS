"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Component that automatically syncs the logged-in user from Clerk to Supabase
 * This component should be included in protected layouts to ensure users are synced
 *
 * Features:
 * - Prevents multiple simultaneous sync calls
 * - Only syncs once per session if successful
 * - Handles errors gracefully without infinite loops
 * - Cleans up on unmount
 */
export function UserSync() {
  const { userId, isLoaded } = useAuth();

  // Track if sync is in progress to prevent duplicate calls
  const isSyncingRef = useRef(false);

  // Track if user has been successfully synced in this session
  const hasSyncedRef = useRef(false);

  // Track abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // State to track sync attempts (for retry logic)
  const [syncAttempts, setSyncAttempts] = useState(0);
  const maxSyncAttempts = 3;

  useEffect(() => {
    // Only attempt sync if:
    // 1. Auth is loaded
    // 2. User is authenticated
    // 3. Not currently syncing
    // 4. Haven't successfully synced yet
    // 5. Haven't exceeded max retry attempts
    if (
      isLoaded &&
      userId &&
      !isSyncingRef.current &&
      !hasSyncedRef.current &&
      syncAttempts < maxSyncAttempts
    ) {
      syncUser(userId);
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isLoaded, userId, syncAttempts]);

  const syncUser = async (currentUserId: string) => {
    // Prevent concurrent sync calls
    if (isSyncingRef.current) {
      console.log("[UserSync] Sync already in progress, skipping");
      return;
    }

    isSyncingRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      console.log(`[UserSync] Starting sync for user: ${currentUserId}`);

      const response = await fetch("/api/auth/sync-user", {
        method: "POST",
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[UserSync] Sync failed with status:", response.status, errorText);

        // Only retry on server errors (5xx), not on client errors (4xx)
        if (response.status >= 500) {
          setSyncAttempts(prev => prev + 1);
        } else {
          // Don't retry on client errors (unauthorized, bad request, etc.)
          console.error("[UserSync] Client error, will not retry");
          hasSyncedRef.current = true; // Mark as "synced" to prevent further attempts
        }
      } else {
        console.log("[UserSync] User synced successfully");
        hasSyncedRef.current = true;
        setSyncAttempts(0); // Reset attempts on success
      }
    } catch (error: any) {
      // Don't log or retry if the request was aborted (component unmounted)
      if (error.name === 'AbortError') {
        console.log("[UserSync] Sync aborted (component unmounted)");
        return;
      }

      console.error("[UserSync] Error syncing user:", error);

      // Retry on network errors
      setSyncAttempts(prev => prev + 1);
    } finally {
      isSyncingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // This component doesn't render anything
  return null;
}
