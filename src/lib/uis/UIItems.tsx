import React from "react";
import { UIButtons } from "./UIButtons";
import { UILabels } from "./UILabels";
import { UITextInputs } from "./UITextInputs";
import { TouchController } from "./TouchController";
import { NinjaLoader } from "./NinjaLoader";

export const UIItems = () => {
  return (
    <div style={{ position: "absolute", zIndex: 10 }}>
      <UIButtons />
      <UILabels />
      <UITextInputs />
      <TouchController />
      <NinjaLoader />
    </div>
  );
};
