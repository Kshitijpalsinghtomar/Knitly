import { useState } from "react"
import { useApp } from "../context/AppContext"
import { Ico } from "../components/ui/Icon"
import { Btn } from "../components/ui/Button"
import { st } from "../lib/utils"
import type { GeneratedRequirement } from "../types"

type Filter = "all" | "attention" | "unlinked" | "in-sync"

interface TraceabilityTab {
  key: Filter
  label: string
  count: number
  color?: string
}

const STATUS_DOT: Record<string, string> = {
  "in-sync": "var(--ok)",
  stale: "var(--warn)",
  contradicted: "var(--err)",
  unlinked: "var(--t3)",
}

const STATUS_LABEL: Record<string, string> = {
  "in-sync": "In sync",
  stale: "Stale",
  contradicted: "Contradicted",
  unlinked: "No source trace",
}

function ReqRow({
  req,
  onClick,
}: {
  req: GeneratedRequirement
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isAttention = req.status === "contradicted" || req.status === "stale"
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={st({
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        border: "none",
        borderBottom: "1px solid var(--bd)",
        cursor: "pointer",
        textAlign: "left",
        background: hovered ? "var(--sf)" : "transparent",
        fontFamily: "inherit",
        transition: "background 0.12s",
      })}
    >
      <div
        style={st({
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: STATUS_DOT[req.status] || "var(--t3)",
          flexShrink: 0,
        })}
      />
      <span
        className="mono"
        style={st({
          fontSize: 12,
          fontWeight: 700,
          color: "var(--t3)",
          flexShrink: 0,
          width: 62,
        })}
      >
        {req.id}
      </span>
      <span
        style={st({
          fontSize: 13,
          color: "var(--t1)",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        })}
      >
        {req.text}
      </span>
      {req.conflicts.length > 0 && (
        <span
          style={st({
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: isAttention ? "var(--err)" : "var(--t3)",
            flexShrink: 0,
          })}
        >
          <Ico n="warning" s={11} c="currentColor" /> {req.conflicts.length}
        </span>
      )}
      <span
        style={st({
          fontSize: 11,
          fontWeight: 600,
          color: STATUS_DOT[req.status] || "var(--t3)",
          flexShrink: 0,
          minWidth: 92,
          textAlign: "right",
        })}
      >
        {STATUS_LABEL[req.status] || req.status}
      </span>
      <span
        style={st({
          opacity: hovered ? 1 : 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          color: "var(--ac)",
          fontWeight: 600,
          flexShrink: 0,
          transition: "opacity 0.12s",
        })}
      >
        View <Ico n="arrow-r" s={12} c="var(--ac)" />
      </span>
    </button>
  )
}

export function TraceabilityView() {
  const { liveBRD, liveSource, setView, setActiveReqId, setGenOpen } = useApp()
  const [filter, setFilter] = useState<Filter>("all")
  const reqs = liveBRD?.requirements || []
  const attention = reqs.filter(
    (req) => req.status === "contradicted" || req.status === "stale",
  )
  const unlinked = reqs.filter((req) => req.status === "unlinked")
  const inSync = reqs.filter((req) => req.status === "in-sync")
  const shown =
    filter === "all"
      ? reqs
      : filter === "attention"
        ? attention
        : filter === "unlinked"
          ? unlinked
          : inSync

  const goToReq = (id: string) => {
    setActiveReqId(id)
    setView("requirement")
  }

  const tabs: TraceabilityTab[] = [
    { key: "all", label: "All", count: reqs.length },
    {
      key: "attention",
      label: "Needs attention",
      count: attention.length,
      color: "var(--err)",
    },
    { key: "unlinked", label: "No source trace", count: unlinked.length },
    {
      key: "in-sync",
      label: "In sync",
      count: inSync.length,
      color: "var(--ok)",
    },
  ]

  if (!liveBRD) {
    return (
      <div
        style={st({
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          padding: 32,
        })}
      >
        <div style={st({ maxWidth: 460, textAlign: "center" })}>
          <Ico n="shield" s={34} c="var(--bd2)" />
          <h1
            className="bri"
            style={st({
              fontSize: 30,
              fontWeight: 800,
              color: "var(--t1)",
              letterSpacing: "-0.05em",
              margin: "16px 0 8px",
            })}
          >
            No live trace yet
          </h1>
          <p
            style={st({
              color: "var(--t3)",
              fontSize: 13,
              lineHeight: 1.6,
              margin: "0 0 22px",
            })}
          >
            Generate a BRD from a transcript or a connected signal source. Trace
            will show every requirement’s source quote and conflict state here.
          </p>
          <Btn v="primary" onClick={() => setGenOpen(true)}>
            <Ico n="plus" s={14} c="#0F0F0E" /> Generate a BRD
          </Btn>
        </div>
      </div>
    )
  }

  return (
    <div
      style={st({
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg)",
      })}
    >
      <div style={st({ padding: "36px 52px 0", flexShrink: 0 })}>
        <div
          style={st({
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 6,
          })}
        >
          <div style={st({ minWidth: 0 })}>
            <div
              style={st({ fontSize: 11, color: "var(--t3)", marginBottom: 7 })}
            >
              {liveSource?.title || "Live generated source"}
            </div>
            <h1
              className="bri"
              style={st({
                fontSize: 38,
                fontWeight: 800,
                color: "var(--t1)",
                letterSpacing: "-0.05em",
                margin: 0,
                lineHeight: 1,
              })}
            >
              Traceability
            </h1>
            <p
              style={st({
                fontSize: 13,
                color: "var(--t2)",
                margin: "10px 0 0",
                maxWidth: 620,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              })}
            >
              {liveBRD.title} ·{" "}
              {liveBRD.summary ||
                "Every requirement is connected to its captured source evidence."}
            </p>
          </div>
          <div
            style={st({
              display: "flex",
              gap: 28,
              alignItems: "flex-end",
              flexShrink: 0,
            })}
          >
            <div style={st({ textAlign: "right" })}>
              <div
                className="bri"
                style={st({
                  fontSize: 34,
                  fontWeight: 800,
                  color: attention.length ? "var(--err)" : "var(--ok)",
                  letterSpacing: "-0.06em",
                  lineHeight: 1,
                })}
              >
                {attention.length}
              </div>
              <div
                style={st({ fontSize: 11, color: "var(--t3)", marginTop: 3 })}
              >
                need attention
              </div>
            </div>
            <div style={st({ textAlign: "right" })}>
              <div
                className="bri"
                style={st({
                  fontSize: 34,
                  fontWeight: 800,
                  color: "var(--t3)",
                  letterSpacing: "-0.06em",
                  lineHeight: 1,
                })}
              >
                {unlinked.length}
              </div>
              <div
                style={st({ fontSize: 11, color: "var(--t3)", marginTop: 3 })}
              >
                unlinked
              </div>
            </div>
            <div style={st({ textAlign: "right" })}>
              <div
                className="bri"
                style={st({
                  fontSize: 34,
                  fontWeight: 800,
                  color: "var(--ok)",
                  letterSpacing: "-0.06em",
                  lineHeight: 1,
                })}
              >
                {inSync.length}
              </div>
              <div
                style={st({ fontSize: 11, color: "var(--t3)", marginTop: 3 })}
              >
                in sync
              </div>
            </div>
          </div>
        </div>

        <div
          style={st({
            display: "flex",
            gap: 0,
            marginTop: 30,
            borderBottom: "1px solid var(--bd)",
            overflowX: "auto",
          })}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={st({
                padding: "8px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  filter === tab.key
                    ? "2px solid var(--t1)"
                    : "2px solid transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: filter === tab.key ? 700 : 500,
                color: filter === tab.key ? "var(--t1)" : "var(--t3)",
                transition: "color 0.12s, border-color 0.12s",
                marginBottom: -1,
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              })}
            >
              {tab.label}
              <span
                style={st({
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    filter === tab.key ? tab.color || "var(--t2)" : "var(--t3)",
                })}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        style={st({ flex: 1, overflowY: "auto", padding: "28px 52px 80px" })}
      >
        <div
          style={st({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 16,
          })}
        >
          <div>
            <div
              style={st({
                fontSize: 11,
                fontWeight: 700,
                color: "var(--t3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              })}
            >
              {filter === "all"
                ? "Requirement chain"
                : tabs.find((tab) => tab.key === filter)?.label}
            </div>
            <div style={st({ fontSize: 12, color: "var(--t3)", marginTop: 5 })}>
              Select an item to inspect its source quote and conflict evidence.
            </div>
          </div>
          <span
            className="mono"
            style={st({ fontSize: 11, color: "var(--t3)", flexShrink: 0 })}
          >
            {shown.length} of {reqs.length}
          </span>
        </div>
        <div style={st({ borderTop: "1px solid var(--bd)" })}>
          {shown.length > 0 ? (
            shown.map((req) => (
              <ReqRow key={req.id} req={req} onClick={() => goToReq(req.id)} />
            ))
          ) : (
            <div
              style={st({
                padding: "44px 20px",
                borderBottom: "1px solid var(--bd)",
                color: "var(--t3)",
                fontSize: 13,
                textAlign: "center",
              })}
            >
              Nothing in this state. That is a good sign.
            </div>
          )}
        </div>

        <div
          style={st({
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 28,
            padding: "14px 16px",
            border: "1px solid var(--bd)",
            borderRadius: 10,
            background: "var(--sf)",
          })}
        >
          <Ico n="github" s={15} c="var(--t3)" />
          <div
            style={st({ fontSize: 12, lineHeight: 1.55, color: "var(--t3)" })}
          >
            <strong style={st({ color: "var(--t2)" })}>
              Code verification is deliberately honest here.
            </strong>{" "}
            This live board currently proves source → requirement traceability.
            GitHub PR linking and contradiction checks are the next verification
            layer; no static PRs are shown as if they were live.
          </div>
        </div>
      </div>
    </div>
  )
}
