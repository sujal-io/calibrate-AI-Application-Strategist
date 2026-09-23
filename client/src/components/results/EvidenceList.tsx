import { useState, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Copy,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { rewriteBullet } from "../../services/calibration";
import { useToast } from "../../hooks/useToast";

type ResumeBullet = {
  bulletId: string;
  text: string;
  similarity: number;
};

type Props = {
  bullets: ResumeBullet[];
  structuredJobDescription: unknown;
};

type RewriteState = {
  loading: boolean;
  rewritten?: string;
  collapsed?: boolean;
  error?: string | null;
};

const COPY_CONFIRM_MS = 2000;

const EvidenceList = ({
  bullets,
  structuredJobDescription,
}: Props) => {
  const { getToken } = useAuth();
  const { show } = useToast();

  const [rewrites, setRewrites] = useState<
    Record<string, RewriteState>
  >({});

  const rewriteLoadingRef = useRef<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRewrite = async (
    bullet: ResumeBullet,
  ) => {
    if (rewriteLoadingRef.current[bullet.bulletId]) return;

    try {
      rewriteLoadingRef.current[bullet.bulletId] = true;
      setRewrites((prev) => ({
        ...prev,
        [bullet.bulletId]: {
          ...prev[bullet.bulletId],
          loading: true,
          error: null,
        },
      }));

      // A user can spend several minutes reading the report before rewriting
      // a bullet, so do not reuse Clerk's cached short-lived session token.
      const token = await getToken({ skipCache: true });

      if (!token) {
        const msg = "Please sign in to rewrite.";
        show({ message: msg, type: "warning" });
        setRewrites((prev) => ({
          ...prev,
          [bullet.bulletId]: {
            ...prev[bullet.bulletId],
            loading: false,
            error: msg,
          },
        }));
        return;
      }

      const response = await rewriteBullet(
        bullet.bulletId,
        structuredJobDescription,
        token,
      );

      setRewrites((prev) => ({
        ...prev,
        [bullet.bulletId]: {
          loading: false,
          rewritten: response.rewrittenBullet,
          collapsed: prev[bullet.bulletId]?.collapsed,
          error: null,
        },
      }));

      show({
        message: "Bullet rewritten successfully.",
        type: "success",
        duration: 1800,
      });
    } catch {
      const msg = "Couldn't rewrite this bullet. Please try again.";
      show({ message: msg, type: "error" });
      setRewrites((prev) => ({
        ...prev,
        [bullet.bulletId]: {
          ...prev[bullet.bulletId],
          loading: false,
          error: msg,
        },
      }));
    } finally {
      rewriteLoadingRef.current[bullet.bulletId] = false;
    }
  };

  const copyToClipboard = async (
    text: string,
    bulletId: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(bulletId);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === bulletId ? null : cur));
      }, COPY_CONFIRM_MS);
      show({ message: "Copied to clipboard!", type: "success", duration: 1500 });
    } catch {
      show({ message: "Unable to copy. Please copy manually.", type: "error" });
    }
  };

  const toggleCollapse = (bulletId: string) => {
    setRewrites((prev) => ({
      ...prev,
      [bulletId]: {
        ...prev[bulletId],
        collapsed: !prev[bulletId]?.collapsed,
      },
    }));
  };

  return (
    <section className="mt-12">
      <div className="surface-elevated rounded-[30px] p-6 sm:p-10">
        <p className="label">
          RETRIEVED EVIDENCE
        </p>

        <h2
          className="mt-3 text-3xl sm:text-4xl tracking-[-0.03em]"
          style={{
            fontFamily:
              '"DM Serif Display", serif',
          }}
        >
          Resume evidence used for calibration
        </h2>

        <p className="mt-4 max-w-3xl text-[16px] leading-8 text-[var(--text-secondary)]">
          These resume bullets were selected because
          they best matched the supplied job
          description.
        </p>

        {bullets.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-10 text-center">
            <p className="text-lg font-medium">No evidence found</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              We couldn't find matching resume evidence for this job description.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {bullets.map((bullet, index) => {
              const rewrite =
                rewrites[bullet.bulletId];
              const isCopied = copiedId === bullet.bulletId;

              return (
                <div
                  key={bullet.bulletId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="label">
                        Evidence #{index + 1}
                      </p>

                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Similarity Score
                      </p>
                    </div>

                    <div className="rounded-full border border-[var(--border)] px-4 py-2 font-medium shrink-0">
                      {(bullet.similarity * 100).toFixed(
                        0,
                      )}
                      %
                    </div>
                  </div>

                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${bullet.similarity * 100}%`,
                        background:
                          "var(--accent)",
                      }}
                    />
                  </div>

                  <div className="mt-8">
                    <p className="label">
                      ORIGINAL BULLET
                    </p>

                    <div className="mt-3 rounded-xl bg-white p-4">
                      <p className="leading-7 break-words">
                        {bullet.text}
                      </p>
                    </div>
                  </div>

                  {rewrite?.error && (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                    >
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--danger)]"
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-6 text-[var(--danger)]">
                        {rewrite.error}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleRewrite(bullet)
                      }
                      disabled={rewrite?.loading}
                      aria-disabled={rewrite?.loading}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                      style={{
                        background:
                          "var(--text)",
                      }}
                    >
                      {rewrite?.loading ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                          Rewriting...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} aria-hidden="true" />
                          Rewrite with AI
                        </>
                      )}
                    </button>
                  </div>
                  {rewrite?.rewritten && (
                    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles
                            size={18}
                            className="shrink-0"
                            style={{
                              color: "var(--accent)",
                            }}
                            aria-hidden="true"
                          />

                          <h3 className="text-lg font-semibold">
                            AI Rewrite
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCollapse(bullet.bulletId)}
                          aria-label={rewrite.collapsed ? "Expand rewritten text" : "Collapse rewritten text"}
                          aria-expanded={!rewrite.collapsed}
                          className="rounded-full p-2 transition hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          {rewrite.collapsed ? (
                            <ChevronDown size={18} aria-hidden="true" />
                          ) : (
                            <ChevronUp size={18} aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      {!rewrite.collapsed && (
                        <>
                          <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4">
                            <p className="leading-7 break-words">
                              {rewrite.rewritten}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  rewrite.rewritten!,
                                  bullet.bulletId,
                                )
                              }
                              aria-label="Copy rewritten bullet text to clipboard"
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 font-medium transition hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            >
                              {isCopied ? (
                                <>
                                  <CheckCircle2 size={18} className="text-[var(--success)]" aria-hidden="true" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={18} aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleRewrite(bullet)
                              }
                              disabled={rewrite.loading}
                              aria-disabled={rewrite.loading}
                              className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                              style={{
                                background:
                                  "var(--text)",
                              }}
                            >
                              {rewrite.loading ? (
                                <>
                                  <Loader2
                                    size={18}
                                    className="animate-spin"
                                    aria-hidden="true"
                                  />
                                  Regenerating...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={18} aria-hidden="true" />
                                  Regenerate
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default EvidenceList;
