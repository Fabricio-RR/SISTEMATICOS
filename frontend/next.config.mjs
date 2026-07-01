import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from "next/constants.js";

export default function nextConfig(phase) {
  const distDir =
    phase === PHASE_DEVELOPMENT_SERVER
      ? ".next-dev"
      : phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER
        ? ".next-build"
        : ".next";

  return {
    distDir,
  };
}
