import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as THREE from "three";
import { getEvent } from "../events/event-service.js";
import {
  createScavengerHuntScene,
  huntObjects,
} from "./scavenger-hunt-game.js";

const storagePrefix = "hackmate-scavenger-hunt";
const eighthWallScriptPath = "/8thwall/xr.js";

export function ScavengerHuntPage() {
  const { eventId } = useParams();
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [event, setEvent] = useState(null);
  const [foundIds, setFoundIds] = useState(() => loadFoundIds(eventId));
  const [lastFound, setLastFound] = useState(null);
  const [status, setStatus] = useState("loading");
  const [arStatus, setArStatus] = useState("Starting camera preview.");
  const [message, setMessage] = useState("");

  const foundItems = useMemo(
    () => huntObjects.filter((item) => foundIds.includes(item.id)),
    [foundIds],
  );
  const nextItem = huntObjects.find((item) => !foundIds.includes(item.id));
  const progress = Math.round((foundIds.length / huntObjects.length) * 100);

  useEffect(() => {
    let isMounted = true;

    async function loadEvent() {
      const { data, error } = await getEvent(eventId);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
      } else {
        setEvent(data);
      }

      setStatus("idle");
    }

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;

    async function startGame() {
      const collect = (item, nextFoundIds) => {
        persistFoundIds(eventId, nextFoundIds);
        setFoundIds(nextFoundIds);
        setLastFound(item);
      };

      if (await canStartEighthWall()) {
        setArStatus("Launching 8th Wall world tracking.");

        const game = await startEighthWallScene({
          canvas,
          initialFoundIds: foundIds,
          onCollect: collect,
          onStatus: setArStatus,
        });

        if (cancelled) {
          game?.dispose?.();
          return;
        }

        gameRef.current = game;
        return;
      }

      setArStatus("Preview mode. Add the 8th Wall engine binary for live room tracking.");
      gameRef.current = createScavengerHuntScene({
        canvas,
        initialFoundIds: foundIds,
        onCollect: collect,
      });
    }

    startGame();

    return () => {
      cancelled = true;
      gameRef.current?.dispose?.();
      gameRef.current = null;
    };
  }, [eventId]);

  function resetHunt() {
    persistFoundIds(eventId, []);
    setFoundIds([]);
    setLastFound(null);
    window.location.reload();
  }

  if (status === "loading") {
    return (
      <section className="native-card compact-card">
        <p className="card-label">AR hunt</p>
        <p>Loading scavenger hunt.</p>
      </section>
    );
  }

  return (
    <div className="ar-hunt-shell">
      <section className="ar-stage" aria-label="AR scavenger hunt camera view">
        <canvas ref={canvasRef} className="ar-canvas" />
        <div className="ar-topbar">
          <Link className="ar-back" to={`/events/${eventId}`}>
            Back
          </Link>
          <div className="ar-score" aria-label="Hunt progress">
            {foundIds.length}/{huntObjects.length}
          </div>
        </div>
        <div className="ar-reticle" aria-hidden="true" />
        <div className="ar-bottom-panel">
          <p className="card-label">Scavenger hunt</p>
          <h1>{event?.name || "Room hunt"}</h1>
          <p>{arStatus}</p>
          {message ? <p className="auth-error">{message}</p> : null}
          <div className="ar-progress-bar" aria-label={`${progress}% complete`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          {nextItem ? (
            <div className="ar-clue-card">
              <strong>{nextItem.clue}</strong>
              <span>{nextItem.placement}</span>
            </div>
          ) : (
            <div className="ar-clue-card is-complete">
              <strong>All objects found.</strong>
              <span>Nice sweep. The room is clear.</span>
            </div>
          )}
          {lastFound ? (
            <p className="ar-found-toast" role="status">
              Found {lastFound.name}
            </p>
          ) : null}
        </div>
      </section>

      <section className="native-card ar-inventory">
        <div>
          <p className="card-label">Found objects</p>
          <h2>{foundItems.length ? "Your collection" : "Nothing collected yet"}</h2>
        </div>
        <div className="ar-object-grid">
          {huntObjects.map((item) => {
            const isFound = foundIds.includes(item.id);

            return (
              <article className={`ar-object-card${isFound ? " is-found" : ""}`} key={item.id}>
                <strong>{isFound ? item.name : "Hidden object"}</strong>
                <span>{isFound ? item.placement : item.clue}</span>
              </article>
            );
          })}
        </div>
        <button className="secondary-action" onClick={resetHunt} type="button">
          Reset hunt
        </button>
      </section>
    </div>
  );
}

async function canStartEighthWall() {
  if (typeof window === "undefined") return false;

  if (window.XR8?.Threejs) {
    await preloadWorldTracking();
    return true;
  }

  try {
    await loadEighthWallEngine();
    await preloadWorldTracking();
    return Boolean(window.XR8?.Threejs);
  } catch {
    return false;
  }
}

async function startEighthWallScene({
  canvas,
  initialFoundIds,
  onCollect,
  onStatus,
}) {
  const XR8 = window.XR8;
  const XRExtras = window.XRExtras;
  if (!XR8?.Threejs) return null;

  const huntModule = {
    name: "hackmate-scavenger-hunt",
    onStart: () => {
      const xrScene = XR8.Threejs.xrScene();
      let selectObject = null;
      const game = createScavengerHuntScene({
        canvas,
        initialFoundIds,
        onCollect,
        useExternalRenderer: true,
        onReady: ({ scene, interactive, collect }) => {
          xrScene.scene.add(...scene.children);
          selectObject = (event) => {
            const rect = canvas.getBoundingClientRect();
            const pointer = {
              x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
              y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
            };
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(pointer, xrScene.camera);
            const hit = raycaster.intersectObjects(interactive.filter((mesh) => mesh.visible), false)[0];
            if (hit) collect(hit.object);
          };
          canvas.addEventListener("pointerdown", selectObject);
        },
      });

      window.__hackmateHuntGame = {
        ...game,
        dispose: () => {
          if (selectObject) canvas.removeEventListener("pointerdown", selectObject);
          game.dispose();
        },
      };
      onStatus("Move your phone to scan the room, then tap glowing objects.");
    },
    onUpdate: ({ processCpuResult }) => {
      window.__hackmateHuntGame?.render?.(processCpuResult?.reality?.time || performance.now());
    },
  };

  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    XRExtras?.FullWindowCanvas?.pipelineModule?.(),
    XRExtras?.Loading?.pipelineModule?.(),
    XRExtras?.RuntimeError?.pipelineModule?.(),
    huntModule,
  ].filter(Boolean));

  XR8.run({ canvas });

  return {
    dispose: () => {
      window.__hackmateHuntGame?.dispose?.();
      window.__hackmateHuntGame = null;
      XR8.stop?.();
    },
  };
}

async function preloadWorldTracking() {
  if (!window.XR8?.loadChunk) return;

  await window.XR8.loadChunk("slam");
}

function loadEighthWallEngine() {
  const existing = document.querySelector("script[data-hackmate-8th-wall]");
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.XR8?.Threejs) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.hackmate8thWall = "true";
    script.dataset.preloadChunks = "slam";
    script.src = eighthWallScriptPath;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

function loadFoundIds(eventId) {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(`${storagePrefix}:${eventId}`);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function persistFoundIds(eventId, foundIds) {
  try {
    window.localStorage.setItem(`${storagePrefix}:${eventId}`, JSON.stringify(foundIds));
  } catch {
    // Local progress is nice-to-have; game play should continue when storage is blocked.
  }
}
