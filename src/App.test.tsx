import React from "react";
import { render } from "@testing-library/react";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { NinjaGL, ExportNjcFile, initTpOMs, initTpConfig } from "./lib";
import { TestR3F } from "./Sample";

test("Total NingaCanvasItems", async () => {
  const njcFile = ExportNjcFile(initTpOMs(), [], [], [], initTpConfig());
  const renderer = await ReactThreeTestRenderer.create(<TestR3F />);
  const mesh = renderer.scene.children[0];
  expect(mesh).toBeDefined();
});
