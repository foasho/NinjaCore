import React from "react";
import { NJCFile, NinjaGL } from "./lib";
import { ExportNjcFile, initTpOMs, initTpConfig } from "./settings";

export const App = () => {
  const [ready, setReady] = React.useState(false);
  const [njcFile, setNJCFile] = React.useState<NJCFile | null>(null);
  React.useEffect(() => {
    const _njcFile = ExportNjcFile(initTpOMs(), [], [], [], initTpConfig());
    setNJCFile(_njcFile);
    setReady(true);
    return () => {
      setReady(false);
    };
  }, []);

  return (
    <div style={{ position: "absolute", height: "100dvh", width: "100dvw" }}>
      {ready && (
        <div id="Ninjaviewer" style={{ height: "100%" }}>
          {njcFile && <NinjaGL njc={njcFile}></NinjaGL>}
        </div>
      )}
    </div>
  );
};
